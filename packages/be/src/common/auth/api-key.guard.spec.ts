import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { headerNames } from '@activity-ranker/shared';
import { ApiKeyGuard } from './api-key.guard';

type MockRequest = {
  header: (name: string) => string | undefined;
  path?: string;
  url?: string;
};

const createHttpContext = (request: MockRequest): ExecutionContext =>
  ({
    getType: jest.fn(() => 'http'),
    switchToHttp: jest.fn(() => ({
      getRequest: () => request,
    })),
  }) as unknown as ExecutionContext;

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

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(() => {
    guard = new ApiKeyGuard();
    withEnv({
      API_KEY_PUBLIC_VALUES: 'public-a, public-b',
      API_KEY_INTERNAL_VALUES: 'internal-a, internal-b',
      AUTH_WHITELIST_PATH_PREFIXES: '/health, /docs',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows whitelisted paths without credentials', () => {
    const request: MockRequest = {
      header: () => undefined,
      path: '/health/live',
    };

    expect(guard.canActivate(createHttpContext(request))).toBe(true);
  });

  it('accepts a valid public api key', () => {
    const request: MockRequest = {
      header: (name) => (name === headerNames.xApiKey ? 'public-b' : undefined),
      path: '/locations/search',
    };

    expect(guard.canActivate(createHttpContext(request))).toBe(true);
  });

  it('accepts a valid internal api key', () => {
    const request: MockRequest = {
      header: (name) =>
        name === headerNames.xInternalKey ? 'internal-a' : undefined,
      url: '/graphql',
    };

    expect(guard.canActivate(createHttpContext(request))).toBe(true);
  });

  it('reads graphql requests from the gql execution context', () => {
    const request: MockRequest = {
      header: (name) =>
        name === headerNames.xInternalKey ? 'internal-b' : undefined,
      path: '/graphql',
    };
    const mockGraphqlContext = {
      getType: jest.fn(() => 'graphql'),
    } as unknown as ExecutionContext;
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: request }),
    } as never);

    expect(guard.canActivate(mockGraphqlContext)).toBe(true);
  });

  it('rejects requests with invalid credentials', () => {
    const request: MockRequest = {
      header: () => 'wrong-key',
      path: '/locations/search',
    };

    try {
      guard.canActivate(createHttpContext(request));
      fail('Expected guard to reject invalid credentials.');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchObject({
        response: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized: invalid credentials',
          path: '/locations/search',
          statusCode: 401,
        },
      });
    }
  });

  it('falls back to the root path when neither path nor url is present', () => {
    withEnv({
      API_KEY_PUBLIC_VALUES: '',
      API_KEY_INTERNAL_VALUES: '',
      AUTH_WHITELIST_PATH_PREFIXES: '',
    });

    try {
      guard.canActivate(
        createHttpContext({
          header: () => undefined,
        }),
      );
      fail('Expected guard to reject missing credentials.');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          path: '/',
          statusCode: 401,
        },
      });
    }
  });

  it('treats missing auth env values as empty credential lists', () => {
    withEnv({
      API_KEY_PUBLIC_VALUES: undefined,
      API_KEY_INTERNAL_VALUES: undefined,
      AUTH_WHITELIST_PATH_PREFIXES: undefined,
    });

    expect(() =>
      guard.canActivate(
        createHttpContext({
          header: () => undefined,
          path: '/locations/search',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('defaults to allowing health checks when whitelist env values are missing', () => {
    withEnv({
      API_KEY_PUBLIC_VALUES: undefined,
      API_KEY_INTERNAL_VALUES: undefined,
      AUTH_WHITELIST_PATH_PREFIXES: undefined,
    });

    expect(
      guard.canActivate(
        createHttpContext({
          header: () => undefined,
          path: '/health',
        }),
      ),
    ).toBe(true);
  });
});
