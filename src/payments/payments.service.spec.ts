import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService.demoPay', () => {
  it('is refused unless DEMO_PAYMENTS is switched on', async () => {
    const config = new ConfigService({
      DEMO_PAYMENTS: 'false',
      PAYMENT_WEBHOOK_SECRET: 'whsec_x_1234567890',
    });
    const service = new PaymentsService(
      {} as PrismaService,
      {} as OrdersService,
      config,
    );

    await expect(
      service.demoPay('7d3f1c9e-0b3a-4b8e-9d7a-2f1e6c5b4a39', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
