import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Boostrap');
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Teslo RestFull API')
    .setDescription('Teslo shop Endpoints')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  logger.log(`Before App running on port 🚀 ${process.env.PORT}`);
  await app.listen(process.env.PORT || 3000);
  logger.log(`App running on port 🚀 ${process.env.PORT}`);
}
bootstrap();
