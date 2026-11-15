import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();

    const request = http.getRequest();
    const reply = http.getResponse();

    // Request ID Response Header
    reply.header('X-Request-ID', request.id);

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: 'Request successful',
        data: data ?? null,
        meta: null,
      })),
    );
  }
}
