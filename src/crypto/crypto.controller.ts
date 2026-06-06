import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResponse,
  DecryptResponseData,
  EncryptResponseData,
} from '../common/interfaces/api-response.interface';
import { CryptoService } from './crypto.service';
import { DecryptRequestDto } from './dto/decrypt-request.dto';
import { EncryptRequestDto } from './dto/encrypt-request.dto';

@ApiTags('crypto')
@Controller()
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('get-encrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encrypt a payload using AES-256-CBC and RSA' })
  @ApiBody({ type: EncryptRequestDto })
  @ApiOkResponse({
    description: 'Encrypted AES key and encrypted payload.',
    schema: {
      example: {
        successful: true,
        error_code: '',
        data: {
          data1: '<encrypted-key>',
          data2: '<iv>:<encrypted-payload>',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error.',
    schema: {
      example: {
        successful: false,
        error_code: 'VALIDATION_ERROR',
        data: null,
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Encryption error.',
    schema: {
      example: {
        successful: false,
        error_code: 'ENCRYPTION_FAILED',
        data: null,
      },
    },
  })
  getEncryptData(
    @Body() request: EncryptRequestDto,
  ): ApiResponse<EncryptResponseData> {
    return this.cryptoService.encrypt(request.payload);
  }

  @Post('get-decrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decrypt data produced by the encrypt endpoint' })
  @ApiBody({ type: DecryptRequestDto })
  @ApiOkResponse({
    description: 'Decrypted payload.',
    schema: {
      example: {
        successful: true,
        error_code: '',
        data: {
          payload: 'hello world',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation or decryption error.',
    schema: {
      example: {
        successful: false,
        error_code: 'DECRYPTION_FAILED',
        data: null,
      },
    },
  })
  getDecryptData(
    @Body() request: DecryptRequestDto,
  ): ApiResponse<DecryptResponseData> {
    return this.cryptoService.decrypt(request.data1, request.data2);
  }
}
