import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        details = resObj.error || resObj.details || null;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = 'Something went wrong. Please try again.';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error('Unhandled unknown exception', exception);
      message = 'Something went wrong. Please try again.';
    }

    // Mask raw internal messages for server errors (500+)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Something went wrong. Please try again.';
      details = 'Internal Server Error';
    }

    const errorResponse = {
      data: null,
      error: {
        statusCode: status,
        message: Array.isArray(message) ? message.join(', ') : message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    response.status(status).json(errorResponse);
  }
}
