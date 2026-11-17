import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** Shared by main.ts and the end-to-end tests, so tests run against the real app setup. */
export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.enableCors();
  app.enableShutdownHooks();

  // Unknown fields are rejected and query strings are converted to numbers/booleans.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Stockroom API')
    .setDescription(
      [
        'Back end for an online shop: catalog, cart, checkout that never oversells, orders and payments.',
        '',
        '**Try it:** call `POST /auth/login` with `customer@stockroom.test` / `password123` (or `admin@stockroom.test`),',
        'copy the `accessToken`, press **Authorize** and paste it.',
        '',
        'Money is in cents (`1800` = $18.00). Lists take `page` and `limit` and return `{ data, meta }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    // Listed in the order a shopper meets them; admin tools after.
    .addTag('Auth', 'Sign up, sign in, rotate tokens, sign out.')
    .addTag('Catalog', 'Public: browse, search and filter products.')
    .addTag(
      'Cart & checkout',
      'Signed-in customers: cart, placing orders, order history.',
    )
    .addTag('Payments', 'Called by the payment provider.')
    .addTag('Admin: catalog', 'Products and stock.')
    .addTag('Admin: orders', 'Every order and its status.')
    .addTag('Admin: customers', 'Accounts.')
    .addTag('Health', 'Uptime checks.')
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    customSiteTitle: 'Stockroom API docs',
    swaggerOptions: {
      persistAuthorization: true,
      deepLinking: true,
      docExpansion: 'none',
    },
  });
}
