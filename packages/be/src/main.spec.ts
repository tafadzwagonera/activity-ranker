import { applyLocalAuthDefaults } from './runtime-auth-defaults';

const mockEnableCors = jest.fn();
const mockListen = jest.fn();
const mockNestFactoryCreate = jest.fn(() =>
  Promise.resolve({
    enableCors: mockEnableCors,
    listen: mockListen,
  }),
);

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: mockNestFactoryCreate,
  },
}));

const withEnv = (overrides: Record<string, string | undefined>) => {
  const nextEnv = { ...process.env };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete nextEnv[key];
      continue;
    }

    nextEnv[key] = value;
  }

  jest.replaceProperty(process, 'env', nextEnv);
};

describe('main bootstrap', () => {
  beforeEach(() => {
    mockEnableCors.mockReset();
    mockListen.mockReset();
    mockNestFactoryCreate.mockClear();
    jest.resetModules();
    withEnv({
      API_KEY_INTERNAL_VALUES: undefined,
      API_KEY_PUBLIC_VALUES: undefined,
      NODE_ENV: undefined,
      PORT: undefined,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the app and enables cors', async () => {
    // Jest in this repo runs CommonJS test modules, so require is the stable option here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createApp } = require('./main') as typeof import('./main');

    const app = await createApp();

    expect(app).toBeDefined();
    expect(mockNestFactoryCreate).toHaveBeenCalledTimes(1);
    expect(mockEnableCors).toHaveBeenCalledTimes(1);
  });

  it('boots on the configured port', async () => {
    withEnv({ PORT: '4010' });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bootstrap } = require('./main') as typeof import('./main');

    await bootstrap();

    expect(mockListen).toHaveBeenCalledWith(4010);
  });

  it('boots on the default port when PORT is unset', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bootstrap } = require('./main') as typeof import('./main');

    await bootstrap();

    expect(mockListen).toHaveBeenCalledWith(3000);
  });

  it('applies documented auth defaults for local startup when env values are unset', () => {
    applyLocalAuthDefaults();

    expect(process.env.API_KEY_PUBLIC_VALUES).toBe('public-dev-key');
    expect(process.env.API_KEY_INTERNAL_VALUES).toBe('internal-dev-key');
  });

  it('does not apply auth defaults in production mode', () => {
    withEnv({ NODE_ENV: 'production' });
    applyLocalAuthDefaults();

    expect(process.env.API_KEY_PUBLIC_VALUES).toBeUndefined();
    expect(process.env.API_KEY_INTERNAL_VALUES).toBeUndefined();
  });
});
