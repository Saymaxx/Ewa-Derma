import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    // We focus audit logging on state-changing methods (POST, PUT, PATCH, DELETE)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const userAgent = headers['user-agent'] || 'Unknown';
      const clientIp = headers['x-forwarded-for'] || ip || request.socket.remoteAddress;

      return next.handle().pipe(
        tap({
          next: (data) => {
            // Log sensitive actions
            const entityId = data?.data?.id || data?.id || undefined;
            const action = `${method}_${url.split('/')[2]?.toUpperCase() || 'RESOURCE'}`;

            this.auditLogService.log({
              userId: user?.id || null,
              action,
              entityName: url.split('/')[2] || 'SYSTEM',
              entityId: typeof entityId === 'string' ? entityId : undefined,
              details: {
                url,
                method,
                statusCode: 200,
              },
              ipAddress: String(clientIp),
              userAgent: String(userAgent),
            });
          },
        }),
      );
    }

    return next.handle();
  }
}
