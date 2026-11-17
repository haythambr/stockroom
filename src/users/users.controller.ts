import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import {
  paginate,
  PaginationQueryDto,
  skipTake,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin: customers')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  /** Accounts with their order count. Password hashes never leave the server. */
  @Get()
  async list(@Query() query: PaginationQueryDto) {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.user.count(),
    ]);

    return paginate(
      users.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders })),
      total,
      query,
    );
  }
}
