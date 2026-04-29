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
    withEnv({ PORT: undefined });
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
});
