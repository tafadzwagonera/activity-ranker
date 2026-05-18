import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadBackendRuntimeEnv,
  resolveBackendEnvFilePaths,
} from './load-runtime-env';

const createMockEnvDir = () => mkdtempSync(join(tmpdir(), 'be-env-'));

describe('loadBackendRuntimeEnv', () => {
  it('layers repo and package env files without overriding shell env', () => {
    const tempDir = createMockEnvDir();
    const repoEnvPath = join(tempDir, '.env');
    const packageEnvPath = join(tempDir, 'packages.be.env');
    const repoLocalEnvPath = join(tempDir, '.env.local');
    const packageLocalEnvPath = join(tempDir, 'packages.be.env.local');

    writeFileSync(
      repoEnvPath,
      ['API_KEY_INTERNAL_VALUES=repo-internal', 'PORT=3100'].join('\n'),
    );
    writeFileSync(
      packageEnvPath,
      ['API_KEY_INTERNAL_VALUES=package-internal', 'LOG_LEVEL=debug'].join(
        '\n',
      ),
    );
    writeFileSync(
      repoLocalEnvPath,
      ['API_KEY_INTERNAL_VALUES=repo-local-internal'].join('\n'),
    );
    writeFileSync(
      packageLocalEnvPath,
      ['API_KEY_INTERNAL_VALUES=package-local-internal'].join('\n'),
    );

    const runtimeEnv: NodeJS.ProcessEnv = {
      PORT: '4200',
    };

    loadBackendRuntimeEnv({
      envFilePaths: [
        repoEnvPath,
        packageEnvPath,
        repoLocalEnvPath,
        packageLocalEnvPath,
      ],
      runtimeEnv,
    });

    expect(runtimeEnv.API_KEY_INTERNAL_VALUES).toBe('package-local-internal');
    expect(runtimeEnv.LOG_LEVEL).toBe('debug');
    expect(runtimeEnv.PORT).toBe('4200');

    rmSync(tempDir, { force: true, recursive: true });
  });

  it('returns repo-first and package-last default env path precedence', () => {
    expect(resolveBackendEnvFilePaths()).toHaveLength(4);
    expect(resolveBackendEnvFilePaths()[0]).toMatch(/\.env$/);
    expect(resolveBackendEnvFilePaths()[3]).toMatch(
      /packages\/be\/\.env\.local$/,
    );
  });
});
