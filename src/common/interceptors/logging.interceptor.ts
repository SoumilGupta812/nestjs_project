import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.id;
    this.logger.log(
      `${method} ${url} ${userId} ${JSON.stringify(params)} ${JSON.stringify(
        query,
      )} ${JSON.stringify(body)} ${userAgent}`,
    );
    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const responseTime = endTime - now;
          this.logger.log(`${method} ${url} ${userId} ${responseTime}ms`);
        },
        error: (err) => {
          const endTime = Date.now();
          const responseTime = endTime - now;
          this.logger.log(
            `${method} ${url} ${userId} ${responseTime}ms -Error ${err.message}`,
          );
        },
      }),
    );
  }
}
