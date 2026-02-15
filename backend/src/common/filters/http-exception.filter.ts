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

    const error =
      typeof exceptionResponse === 'string'
        ? { statusCode, message: exceptionResponse, error: exceptionResponse }
        : {
            statusCode,
            message: (exceptionResponse as any).message || exception.message,
            error: (exceptionResponse as any).error || 'Error',
          };

    response.status(statusCode).json({
      success: false,
      error,
    });
  }
}
