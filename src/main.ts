import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('Vault Broker')
    .setDescription('Application secret provisioner')
    .setVersion('1.8')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.use(helmet());

  await app.listen(3000);
}
bootstrap();
