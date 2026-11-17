import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true
    ? true
    : value === 'false' || value === false
      ? false
      : value;

export const PRODUCT_SORTS = ['newest', 'price', '-price', 'name'] as const;

export class ProductQueryDto extends PaginationQueryDto {
  /** Words to find in the name or description. @example "mug" */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  /** Category slug. @example "kitchen" */
  @IsOptional()
  @IsString()
  category?: string;

  /** Lowest price, in cents. @example 1000 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number;

  /** Highest price, in cents. @example 5000 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  /** Only products that can be bought right now. */
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  /** newest, price (low to high), -price (high to low) or name. */
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort: (typeof PRODUCT_SORTS)[number] = 'newest';
}

export class CreateProductDto {
  /** @example "MUG-STONE-01" */
  @Matches(/^[A-Z0-9-]{3,32}$/, {
    message: 'sku must be 3–32 capital letters, numbers or dashes',
  })
  sku!: string;

  /** @example "Stoneware mug" */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** @example "stoneware-mug" */
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and dashes',
  })
  slug!: string;

  /** @example "Hand-glazed, 350 ml, dishwasher safe." */
  @IsString()
  @MaxLength(2000)
  description!: string;

  /** Price in cents. @example 1800 */
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  priceCents!: number;

  /** Units on hand when the product is created. @example 25 */
  @IsInt()
  @Min(0)
  stock!: number;

  @IsUUID()
  categoryId!: string;
}

/** Stock is changed through /products/:id/stock so every change is logged. */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  /** Hide the product from the shop without deleting it. */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustStockDto {
  /** Units to add (restock) or remove (damage, count correction). @example 12 */
  @IsInt()
  @NotEquals(0)
  @Min(-100_000)
  @Max(100_000)
  change!: number;

  /** @example "Delivery from supplier, invoice 4471" */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
