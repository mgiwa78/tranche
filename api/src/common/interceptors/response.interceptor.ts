import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, map } from "rxjs";
import { RESPONSE_MESSAGE_KEY, RAW_RESPONSE_KEY } from "../decorators";

/** Whatever a controller returns leaves as `{ success: true, response, message? }`. `@RawResponse()` opts out (webhooks). */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, targets)) return next.handle();
    const message = this.reflector.getAllAndOverride<string | undefined>(RESPONSE_MESSAGE_KEY, targets);

    return next.handle().pipe(
      map((response) => ({
        success: true,
        response: response ?? null,
        ...(message ? { message } : {}),
      })),
    );
  }
}
