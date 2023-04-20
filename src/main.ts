import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import * as session from 'express-session';
import passport from 'passport';

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
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        'script-src': ["'self'"],
        upgradeInsecureRequests: null,
      },
    }),
  );
  /*
  app.use(
    session({
      // store: new MongoStore({ url: process.env.MONGODB_URL }), // where session will be stored
      secret: process.env.SESSION_SECRET, // to sign session id
      resave: false, // will default to false in near future: https://github.com/expressjs/session#resave
      saveUninitialized: false, // will default to false in near future: https://github.com/expressjs/session#saveuninitialized
      rolling: true, // keep session alive
      cookie: {
        maxAge: 30 * 60 * 1000, // session expires in 1hr, refreshed by `rolling: true` option.
        httpOnly: true, // so that cookie can't be accessed via client-side script
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
*/
  await app.listen(3000);
}
bootstrap();
