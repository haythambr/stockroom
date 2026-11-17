import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CurrentUser, Roles } from '../common/decorators/auth.decorators';
import { CheckoutDto, OrderQueryDto, UpdateStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Cart & checkout')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Place an order from your cart. Stock is taken immediately and held for 30 minutes while
   * payment is pending. Returns 409 with the available quantity if something sold out meanwhile.
   */
  @Post()
  @ApiCreatedResponse({
    description:
      'Order placed. Status PENDING_PAYMENT until the payment webhook arrives.',
    schema: {
      example: {
        id: '7d3f1c9e-0b3a-4b8e-9d7a-2f1e6c5b4a39',
        number: 1042,
        status: 'PENDING_PAYMENT',
        subtotalCents: 3200,
        shippingCents: 499,
        totalCents: 3699,
        expiresAt: '2026-11-17T12:30:00.000Z',
        items: [
          {
            productName: 'Leather desk tray',
            sku: 'OFF-TRAY-05',
            unitPriceCents: 3200,
            quantity: 1,
            lineTotalCents: 3200,
          },
        ],
      },
    },
  })
  @ApiConflictResponse({
    description:
      'Something in the cart sold out while you were shopping. Nothing was charged or saved.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Only 0 of Leather desk tray left.',
        productId: 'b1f…',
        available: 0,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The cart is empty or the address is invalid.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired access token.' })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.orders.checkout(user.id, dto);
  }

  /** Your orders, newest first. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.orders.list(query, user.id);
  }

  @Get(':id')
  find(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.find(id, user.id);
  }

  /** Cancel your order before it ships. The stock goes back on sale. */
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.moveTo(id, OrderStatus.CANCELLED, {
      userId: user.id,
      reason: 'Cancelled by customer',
    });
  }
}

@ApiTags('Admin: orders')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Every order, filterable by status. */
  @Get()
  list(@Query() query: OrderQueryDto) {
    return this.orders.list(query);
  }

  /** One order with customer and payment events. */
  @Get(':id')
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.find(id);
  }

  /** Move an order along: paid → shipped → delivered, or cancel it before it ships. */
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.moveTo(id, dto.status, {
      reason:
        dto.reason ??
        (dto.status === OrderStatus.CANCELLED
          ? 'Cancelled by the shop'
          : undefined),
    });
  }
}
