import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request = require('supertest');
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from './../src/common/filters/global-exception.filter';

const createTestKeyPair = () => {
  const directory = mkdtempSync(join(tmpdir(), 'nestjs-rsa-e2e-keys-'));
  const publicKeyPath = join(directory, 'public.pem');
  const privateKeyPath = join(directory, 'private.pem');
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  writeFileSync(publicKeyPath, publicKey);
  writeFileSync(privateKeyPath, privateKey);

  return { directory, publicKeyPath, privateKeyPath };
};

describe('CryptoController (e2e)', () => {
  let app: INestApplication;
  let testKeyPair: ReturnType<typeof createTestKeyPair>;
  let originalPublicKeyPath: string | undefined;
  let originalPrivateKeyPath: string | undefined;

  beforeAll(async () => {
    testKeyPair = createTestKeyPair();
    originalPublicKeyPath = process.env.RSA_PUBLIC_KEY_PATH;
    originalPrivateKeyPath = process.env.RSA_PRIVATE_KEY_PATH;
    process.env.RSA_PUBLIC_KEY_PATH = testKeyPair.publicKeyPath;
    process.env.RSA_PRIVATE_KEY_PATH = testKeyPair.privateKeyPath;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.RSA_PUBLIC_KEY_PATH = originalPublicKeyPath;
    process.env.RSA_PRIVATE_KEY_PATH = originalPrivateKeyPath;
    rmSync(testKeyPair.directory, { recursive: true, force: true });
  });

  it('/get-encrypt-data and /get-decrypt-data (POST)', async () => {
    const encryptedResponse = await request(app.getHttpServer())
      .post('/get-encrypt-data')
      .send({ payload: 'hello world' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.successful).toBe(true);
        expect(body.error_code).toBe('');
        expect(body.data.data1).toEqual(expect.any(String));
        expect(body.data.data2).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .post('/get-decrypt-data')
      .send(encryptedResponse.body.data)
      .expect(200)
      .expect({
        successful: true,
        error_code: '',
        data: {
          payload: 'hello world',
        },
      });
  });
});
