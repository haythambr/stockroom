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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../common/decorators/auth.decorators';
import {
  AdjustStockDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('Catalog')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Browse the shop: search, filter by category, price and stock, sort, and page through results. */
  @Public()
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  /** One product, by id or slug. */
  @Public()
  @Get(':idOrSlug')
  find(@Param('idOrSlug') idOrSlug: string) {
    return this.products.findPublic(idOrSlug);
  }
}

@ApiTags('Admin: catalog')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Every product, including hidden ones. */
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query, true);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto);
  }

  /** Restock or correct the count. Every change is logged. */
  @Post(':id/stock')
  adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.products.adjustStock(id, dto);
  }

  /** The last 50 stock changes for a product, newest first. */
  @Get(':id/stock')
  movements(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.movements(id);
  }
}
