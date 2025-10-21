import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { engine } from 'express-handlebars';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('GET /', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    app.engine(
      'hbs',
      engine({
        extname: '.hbs',
        defaultLayout: 'main',
        layoutsDir: join(__dirname, '..', 'res'),
        partialsDir: join(__dirname, '..', 'res', 'partials'),
      }),
    );
    app.setViewEngine('hbs');
    app.setBaseViewsDir(join(__dirname, '..', 'res'));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 OK and render the home page', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.status).toBe(200);
  });
});
