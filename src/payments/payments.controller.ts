import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/auth.decorators';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Called by the payment provider, not by customers. The body is checked against the
   * Stockroom-Signature header (HMAC-SHA256 with the shared secret). Events are applied once,
   * even if the provider sends them again. Try it with `npm run webhook:pay -- <orderId>`.
   */
  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Received. outcome is one of marked_paid, duplicate, already_paid, unknown_order, amount_mismatch, order_cancelled_refund_needed, payment_failed, ignored.',
    schema: { example: { received: true, outcome: 'marked_paid' } },
  })
  @ApiBadRequestResponse({
    description: 'Missing, wrong or expired signature, or a malformed body.',
  })
  @ApiHeader({
    name: 'Stockroom-Signature',
    description: 't=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">',
    required: true,
  })
  @ApiBody({
    schema: {
      example: {
        id: 'evt_1Q2w3E4r',
        type: 'payment.succeeded',
        data: {
          orderId: '7d3f1c9e-0b3a-4b8e-9d7a-2f1e6c5b4a39',
          amountCents: 6497,
        },
      },
    },
  })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stockroom-signature') signature?: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Send the event as a JSON body.');
    }

    return this.payments.handleWebhook(req.rawBody.toString('utf8'), signature);
  }
}
