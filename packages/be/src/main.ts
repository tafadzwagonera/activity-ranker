import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { loadBackendRuntimeEnv } from './load-runtime-env';
import { applyLocalAuthDefaults } from './runtime-auth-defaults';

/**
 * Builds the Nest application without binding a network listener.
 *
 * @returns A configured Nest application instance.
 */
export const createApp = async () => {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  return app;
};

/**
 * Starts the Nest application for direct local execution.
 *
 * @returns A promise that resolves once the HTTP listener is active.
 */
export async function bootstrap() {
  loadBackendRuntimeEnv();
  applyLocalAuthDefaults();
  const app = await createApp();
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
