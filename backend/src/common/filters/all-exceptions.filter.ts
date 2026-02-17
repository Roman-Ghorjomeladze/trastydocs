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
