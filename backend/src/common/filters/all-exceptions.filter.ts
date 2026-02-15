import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
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
      return;
    }

    // Non-HTTP exceptions: log full details, return sanitized response
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(500).json({
      success: false,
      error: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    });
  }
}
