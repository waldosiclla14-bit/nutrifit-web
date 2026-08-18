import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateReviewBody = {
  productSlug: string;
  name: string;
  rating: number;
  text: string;
  verified?: boolean;
};

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByProductSlug(productSlug: string) {
    if (!productSlug) throw new BadRequestException('productSlug es obligatorio');

    return this.prisma.review.findMany({
      where: { productSlug },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(body: CreateReviewBody) {
    const productSlug = body.productSlug?.trim();
    if (!productSlug) throw new BadRequestException('productSlug es obligatorio');

    const name = body.name?.trim();
    if (!name || name.length < 2) throw new BadRequestException('Nombre inválido');

    const text = body.text?.trim();
    if (!text || text.length < 5) throw new BadRequestException('La reseña debe tener al menos 5 caracteres');

    const rating = Math.round(Number(body.rating) || 0);
    if (rating < 1 || rating > 5) throw new BadRequestException('El rating debe ser entre 1 y 5');

    return this.prisma.review.create({
      data: {
        productSlug,
        name,
        rating,
        text,
        verified: !!body.verified,
      },
    });
  }
}
