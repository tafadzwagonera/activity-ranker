import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import {
  createRequestLog,
  headerNames,
  observabilityEventNames,
  resolveStructuredLogLevel,
  resolveStructuredOutcome,
} from '@activity-ranker/shared';

import { backendLogger } from './backend-logger';

type ObservabilityRequest = Request & {
  requestId?: string;
  startTimeInMs?: number;
};

const resolvePath = (request: Request) =>
  request.originalUrl?.split('?')[0] ?? request.path ?? request.url ?? '/';

const resolveRequestId = (request: Request) => {
  const headerValue = request.header(headerNames.xRequestId);

  if (headerValue && headerValue.trim().length > 0) {
    return headerValue;
  }

  return randomUUID();
};

const resolveTransport = (request: Request) =>
  resolvePath(request).startsWith('/graphql') ? 'graphql' : 'rest';

const resolveOperation = (request: Request) => {
  if (resolveTransport(request) === 'graphql') {
    const requestBody = request.body as { operationName?: unknown } | undefined;

    return typeof requestBody?.operationName === 'string'
      ? requestBody.operationName
      : 'graphql';
  }

  return resolvePath(request);
};

/**
 * Express middleware that normalizes request correlation and writes structured request logs.
 */
@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  /**
   * @param request Incoming Express request.
   * @param response Outgoing Express response.
   * @param next Express continuation callback.
   * @returns Nothing. Mutates request/response state and logs on response completion.
   */
  use(request: ObservabilityRequest, response: Response, next: NextFunction) {
    const requestId = resolveRequestId(request);

    request.requestId = requestId;
    request.startTimeInMs = Date.now();
    response.setHeader(headerNames.xRequestId, requestId);
    response.on('finish', () => {
      const statusCode = response.statusCode;
      const event =
        statusCode >= 400
          ? observabilityEventNames.backendRequestFailed
          : observabilityEventNames.backendRequestCompleted;
      const level = resolveStructuredLogLevel(statusCode);
      const entry = createRequestLog({
        durationInMs: Math.max(Date.now() - (request.startTimeInMs ?? 0), 0),
        event,
        method: request.method,
        operation: resolveOperation(request),
        outcome: resolveStructuredOutcome(statusCode),
        path: resolvePath(request),
        requestId,
        statusCode,
        transport: resolveTransport(request),
      });

      backendLogger[level](entry);
    });

    next();
  }
}
