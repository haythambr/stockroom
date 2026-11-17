import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.dto';

@ApiTags('Catalog')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  /** All categories, with how many products are on sale in each. */
  @Public()
  @Get()
  async list() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });

    return categories.map(({ _count, ...c }) => ({
      ...c,
      productCount: _count.products,
    }));
  }

  /** Add a category (admin). */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}
