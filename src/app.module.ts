import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';
import { CategoriesController } from './categories/categories.controller';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import {
  AdminOrdersController,
  OrdersController,
} from './orders/orders.controller';
import { OrdersScheduler } from './orders/orders.scheduler';
import { OrdersService } from './orders/orders.service';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { PrismaModule } from './prisma/prisma.module';
import {
  AdminProductsController,
  ProductsController,
} from './products/products.controller';
import { ProductsService } from './products/products.service';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // 120 requests a minute per IP (5 for sign-in and sign-up). Off in tests, which sign in a lot.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    HealthController,
    CategoriesController,
    ProductsController,
    AdminProductsController,
    CartController,
    OrdersController,
    AdminOrdersController,
    PaymentsController,
    UsersController,
  ],
  providers: [
    ProductsService,
    CartService,
    OrdersService,
    OrdersScheduler,
    PaymentsService,
    // Order matters: rate limit, then "who are you" (JWT), then "are you allowed" (role).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
