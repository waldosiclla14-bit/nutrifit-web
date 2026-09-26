import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaPromise, PurchaseStatus, DocumentType, ReceiptStatus, MovementType } from '@prisma/client';
import { rangeBound } from '../common/date-range';

@Injectable()
export class PurchasesService implements OnModuleInit {
  private readonly logger = new Logger(PurchasesService.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "purchase_counters" ("id" INTEGER PRIMARY KEY DEFAULT 1, "current" INTEGER NOT NULL DEFAULT 0)`;
      await this.prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "receipt_counters" ("id" INTEGER PRIMARY KEY DEFAULT 1, "current" INTEGER NOT NULL DEFAULT 0)`;
      this.logger.log('Purchase/receipt counter tables ensured');
    } catch {
      this.logger.warn('Could not ensure counter tables');
    }
  }

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) {
      if (!Object.values(PurchaseStatus).includes(query.status)) {
        throw new BadRequestException(`Estado inválido: ${query.status}`);
      }
      where.status = query.status;
    }
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = rangeBound(query.dateFrom, false);
      if (query.dateTo) where.createdAt.lte = rangeBound(query.dateTo, true);
    }
    if (query.search) {
      where.OR = [
        { purchaseNumber: { contains: query.search, mode: 'insensitive' } },
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { select: { id: true, productName: true, quantity: true, unitCost: true, totalCost: true, receivedQty: true } },
          _count: { select: { items: true, documents: true, receipts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, variantName: true, sku: true } },
          },
        },
        documents: true,
        receipts: {
          include: {
            items: {
              include: {
                purchaseItem: true,
                variant: { select: { id: true, variantName: true } },
              },
            },
          },
          orderBy: { receivedAt: 'desc' },
        },
        costHistory: true,
      },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    return purchase;
  }

  async create(data: {
    supplierId?: string;
    documentType?: DocumentType;
    documentNumber?: string;
    documentDate?: string;
    paymentMethod?: string;
    currency?: string;
    notes?: string;
    items: Array<{
      productId?: string;
      variantId?: string;
      productName: string;
      variantName?: string;
      sku?: string;
      barcode?: string;
      quantity: number;
      unitCost: number;
      discount?: number;
      tax?: number;
      notes?: string;
    }>;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto');
    }
    if (data.items.length > 500) {
      throw new BadRequestException('Máximo 500 ítems por compra');
    }
    // Idempotencia: doble-clic / reintento con la misma key devuelve la
    // compra existente en vez de duplicarla (la columna ya existía).
    const idempotencyKey = String((data as any)?.idempotencyKey || '').trim() || null;
    if (idempotencyKey) {
      const dupe = await this.prisma.purchase.findUnique({
        where: { idempotencyKey },
        include: { items: true, supplier: true },
      });
      if (dupe) return dupe;
    }
    data.items.forEach((item: any, idx: number) => this.validatePurchaseItem(item, idx));

    const purchaseNumber = await this.generatePurchaseNumber();

    // Redondeo a entero: las columnas son Int y un costo con decimales
    // (ej. 19.99) reventaba con 500. El CLP no usa decimales.
    const r = (n: number) => Math.round(Number(n) || 0);
    const subtotal = r(data.items.reduce((sum, i) => sum + i.quantity * i.unitCost - (i.discount || 0), 0));
    const tax = r(data.items.reduce((sum, i) => sum + (i.tax || 0), 0));
    const discount = r(data.items.reduce((sum, i) => sum + (i.discount || 0), 0));
    const total = subtotal + tax;

    const purchase = await this.prisma.purchase.create({
      data: {
        purchaseNumber,
        idempotencyKey,
        supplierId: data.supplierId || null,
        status: 'DRAFT',
        documentType: data.documentType || null,
        documentNumber: data.documentNumber || null,
        documentDate: data.documentDate ? new Date(data.documentDate) : null,
        paymentMethod: data.paymentMethod || null,
        currency: data.currency || 'CLP',
        subtotal,
        tax,
        discount,
        total,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId || null,
            variantId: item.variantId || null,
            productName: item.productName,
            variantName: item.variantName || null,
            sku: item.sku || null,
            barcode: item.barcode || null,
            quantity: item.quantity,
            unitCost: r(item.unitCost),
            discount: r(item.discount || 0),
            tax: r(item.tax || 0),
            totalCost: r(item.quantity * item.unitCost - (item.discount || 0) + (item.tax || 0)),
            receivedQty: 0,
            notes: item.notes || null,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    return purchase;
  }

  async update(id: string, data: {    supplierId?: string;
    documentType?: DocumentType;
    documentNumber?: string;
    documentDate?: string;
    paymentMethod?: string;
    notes?: string;
    items?: Array<{
      id?: string;
      productId?: string;
      variantId?: string;
      productName: string;
      variantName?: string;
      sku?: string;
      barcode?: string;
      quantity: number;
      unitCost: number;
      discount?: number;
      tax?: number;
      notes?: string;
    }>;
  }) {
    const existing = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Compra no encontrada');
    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden editar compras en borrador o pendiente de revision');
    }
    if (data.items) {
      if (data.items.length === 0 || data.items.length > 500) {
        throw new BadRequestException('La compra debe contener entre 1 y 500 ítems');
      }
      data.items.forEach((item: any, idx: number) => this.validatePurchaseItem(item, idx));
    }

    const r2 = (n: number) => Math.round(Number(n) || 0);
    const subtotal = data.items
      ? r2(data.items.reduce((sum, i) => sum + i.quantity * i.unitCost - (i.discount || 0), 0))
      : existing.subtotal;
    const tax = data.items
      ? r2(data.items.reduce((sum, i) => sum + (i.tax || 0), 0))
      : existing.tax;
    const discount = data.items
      ? r2(data.items.reduce((sum, i) => sum + (i.discount || 0), 0))
      : existing.discount;
    const total = subtotal + tax;

    // UN SOLO write con nested deleteMany+create: atómico y compatible con
    // pgbouncer transaction-mode (las tx interactivas P2028 aquí).
    return this.prisma.purchase.update({
      where: { id },
      data: {
        supplierId: data.supplierId !== undefined ? data.supplierId : undefined,
        documentType: data.documentType !== undefined ? data.documentType : undefined,
        documentNumber: data.documentNumber !== undefined ? data.documentNumber : undefined,
        documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
        paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        subtotal,
        tax,
        discount,
        total,
        status: 'PENDING_REVIEW',
        items: data.items
          ? {
              deleteMany: { purchaseId: id },
              create: data.items.map((item) => ({
                productId: item.productId || null,
                variantId: item.variantId || null,
                productName: item.productName,
                variantName: item.variantName || null,
                sku: item.sku || null,
                barcode: item.barcode || null,
                quantity: item.quantity,
                unitCost: r2(item.unitCost),
                discount: r2(item.discount || 0),
                tax: r2(item.tax || 0),
                totalCost: r2(item.quantity * item.unitCost - (item.discount || 0) + (item.tax || 0)),
                receivedQty: 0,
                notes: item.notes || null,
              })),
            }
          : undefined,
      },
      include: { items: true, supplier: true },
    });
  }

  async confirm(id: string, userId?: string) {
    const existing = await this.prisma.purchase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compra no encontrada');
    if (existing.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden confirmar compras pendientes de revision');
    }

    // Guard atómico: si otra operación (anular/confirmar) cambió el estado
    // entre el check y el write, no hay match → P2025 → error amable.
    try {
      return await this.prisma.purchase.update({
        where: { id, status: 'PENDING_REVIEW' },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedById: userId || null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        const cur = await this.prisma.purchase
          .findUnique({ where: { id }, select: { status: true } })
          .catch(() => null);
        if (!cur) throw new NotFoundException('Compra no encontrada');
        if (cur.status === 'CONFIRMED') {
          throw new BadRequestException('La compra ya fue confirmada por otra operación');
        }
        throw new BadRequestException(`La compra ya no está pendiente de revisión (estado: ${cur.status})`);
      }
      throw e;
    }
  }

  async cancel(id: string) {
    const existing = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Compra no encontrada');
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('La compra ya esta cancelada');
    }
    // Anular con mercadería recibida dejaría stock fantasma (no hay reversa):
    // esas compras no se anulan, se ajustan por inventario.
    if (existing.status === 'RECEIVED' || existing.items.some((i) => (i.receivedQty || 0) > 0)) {
      throw new BadRequestException('No se puede anular: ya tiene mercadería recibida en stock');
    }

    return this.prisma.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async addDocument(id: string, data: {
    documentType: string;
    fileName: string;
    originalName?: string;
    mimeType: string;
    fileSize: number;
    base64Data: string;
    ocrRawData?: any;
    ocrConfidence?: number;
  }) {
    const existing = await this.prisma.purchase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compra no encontrada');

    return this.prisma.purchaseDocument.create({
      data: {
        purchaseId: id,
        documentType: data.documentType,
        fileName: data.fileName,
        originalName: data.originalName || data.fileName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        storagePath: data.base64Data,
        ocrProcessed: !!data.ocrRawData,
        ocrRawData: data.ocrRawData || null,
        ocrConfidence: data.ocrConfidence || null,
      },
    });
  }

  async getDocuments(id: string) {
    return this.prisma.purchaseDocument.findMany({
      where: { purchaseId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        ocrProcessed: true,
        ocrConfidence: true,
        createdAt: true,
      },
    });
  }

  async getDocumentData(id: string, documentId: string) {
    const doc = await this.prisma.purchaseDocument.findFirst({
      where: { id: documentId, purchaseId: id },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return { storagePath: doc.storagePath, ocrRawData: doc.ocrRawData };
  }

  async createReceipt(id: string, data: {
    notes?: string;
    items: Array<{
      purchaseItemId: string;
      variantId?: string;
      receivedQty: number;
      damagedQty?: number;
      notes?: string;
    }>;
  }, userId?: string) {
    const existing = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Compra no encontrada');
    if (existing.status !== 'CONFIRMED' && existing.status !== 'RECEIVING') {
      throw new BadRequestException('La compra debe estar confirmada para recibir');
    }

    // Validación estricta: sin esto, cantidades negativas/fraccionarias o
    // ítems ajenos corrompían stock y receivedQty sin aviso.
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un ítem recibido');
    }
    const seenItems = new Set<string>();
    data.items.forEach((item: any, idx: number) => {
      const n = idx + 1;
      const pi = existing.items.find((p) => p.id === item?.purchaseItemId);
      if (!pi) throw new BadRequestException(`Ítem ${n}: no pertenece a esta compra`);
      if (seenItems.has(item.purchaseItemId)) {
        throw new BadRequestException(`Ítem ${n}: duplicado en la recepción`);
      }
      seenItems.add(item.purchaseItemId);
      const rq = Number(item.receivedQty);
      const dq = Number(item.damagedQty ?? 0);
      if (!Number.isInteger(rq) || rq < 0 || !Number.isInteger(dq) || dq < 0) {
        throw new BadRequestException(`Ítem ${n}: cantidades inválidas`);
      }
      if (rq === 0 && dq === 0) throw new BadRequestException(`Ítem ${n}: nada que recibir`);
      if (dq > rq) throw new BadRequestException(`Ítem ${n}: dañados no puede superar recibidos`);
      if (pi.receivedQty + rq > pi.quantity) {
        throw new BadRequestException(`Ítem ${n}: supera lo comprado (${pi.quantity})`);
      }
    });

    const receiptNumber = await this.generateReceiptNumber();
    const receiptId = randomUUID();

    // Pre-lectura de variantes: todo se calcula en JS y los writes van en UNA
    // transacción NO interactiva (array), compatible con pgbouncer.
    // Las tx interactivas ($transaction async) P2028 aquí → 500 en recepción.
    const lines = data.items.map((item: any) => {
      const pi: any = existing.items.find((p) => p.id === item.purchaseItemId);
      return {
        pi,
        variantId: (item.variantId || pi.variantId || null) as string | null,
        receivedQty: item.receivedQty as number,
        damagedQty: (item.damagedQty ?? 0) as number,
        notes: item.notes || null,
      };
    });
    const variantIds = [...new Set(lines.map((l) => l.variantId).filter(Boolean))] as string[];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, physicalStock: true, costPrice: true },
        })
      : [];
    const vMap = new Map(variants.map((v: any) => [v.id, v]));

    const writes: PrismaPromise<any>[] = [];

    writes.push(
      this.prisma.goodsReceipt.create({
        data: {
          id: receiptId,
          purchaseId: id,
          receiptNumber,
          status: 'PENDING',
          notes: data.notes || null,
          receivedById: userId || null,
          items: {
            create: lines.map((l) => ({
              purchaseItemId: l.pi.id,
              variantId: l.variantId,
              expectedQty: l.pi.quantity,
              receivedQty: l.receivedQty,
              damagedQty: l.damagedQty,
              notes: l.notes,
            })),
          },
        },
        include: { items: true },
      }),
    );

    for (const l of lines) {
      writes.push(
        this.prisma.purchaseItem.update({
          where: { id: l.pi.id },
          data: { receivedQty: l.pi.receivedQty + l.receivedQty },
        }),
      );

      if (l.variantId) {
        const v: any = vMap.get(l.variantId);
        const previousStock = v?.physicalStock ?? 0;
        const newStock = Math.max(0, previousStock + l.receivedQty - l.damagedQty);
        writes.push(
          this.prisma.productVariant.update({
            where: { id: l.variantId },
            data: { physicalStock: newStock },
          }),
        );
        writes.push(
          this.prisma.inventoryMovement.create({
            data: {
              variantId: l.variantId,
              type: 'PURCHASE_RECEIPT',
              quantity: l.receivedQty - l.damagedQty,
              previousStock,
              newStock,
              purchaseId: id,
              receiptId,
              userId: userId || null,
              unitCost: l.pi.unitCost,
              notes: `Recepcion compra ${existing.purchaseNumber}`,
            },
          }),
        );

        // Costo promedio ponderado (misma fórmula que updateCostHistory)
        const previousCost = v?.costPrice || 0;
        const totalNewCost = l.receivedQty * l.pi.unitCost;
        const totalOldCost = previousStock * previousCost;
        const newAverageCost =
          previousStock + l.receivedQty > 0
            ? Math.round((totalOldCost + totalNewCost) / (previousStock + l.receivedQty))
            : l.pi.unitCost;
        writes.push(
          this.prisma.productCostHistory.create({
            data: {
              productId: l.pi.productId,
              variantId: l.variantId,
              purchaseId: id,
              quantity: l.receivedQty,
              unitCost: l.pi.unitCost,
              totalCost: totalNewCost,
              previousCost,
              newAverageCost,
              purchaseDate: new Date(),
            },
          }),
        );
        writes.push(
          this.prisma.productVariant.update({
            where: { id: l.variantId },
            data: { costPrice: newAverageCost },
          }),
        );
      }
    }

    const allItemsReceived = existing.items.every(
      (pi) => pi.receivedQty + (data.items.find((i) => i.purchaseItemId === pi.id)?.receivedQty || 0) >= pi.quantity,
    );
    const anyReceived = existing.items.some(
      (pi) => pi.receivedQty + (data.items.find((i) => i.purchaseItemId === pi.id)?.receivedQty || 0) > 0,
    );

    const receiptStatus = allItemsReceived ? 'COMPLETED' : anyReceived ? 'PARTIAL' : 'PENDING';
    const purchaseStatus = allItemsReceived ? 'RECEIVED' : 'RECEIVING';

    writes.push(
      this.prisma.goodsReceipt.update({
        where: { id: receiptId },
        data: { status: receiptStatus as any },
      }),
    );

    writes.push(
      this.prisma.purchase.update({
        where: { id },
        data: {
          status: purchaseStatus as any,
          receiptStatus: receiptStatus as any,
          receivedAt: anyReceived ? new Date() : existing.receivedAt,
        },
      }),
    );

    const results = await this.prisma.$transaction(writes);
    return results[0];
  }

  async getCostHistory(productId?: string, variantId?: string) {
    const where: any = {};
    if (productId) where.productId = productId;
    if (variantId) where.variantId = variantId;

    return this.prisma.productCostHistory.findMany({
      where,
      include: {
        purchase: { select: { id: true, purchaseNumber: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 50,
    });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true, rut: true },
      orderBy: { name: 'asc' },
    });
  }

  async checkDuplicate(supplierId: string, documentNumber: string, total: number) {
    const existing = await this.prisma.purchase.findFirst({
      where: {
        supplierId,
        documentNumber,
        total,
        status: { not: 'CANCELLED' },
      },
      select: { id: true, purchaseNumber: true, createdAt: true, total: true },
    });
    return existing || null;
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalThisMonth, countThisMonth, pendingReceipt, suppliersCount] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      this.prisma.purchase.count({
        where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.purchase.count({
        where: { receiptStatus: { in: ['PENDING', 'PARTIAL'] }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.supplier.count({ where: { isActive: true } }),
    ]);

    return {
      totalThisMonth: totalThisMonth._sum.total || 0,
      countThisMonth,
      pendingReceipt,
      suppliersCount,
    };
  }

  private validatePurchaseItem(item: any, idx: number) {
    if (!item || typeof item.productName !== 'string' || !item.productName.trim()) {
      throw new BadRequestException(`Ítem ${idx + 1}: nombre de producto requerido`);
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100000) {
      throw new BadRequestException(`Ítem ${idx + 1}: cantidad inválida`);
    }
    for (const [field, val] of [['unitCost', item.unitCost], ['discount', item.discount ?? 0], ['tax', item.tax ?? 0]] as const) {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0 || n > 100000000) {
        throw new BadRequestException(`Ítem ${idx + 1}: ${field} inválido`);
      }
    }
  }

  private async generatePurchaseNumber(): Promise<string> {
    await this.prisma.$executeRaw`INSERT INTO "purchase_counters" ("id", "current") VALUES (1, 0) ON CONFLICT DO NOTHING`;
    const rows = await this.prisma.$queryRaw<{ next: number }[]>`
      UPDATE "purchase_counters" SET "current" = "current" + 1 WHERE "id" = 1 RETURNING "current" AS "next"
    `;
    return `COMP-${String(rows[0].next).padStart(6, '0')}`;
  }

  private async generateReceiptNumber(): Promise<string> {
    await this.prisma.$executeRaw`INSERT INTO "receipt_counters" ("id", "current") VALUES (1, 0) ON CONFLICT DO NOTHING`;
    const rows = await this.prisma.$queryRaw<{ next: number }[]>`
      UPDATE "receipt_counters" SET "current" = "current" + 1 WHERE "id" = 1 RETURNING "current" AS "next"
    `;
    return `REC-${String(rows[0].next).padStart(6, '0')}`;
  }

  private async updateCostHistory(tx: any, productId: string | null, variantId: string | null, purchaseId: string, quantity: number, unitCost: number, previousStock: number) {
    const previousCost = variantId
      ? (await tx.productVariant.findUnique({ where: { id: variantId } }))?.costPrice || 0
      : 0;
    const totalNewCost = quantity * unitCost;
    const totalOldCost = previousStock * previousCost;
    const newAverageCost = previousStock + quantity > 0
      ? Math.round((totalOldCost + totalNewCost) / (previousStock + quantity))
      : unitCost;

    await tx.productCostHistory.create({
      data: {
        productId: productId || undefined,
        variantId: variantId || undefined,
        purchaseId,
        quantity,
        unitCost,
        totalCost: totalNewCost,
        previousCost,
        newAverageCost,
        purchaseDate: new Date(),
      },
    });

    if (variantId) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { costPrice: newAverageCost },
      });
    }
  }

  async processOCR(id: string, ocrService: any) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    if (!purchase.documents || purchase.documents.length === 0) {
      return { error: 'No hay documentos adjuntos' };
    }

    const lastDoc = purchase.documents[purchase.documents.length - 1];
    const docData = await this.getDocumentData(id, lastDoc.id);

    const result = await ocrService.processDocument({
      base64Data: docData.storagePath,
      mimeType: lastDoc.mimeType,
      fileName: lastDoc.fileName,
    });

    if (!result) return { error: 'OCR no pudo procesar el documento', fallback: true };

    const confidence = this.avgConfidence(result);

    await this.prisma.purchaseDocument.update({
      where: { id: lastDoc.id },
      data: {
        ocrProcessed: true,
        ocrRawData: result as any,
        ocrConfidence: confidence,
      },
    });

    await this.prisma.purchase.update({
      where: { id },
      data: {
        ocrRawData: result as any,
        ocrConfidence: confidence,
      },
    });

    return { ocr: result, confidence };
  }

  async getAlerts() {
    const alerts: Array<{ type: string; severity: string; message: string; purchaseId?: string }> = [];

    const pendingReview = await this.prisma.purchase.findMany({
      where: { status: 'PENDING_REVIEW' },
      select: { id: true, purchaseNumber: true, createdAt: true },
    });
    for (const p of pendingReview) {
      alerts.push({
        type: 'PENDING_REVIEW',
        severity: 'info',
        message: `${p.purchaseNumber} pendiente de revision`,
        purchaseId: p.id,
      });
    }

    const partialReceipt = await this.prisma.purchase.findMany({
      where: { receiptStatus: 'PARTIAL', status: { not: 'CANCELLED' } },
      select: { id: true, purchaseNumber: true },
    });
    for (const p of partialReceipt) {
      alerts.push({
        type: 'PARTIAL_RECEIPT',
        severity: 'warning',
        message: `${p.purchaseNumber} recepcion parcial`,
        purchaseId: p.id,
      });
    }

    const lowConfidence = await this.prisma.purchaseDocument.findMany({
      where: { ocrConfidence: { lt: 0.7 }, ocrProcessed: true },
      include: { purchase: { select: { id: true, purchaseNumber: true } } },
      take: 10,
    });
    for (const doc of lowConfidence) {
      const purchaseNum = (doc as any).purchase?.purchaseNumber || 'N/A';
      alerts.push({
        type: 'LOW_OCR_CONFIDENCE',
        severity: 'warning',
        message: `${purchaseNum} - documento con baja confianza OCR (${Math.round((doc.ocrConfidence || 0) * 100)}%)`,
        purchaseId: (doc as any).purchase?.id,
      });
    }

    const costVariants = await this.prisma.productCostHistory.groupBy({
      by: ['variantId'],
      _avg: { unitCost: true },
      _count: true,
      where: { variantId: { not: null } },
      having: { unitCost: { _avg: { gt: 0 } } },
    });

    for (const cv of costVariants) {
      if (!cv.variantId) continue;
      const lastTwo = await this.prisma.productCostHistory.findMany({
        where: { variantId: cv.variantId },
        orderBy: { purchaseDate: 'desc' },
        take: 2,
      });
      if (lastTwo.length === 2) {
        const prev = lastTwo[1].unitCost;
        const curr = lastTwo[0].unitCost;
        if (prev > 0) {
          const change = ((curr - prev) / prev) * 100;
          if (Math.abs(change) > 50) {
            const variant = await this.prisma.productVariant.findUnique({
              where: { id: cv.variantId },
              select: { variantName: true },
            });
            alerts.push({
              type: 'COST_SPIKE',
              severity: 'critical',
              message: `${variant?.variantName || cv.variantId}: costo varió ${change > 0 ? '+' : ''}${Math.round(change)}% ($${prev.toLocaleString()} → $${curr.toLocaleString()})`,
            });
          }
        }
      }
    }

    return alerts;
  }

  async matchProducts(ocrProducts: Array<{ name: string; barcode?: string; sku?: string }>) {
    const results: Array<{
      ocrName: string;
      matches: Array<{ productId: string; variantId: string; productName: string; variantName: string; sku: string; confidence: number }>;
    }> = [];

    for (const ocrProduct of ocrProducts) {
      const matches: Array<{ productId: string; variantId: string; productName: string; variantName: string; sku: string; confidence: number }> = [];

      if (ocrProduct.barcode) {
        const byBarcode = await this.prisma.productVariant.findFirst({
          where: { barcode: ocrProduct.barcode },
          include: { product: { select: { name: true } } },
        });
        if (byBarcode) {
          matches.push({
            productId: byBarcode.productId,
            variantId: byBarcode.id,
            productName: byBarcode.product.name,
            variantName: byBarcode.variantName,
            sku: byBarcode.sku,
            confidence: 1.0,
          });
        }
      }

      if (matches.length === 0 && ocrProduct.sku) {
        const bySku = await this.prisma.productVariant.findFirst({
          where: { sku: ocrProduct.sku },
          include: { product: { select: { name: true } } },
        });
        if (bySku) {
          matches.push({
            productId: bySku.productId,
            variantId: bySku.id,
            productName: bySku.product.name,
            variantName: bySku.variantName,
            sku: bySku.sku,
            confidence: 0.95,
          });
        }
      }

      if (matches.length === 0) {
        const normalizedName = ocrProduct.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const keywords = normalizedName.split(/\s+/).filter((w) => w.length > 2);

        if (keywords.length > 0) {
          const variants = await this.prisma.productVariant.findMany({
            where: {
              isActive: true,
              OR: keywords.map((kw) => ({
                product: { name: { contains: kw, mode: 'insensitive' } },
              })),
            },
            include: { product: { select: { name: true } } },
            take: 5,
          });

          for (const v of variants) {
            const dbName = v.product.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const dbWords = dbName.split(/\s+/);
            const matchingWords = keywords.filter((kw) => dbWords.some((dw) => dw.includes(kw) || kw.includes(dw)));
            const confidence = matchingWords.length / Math.max(keywords.length, dbWords.length);

            if (confidence >= 0.3) {
              matches.push({
                productId: v.productId,
                variantId: v.id,
                productName: v.product.name,
                variantName: v.variantName,
                sku: v.sku,
                confidence: Math.round(confidence * 100) / 100,
              });
            }
          }

          matches.sort((a, b) => b.confidence - a.confidence);
        }
      }

      results.push({ ocrName: ocrProduct.name, matches: matches.slice(0, 3) });
    }

    return results;
  }

  async getReports(query: any = {}) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const where: any = { status: { not: 'CANCELLED' } };
    if (query.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(query.dateFrom) };
    if (query.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(query.dateTo) };
    if (!query.dateFrom && !query.dateTo) where.createdAt = { gte: startOfMonth };

    const [bySupplier, byProduct, monthlyTrend] = await Promise.all([
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { ...where, supplierId: { not: null } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.purchaseItem.groupBy({
        by: ['productId'],
        where: { purchase: { ...where } },
        _sum: { totalCost: true, quantity: true },
        _count: true,
      }),
      this.prisma.$queryRaw`
        SELECT DATE_TRUNC('month', "createdAt") as month,
               SUM("total") as total,
               COUNT(*) as count
        FROM "purchases"
        WHERE "status" != 'CANCELLED'
          AND "createdAt" >= ${startOfYear}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
    ]);

    const supplierIds = bySupplier.map((s) => s.supplierId).filter(Boolean);
    const suppliers = supplierIds.length > 0
      ? await this.prisma.supplier.findMany({ where: { id: { in: supplierIds as string[] } }, select: { id: true, name: true } })
      : [];
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

    const productIds = byProduct.map((p) => p.productId).filter(Boolean);
    const products = productIds.length > 0
      ? await this.prisma.product.findMany({ where: { id: { in: productIds as string[] } }, select: { id: true, name: true } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return {
      bySupplier: bySupplier.map((s) => ({
        supplierId: s.supplierId,
        supplierName: supplierMap.get(s.supplierId || '') || 'Sin proveedor',
        total: s._sum.total || 0,
        count: s._count,
      })).sort((a, b) => b.total - a.total),
      byProduct: byProduct.map((p) => ({
        productId: p.productId,
        productName: productMap.get(p.productId || '') || 'N/A',
        totalCost: p._sum.totalCost || 0,
        quantity: p._sum.quantity || 0,
        count: p._count,
      })).sort((a, b) => b.totalCost - a.totalCost).slice(0, 20),
      monthlyTrend: (monthlyTrend as any[]).map((m) => ({
        month: m.month?.toISOString?.()?.slice(0, 7) || m.month,
        total: Number(m.total),
        count: Number(m.count),
      })),
    };
  }

  private avgConfidence(result: any): number {
    const fields = [result.supplier, result.documentType, result.documentNumber, result.documentDate, result.subtotal, result.tax, result.total];
    const confidences = fields.filter((f) => f?.confidence > 0).map((f) => f.confidence);
    const productConfidences = (result.products || []).flatMap((p: any) => [p.name?.confidence, p.quantity?.confidence, p.unitPrice?.confidence].filter((c: any) => c > 0));
    const all = [...confidences, ...productConfidences];
    return all.length > 0 ? all.reduce((a: number, b: number) => a + b, 0) / all.length : 0;
  }
}
