import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersScheduler {
  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'release-unpaid-orders',
    disabled: process.env.NODE_ENV === 'test',
  })
  releaseUnpaid(): Promise<number> {
    return this.orders.releaseExpired();
  }
}
