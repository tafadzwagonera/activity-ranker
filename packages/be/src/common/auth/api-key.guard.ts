import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

import { headerNames } from '@activity-ranker/shared';

const DEFAULT_AUTH_WHITELIST_PATH_PREFIXES = '/health,/docs';

const splitCsv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = this.getRequest(context);
    const path = request.path ?? request.url ?? '/';
    const whitelistPrefixes = splitCsv(
      process.env.AUTH_WHITELIST_PATH_PREFIXES ??
        DEFAULT_AUTH_WHITELIST_PATH_PREFIXES,
    );
    const isWhitelisted = whitelistPrefixes.some((prefix) =>
      path.startsWith(prefix),
    );

    if (isWhitelisted) {
      return true;
    }

    const publicKey = request.header(headerNames.xApiKey);
    const internalKey = request.header(headerNames.xInternalKey);
    const validPublicValues = splitCsv(process.env.API_KEY_PUBLIC_VALUES);
    const validInternalValues = splitCsv(process.env.API_KEY_INTERNAL_VALUES);
    const hasValidPublicKey =
      !!publicKey && validPublicValues.includes(publicKey);
    const hasValidInternalKey =
      !!internalKey && validInternalValues.includes(internalKey);

    if (!hasValidPublicKey && !hasValidInternalKey) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: invalid credentials',
        path,
        statusCode: 401,
      });
    }

    return true;
  }

  private getRequest(context: ExecutionContext): Request {
    if (context.getType<'graphql'>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: Request }>()
        .req;
    }

    return context.switchToHttp().getRequest<Request>();
  }
}
