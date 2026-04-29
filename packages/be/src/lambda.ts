import 'reflect-metadata';

import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';
import type { Express } from 'express';

import { createApp } from './main';

let cachedHandler: Handler | undefined;

/**
 * Creates the cached Lambda handler bridge for the Nest Express app.
 *
 * @returns A Lambda-compatible request handler.
 */
const createHandler = async (): Promise<Handler> => {
  const app = await createApp();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  const lambdaHandler = serverlessExpress({ app: expressApp }) as unknown;

  return lambdaHandler as Handler;
};

/**
 * Handles Lambda invocations through the shared Nest application instance.
 *
 * @param event - The incoming Lambda event payload.
 * @param context - The Lambda execution context.
 * @param callback - The Lambda completion callback.
 * @returns The Lambda response payload.
 */
export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await createHandler();
  // serverless-express exposes an any-typed bridge even though the runtime contract is a Lambda handler.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const response: Awaited<ReturnType<Handler>> = await cachedHandler(
    event,
    context,
    callback,
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response;
};
