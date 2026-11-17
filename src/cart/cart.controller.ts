import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/auth.decorators';
import { CartService } from './cart.service';

export class SetQuantityDto {
  /** 0 removes the product from the cart. @example 2 */
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

@ApiTags('Cart & checkout')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  /** Your cart with live prices, totals and any stock problems. */
  @Get()
  view(@CurrentUser() user: AuthUser) {
    return this.cart.view(user.id);
  }

  /** Put a product in the cart, or change how many. */
  @Put('items/:productId')
  setQuantity(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetQuantityDto,
  ) {
    return this.cart.setQuantity(user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.cart.setQuantity(user.id, productId, 0);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser) {
    return this.cart.clear(user.id);
  }
}
