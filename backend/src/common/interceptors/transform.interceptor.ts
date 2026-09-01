import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: {
    timestamp: string;
    path: string;
    version: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request?.url || '';

    return next.handle().pipe(
      map((data) => ({
        data,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          path,
          version: 'v1.0.0',
        },
      })),
    );
  }
}
