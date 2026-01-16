import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';
import passport from 'passport';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { AppModule } from './app.module';
import { getMongoDbConnectionUrl } from './persistence/mongo/mongo.util';
import { APP_ENVIRONMENT } from './constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors();

  // Starts listening for shutdown hooks
  if (APP_ENVIRONMENT) {
    app.enableShutdownHooks();
  }

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('NR Broker')
    .setDescription('Application secret provisioner')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Helmet setup
  const cspOptions = helmet.contentSecurityPolicy.getDefaultDirectives();
  if (process.env.NESTJS_HELMET_HSTS === 'off') {
    delete cspOptions['upgrade-insecure-requests'];
  }
  cspOptions['default-src'] = ["'self'"];
  cspOptions['style-src'] = [
    "'self'",
    "'unsafe-inline'",
    'fonts.googleapis.com',
  ];
  cspOptions['script-src'] = ["'self'", "'unsafe-inline'"];
  cspOptions['script-src-attr'] = ["'unsafe-inline'"];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          ...cspOptions,
        },
        reportOnly: false,
      },
      hsts: process.env.NESTJS_HELMET_HSTS !== 'off',
    }),
  );

  // OIDC Setup
  app.use(
    session({
      store: new MongoStore({
        mongoUrl: getMongoDbConnectionUrl(),
      }), // where session will be stored
      secret: process.env.OAUTH2_CLIENT_SESSION_SECRET, // to sign session id
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

  await app.listen(3000);
}
bootstrap();
