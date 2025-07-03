import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import config from './config.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as exphbs from 'express-handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.engine(
    'hbs',
    exphbs.engine({
      extname: '.hbs',
      defaultLayout: 'main',
      layoutsDir: join(__dirname, '..', 'res'),
      partialsDir: join(__dirname, '..', 'res', 'partials'),
    }),
  );
  app.set('view engine', 'hbs');
  app.set('views', join(__dirname, '..', 'res'));

  app.use(cookieParser());

  app.use(
    session({
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: config.SESSION_COOKIE_SECURE,
        maxAge: config.SESSION_COOKIE_MAX_AGE * 1000,
        path: config.SESSION_COOKIE_PATH,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(config.PORT);
  console.log(`⇢ Application is running on: ${await app.getUrl()}`);
}

bootstrap();
