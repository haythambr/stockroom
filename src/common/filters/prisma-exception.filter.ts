import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/**
 * Turns the database errors a client can cause into proper HTTP answers instead of a 500:
 * a duplicate unique value becomes 409, a missing record becomes 404.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(
    error: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    if (error.code === 'P2002') {
      const fields = ([] as string[])
        .concat((error.meta?.target as string[] | string) ?? [])
        .join(', ');
      return super.catch(
        new ConflictException(`That ${fields || 'value'} is already in use.`),
        host,
      );
    }

    if (error.code === 'P2025') {
      return super.catch(new NotFoundException('Not found.'), host);
    }

    return super.catch(error, host);
  }
}
