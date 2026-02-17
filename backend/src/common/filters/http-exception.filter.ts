import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error: Record<string, unknown>;
    if (typeof exceptionResponse === 'string') {
      error = { statusCode, message: exceptionResponse, error: exceptionResponse };
    } else {
      const { message, error: errLabel, ...extra } = exceptionResponse as Record<string, unknown>;
      error = {
        statusCode,
        message: message || exception.message,
        error: errLabel || 'Error',
        ...extra,
      };
    }

    response.status(statusCode).json({
      success: false,
      error,
    });
  }
}
