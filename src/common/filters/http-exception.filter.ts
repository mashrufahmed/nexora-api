import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiErrorResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const request = context.getRequest<FastifyRequest>();
    const reply = context.getResponse<FastifyReply>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      console.error('Unhandled HTTP exception', exception);
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: string[] | null = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const response = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };

      if (Array.isArray(response.message)) {
        errors = response.message;
        message = 'Validation failed';
      } else if (typeof response.message === 'string') {
        message = response.message;
      } else if (response.error) {
        message = response.error;
      }
    }

    const responseBody: ApiErrorResponse = {
      success: false,
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    reply.status(statusCode).send(responseBody);
  }
}
