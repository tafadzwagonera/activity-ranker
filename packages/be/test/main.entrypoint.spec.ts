import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { INestApplication } from '@nestjs/common';

import { createApp } from '../src/main';

describe('backend entrypoint', () => {
  describe('main.ts', () => {
    it('creates an app that can initialize without listening', async () => {
      const app: INestApplication = await createApp();

      try {
        await app.init();

        expect(app.getHttpServer()).toBeDefined();
      } finally {
        await app.close();
      }
    });
  });

  describe('serverless.yml', () => {
    const serverlessConfigPath = path.resolve(__dirname, '../serverless.yml');
    const serverlessConfig = readFileSync(serverlessConfigPath, 'utf8');

    it('references dist/lambda.handler', () => {
      expect(serverlessConfig).toContain('handler: dist/lambda.handler');
    });

    it('does not configure the serverless-offline bridge', () => {
      expect(serverlessConfig).not.toContain('serverless-offline');
      expect(serverlessConfig).not.toContain('lambdaPort');
    });

    it('allows enough time for by-name ranking requests to finish', () => {
      expect(serverlessConfig).toContain('timeout: 10');
    });
  });
});
