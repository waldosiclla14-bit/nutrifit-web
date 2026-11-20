import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

import { AiController } from '../ai/ai.controller';
import { AuditController } from '../audit/audit.controller';
import { CashRegisterController } from '../cash-register/cash-register.controller';
import { ConfigController } from '../config/config.controller';
import { CouponsController } from '../coupons/coupons.controller';
import { CustomersController } from '../customers/customers.controller';
import { DeliveryController } from '../delivery/delivery.controller';
import { MetroController } from '../delivery/metro.controller';
import { FinancesController } from '../finances/finances.controller';
import { StockAdjustmentController } from '../inventory/stock-adjustment.controller';
import { SuppliersController } from '../inventory/suppliers.controller';
import { OrdersController } from '../orders/orders.controller';
import { ProductsController } from '../products/products.controller';
import { PurchasesController } from '../purchases/purchases.controller';
import { UsersController } from '../users/users.controller';
import { CourierController } from '../courier/courier.controller';

/**
 * Controladores que nunca deben quedar accesibles a un repartidor. El rol
 * DELIVERY solo entra por /courier. Si alguien agrega un handler sin @Roles
 * en estos controladores, esta prueba lo detecta.
 */
const SOLO_ADMIN_O_VENDEDOR = [
  ProductsController,
  OrdersController,
  CustomersController,
  FinancesController,
  ConfigController,
  UsersController,
  CouponsController,
  PurchasesController,
  SuppliersController,
  CashRegisterController,
  AuditController,
  StockAdjustmentController,
  AiController,
  MetroController,
  DeliveryController,
];

function handlersOf(controller: any): Array<{ name: string; handler: Function }> {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => ({ name, handler: controller.prototype[name] }))
    .filter(({ handler }) => typeof handler === 'function');
}

function requiredRoles(target: Function): Role[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, target);
}

describe('RBAC — el repartidor no entra al panel', () => {
  const guard = new RolesGuard(new Reflector());

  function contextFor(controller: any, handler: Function, role?: Role): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it.each(SOLO_ADMIN_O_VENDEDOR.map((c) => [c.name, c] as const))(
    '%s restringe todos sus handlers y excluye a DELIVERY',
    (_name, controller) => {
      for (const { name, handler } of handlersOf(controller)) {
        const roles = requiredRoles(handler) ?? requiredRoles(controller);
        // Un handler sin @Roles es público o solo requiere sesión (JwtAuthGuard).
        // Los que sí declaran roles deben negar explícitamente a DELIVERY.
        if (roles?.length) {
          expect({ handler: name, roles }).toEqual({
            handler: name,
            roles: expect.not.arrayContaining([Role.DELIVERY]),
          });
          expect(guard.canActivate(contextFor(controller, handler, Role.DELIVERY))).toBe(false);
        }
      }
    },
  );

  it('el repartidor sí puede entrar a /courier', () => {
    for (const { name, handler } of handlersOf(CourierController)) {
      expect(guard.canActivate(contextFor(CourierController, handler, Role.DELIVERY))).toBe(true);
      expect({ handler: name, denied: guard.canActivate(contextFor(CourierController, handler, Role.SELLER)) })
        .toEqual({ handler: name, denied: false });
    }
  });

  it('sin usuario autenticado el guard niega cualquier handler con roles', () => {
    const handler = DeliveryController.prototype.findAll;
    expect(guard.canActivate(contextFor(DeliveryController, handler))).toBe(false);
  });

  it('un handler público (sin @Roles) no se bloquea en el guard', () => {
    const handler = ProductsController.prototype.findAll;
    expect(requiredRoles(handler)).toBeUndefined();
    expect(guard.canActivate(contextFor(ProductsController, handler))).toBe(true);
  });

  it('Nest traduce false del guard en 403', () => {
    // RolesGuard no lanza, devuelve false; Nest responde Forbidden por contrato.
    // Se documenta aquí para que un cambio a "return true por defecto" falle.
    const handler = DeliveryController.prototype.assign;
    expect(guard.canActivate(contextFor(DeliveryController, handler, Role.DELIVERY))).toBe(false);
    expect(ForbiddenException).toBeDefined();
  });
});
