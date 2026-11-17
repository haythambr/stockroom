import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './setup';

async function bootstrap() {
  // rawBody: the payment webhook signature is checked against the exact bytes received.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  configureApp(app);
  setupSwagger(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(
    `API on http://localhost:${port}  ·  docs on http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
