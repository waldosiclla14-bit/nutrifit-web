import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { CouponsModule } from './coupons/coupons.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { RemindersModule } from './reminders/reminders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PingModule } from './ping/ping.module';
import { DeliveryModule } from './delivery/delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    OrdersModule,
    CouponsModule,
    CashRegisterModule,
    AuditModule,
    AppConfigModule,
    HealthModule,
    RemindersModule,
    ReviewsModule,
    PingModule,
    DeliveryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
