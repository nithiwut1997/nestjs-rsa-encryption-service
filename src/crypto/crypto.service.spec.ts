import {
  ArgumentsHost,
  ForbiddenException,
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request = require('supertest');
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

const createTestKeyPair = () => {
  const directory = mkdtempSync(join(tmpdir(), 'nestjs-rsa-keys-'));
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

const testKeyPair = createTestKeyPair();
const configServiceMock = {
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      RSA_PUBLIC_KEY_PATH: testKeyPair.publicKeyPath,
      RSA_PRIVATE_KEY_PATH: testKeyPair.privateKeyPath,
    };

    return values[key];
  }),
};

afterAll(() => {
  rmSync(testKeyPair.directory, { recursive: true, force: true });
});

describe('CryptoService', () => {
  let service: CryptoService;
  let controller: CryptoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoController],
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    controller = module.get<CryptoController>(CryptoController);
  });

  it('encrypts a payload successfully', () => {
    const response = service.encrypt('hello world');

    expect(response).toEqual({
      successful: true,
      error_code: '',
      data: {
        data1: expect.any(String),
        data2: expect.any(String),
      },
    });
    expect(response.data?.data1.length).toBeGreaterThan(0);
    expect(response.data?.data2).toContain(':');
  });

  it('decrypts encrypted data successfully', () => {
    const encrypted = service.encrypt('hello world');
    const decrypted = service.decrypt(
      encrypted.data!.data1,
      encrypted.data!.data2,
    );

    expect(decrypted).toEqual({
      successful: true,
      error_code: '',
      data: {
        payload: 'hello world',
      },
    });
  });

  it('throws a normalized decryption exception for invalid data', () => {
    expect(() => service.decrypt('invalid-key', 'invalid:payload')).toThrow(
      'Bad Request',
    );
  });

  it('throws a normalized decryption exception for malformed encrypted payload', () => {
    expect(() => service.decrypt('invalid-key', 'invalid-payload')).toThrow(
      'Bad Request',
    );
  });

  it('throws a normalized encryption exception when the public key is unavailable', () => {
    const brokenService = new CryptoService({
      get: jest.fn(() => join(testKeyPair.directory, 'missing-public.pem')),
    } as unknown as ConfigService);

    expect(() => brokenService.encrypt('hello world')).toThrow(
      'Internal Server Error',
    );
  });

  it('throws a normalized encryption exception when key paths are not configured', () => {
    const unconfiguredService = new CryptoService({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    expect(() => unconfiguredService.encrypt('hello world')).toThrow(
      'Internal Server Error',
    );
  });

  it('returns controller encrypt and decrypt responses', () => {
    const encrypted = controller.getEncryptData({ payload: 'hello world' });
    const decrypted = controller.getDecryptData({
      data1: encrypted.data!.data1,
      data2: encrypted.data!.data2,
    });

    expect(encrypted.successful).toBe(true);
    expect(encrypted.error_code).toBe('');
    expect(encrypted.data?.data1).toEqual(expect.any(String));
    expect(encrypted.data?.data2).toEqual(expect.any(String));
    expect(decrypted).toEqual({
      successful: true,
      error_code: '',
      data: {
        payload: 'hello world',
      },
    });
  });
});

describe('GlobalExceptionFilter', () => {
  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status,
        }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  };

  it('returns internal server error for non-HTTP exceptions', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new Error('Unexpected'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      successful: false,
      error_code: 'INTERNAL_SERVER_ERROR',
      data: null,
    });
  });

  it('returns the HTTP status name when no custom error code exists', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new ForbiddenException(), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      successful: false,
      error_code: 'FORBIDDEN',
      data: null,
    });
  });

  it('falls back to internal server error for unknown HTTP statuses', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json, status } = createHost();

    filter.catch(new HttpException('Unknown status', 599), host);

    expect(status).toHaveBeenCalledWith(599);
    expect(json).toHaveBeenCalledWith({
      successful: false,
      error_code: 'INTERNAL_SERVER_ERROR',
      data: null,
    });
  });
});

describe('CryptoController validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoController],
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
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
  });

  it('returns the global error format for validation failure', async () => {
    await request(app.getHttpServer())
      .post('/get-encrypt-data')
      .send({ payload: '' })
      .expect(400)
      .expect({
        successful: false,
        error_code: 'VALIDATION_ERROR',
        data: null,
      });
  });

  it('returns the global error format for decryption failure', async () => {
    await request(app.getHttpServer())
      .post('/get-decrypt-data')
      .send({ data1: 'invalid-key', data2: 'invalid:payload' })
      .expect(400)
      .expect({
        successful: false,
        error_code: 'DECRYPTION_FAILED',
        data: null,
      });
  });
});
