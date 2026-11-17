import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AddressDto {
  /** @example "Sam Carter" */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  /** @example "221B Baker Street" */
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1!: string;

  /** @example "Flat 2" */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  /** @example "London" */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  /** @example "NW1 6XE" */
  @IsString()
  @Length(2, 12)
  postalCode!: string;

  /** Two-letter country code. @example "GB" */
  @IsISO31661Alpha2()
  country!: string;
}

export class CheckoutDto {
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress!: AddressDto;
}

export class OrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;
}

export class UpdateStatusDto {
  /** PAID (bank transfer), SHIPPED, DELIVERED or CANCELLED. */
  @IsIn([
    OrderStatus.PAID,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ])
  status!: OrderStatus;

  /** Shown to the customer when an order is cancelled. @example "Item damaged in the warehouse" */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
