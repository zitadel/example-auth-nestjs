import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as templateLang from 'express-handlebars';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/static',
  });
  app.engine(
    'hbs',
    templateLang.engine({
      extname: '.hbs',
      defaultLayout: 'main',
      layoutsDir: join(__dirname, '..', 'res'),
      partialsDir: join(__dirname, '..', 'res', 'partials'),
    }),
  );
  app.set('view engine', 'hbs');
  app.set('views', join(__dirname, '..', 'res'));

  await app.listen(Number(process.env.PORT || 3000));
  console.log(`⇢ Application is running on: ${await app.getUrl()}`);
}

// noinspection JSIgnoredPromiseFromCall
bootstrap();
