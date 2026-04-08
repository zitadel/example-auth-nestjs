import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { engine } from 'express-handlebars';
import cookieParser from 'cookie-parser';
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

    app.use(cookieParser());
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

describe('GET /auth/logout/callback', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    app.use(cookieParser());
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

  it('clears authjs.* and logout_state via Set-Cookie on success', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/logout/callback?state=teststate123')
      .set('Cookie', [
        'logout_state=teststate123',
        'authjs.session-token=fakesession',
        'authjs.csrf-token=fakecsrf',
        'authjs.callback-url=http://example.com',
      ]);

    const status = res.status;
    const location = res.headers.location;
    const setCookies = res.headers['set-cookie'] as unknown as string[];

    expect(status).toBe(302);
    expect(location).toMatch(/\/(auth\/)?logout\/success$/);
    expect(setCookies).toBeDefined();
    expect(Array.isArray(setCookies)).toBe(true);

    const wasCleared = (name: string) =>
      setCookies.some(
        (sc) =>
          sc.startsWith(`${name}=`) &&
          (sc.includes('Max-Age=0') || /Expires=Thu, 01 Jan 1970/i.test(sc)),
      );

    expect(wasCleared('authjs.session-token')).toBe(true);
    expect(wasCleared('authjs.csrf-token')).toBe(true);
    expect(wasCleared('authjs.callback-url')).toBe(true);
    expect(wasCleared('logout_state')).toBe(true);

    const logoutStateCookie = setCookies.find((sc) =>
      sc.startsWith('logout_state='),
    );
    expect(logoutStateCookie).toMatch(/Path=\/auth\/logout\/callback/);
  });
});
