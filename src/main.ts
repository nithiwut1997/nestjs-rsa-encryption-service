import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpLogger = new Logger('HTTP');

  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();

    response.on('finish', () => {
      const elapsedMs = Date.now() - startedAt;

      httpLogger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedMs}ms`,
      );
    });

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RSA Encryption Service')
    .setDescription('Hybrid RSA and AES-256-CBC encryption API')
    .setVersion('1.0')
    .addServer('http://localhost:3000')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);

  await app.listen(port);
}
bootstrap();
