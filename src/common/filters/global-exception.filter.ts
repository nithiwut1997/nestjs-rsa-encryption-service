import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiResponse<null> = {
      successful: false,
      error_code: this.resolveErrorCode(exception, status),
      data: null,
    };

    response.status(status).json(body);
  }

  private resolveErrorCode(exception: unknown, status: number): string {
    if (!(exception instanceof HttpException)) {
      return 'INTERNAL_SERVER_ERROR';
    }

    const exceptionResponse = exception.getResponse();

    if (this.hasErrorCode(exceptionResponse)) {
      return exceptionResponse.error_code;
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return 'VALIDATION_ERROR';
    }

    return this.toErrorCode(status);
  }

  private hasErrorCode(value: unknown): value is { error_code: string } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const errorCode = (value as { error_code?: unknown }).error_code;

    return typeof errorCode === 'string' && errorCode.length > 0;
  }

  private toErrorCode(status: number): string {
    const statusName = HttpStatus[status];

    return typeof statusName === 'string'
      ? statusName
      : 'INTERNAL_SERVER_ERROR';
  }
}
