import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ApiResponse,
  DecryptResponseData,
  EncryptResponseData,
} from '../common/interfaces/api-response.interface';

@Injectable()
export class CryptoService {
  private readonly aesAlgorithm = 'aes-256-cbc';
  private readonly aesKeyLength = 32;
  private readonly ivLength = 16;

  constructor(private readonly configService: ConfigService) {}

  encrypt(payload: string): ApiResponse<EncryptResponseData> {
    try {
      const aesKey = randomBytes(this.aesKeyLength);
      const iv = randomBytes(this.ivLength);
      const encryptedPayload = this.encryptPayload(payload, aesKey, iv);
      const encryptedKey = publicEncrypt(
        {
          key: this.readKey('RSA_PUBLIC_KEY_PATH'),
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        aesKey,
      ).toString('base64');

      return {
        successful: true,
        error_code: '',
        data: {
          data1: encryptedKey,
          data2: `${iv.toString('base64')}:${encryptedPayload}`,
        },
      };
    } catch {
      throw new InternalServerErrorException({
        error_code: 'ENCRYPTION_FAILED',
      });
    }
  }

  decrypt(data1: string, data2: string): ApiResponse<DecryptResponseData> {
    try {
      const [iv, encryptedPayload] = this.extractEncryptedPayload(data2);
      const aesKey = privateDecrypt(
        {
          key: this.readKey('RSA_PRIVATE_KEY_PATH'),
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(data1, 'base64'),
      );

      const payload = this.decryptPayload(encryptedPayload, aesKey, iv);

      return {
        successful: true,
        error_code: '',
        data: {
          payload,
        },
      };
    } catch {
      throw new BadRequestException({
        error_code: 'DECRYPTION_FAILED',
      });
    }
  }

  private encryptPayload(payload: string, aesKey: Buffer, iv: Buffer): string {
    const cipher = createCipheriv(this.aesAlgorithm, aesKey, iv);

    return Buffer.concat([
      cipher.update(payload, 'utf8'),
      cipher.final(),
    ]).toString('base64');
  }

  private decryptPayload(
    encryptedPayload: string,
    aesKey: Buffer,
    iv: Buffer,
  ): string {
    const decipher = createDecipheriv(this.aesAlgorithm, aesKey, iv);

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private extractEncryptedPayload(data2: string): [Buffer, string] {
    const [iv, encryptedPayload] = data2.split(':');

    if (!iv || !encryptedPayload) {
      throw new Error('Invalid encrypted payload');
    }

    return [Buffer.from(iv, 'base64'), encryptedPayload];
  }

  private readKey(envName: string): string {
    const keyPath = this.configService.get<string>(envName);

    if (!keyPath) {
      throw new Error(`${envName} is not configured`);
    }

    return readFileSync(resolve(process.cwd(), keyPath), 'utf8');
  }
}
