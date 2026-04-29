import type { Handler } from 'aws-lambda';

const mockEnableCors = jest.fn();
const mockInit = jest.fn();
const mockGetInstance = jest.fn(() => 'express-app');
const mockGetHttpAdapter = jest.fn(() => ({
  getInstance: mockGetInstance,
}));
const mockNestFactoryCreate = jest.fn(() =>
  Promise.resolve({
    enableCors: mockEnableCors,
    getHttpAdapter: mockGetHttpAdapter,
    init: mockInit,
  }),
);
const mockLambdaHandler = jest.fn(() => Promise.resolve({ statusCode: 200 }));
const mockServerlessExpress = jest.fn(() => mockLambdaHandler);

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: mockNestFactoryCreate,
  },
}));

jest.mock('@codegenie/serverless-express', () => ({
  __esModule: true,
  default: mockServerlessExpress,
}));

describe('lambda handler', () => {
  beforeEach(() => {
    mockEnableCors.mockReset();
    mockInit.mockReset();
    mockGetInstance.mockClear();
    mockGetHttpAdapter.mockClear();
    mockNestFactoryCreate.mockClear();
    mockLambdaHandler.mockClear();
    mockServerlessExpress.mockClear();
    jest.resetModules();
  });

  it('initializes serverless express once and reuses the cached handler', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const handler: Handler = (require('./lambda') as { handler: Handler })
      .handler;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const event = {} as Parameters<Handler>[0];
    const context = {} as Parameters<Handler>[1];
    const callback = jest.fn() as Parameters<Handler>[2];

    await handler(event, context, callback);
    await handler(event, context, callback);

    expect(mockNestFactoryCreate).toHaveBeenCalledTimes(1);
    expect(mockEnableCors).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockServerlessExpress).toHaveBeenCalledWith({ app: 'express-app' });
    expect(mockLambdaHandler).toHaveBeenCalledTimes(2);
  });
});
