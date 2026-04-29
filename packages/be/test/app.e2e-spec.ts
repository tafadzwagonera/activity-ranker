import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import {
  GEOCODING_PROVIDER,
  WEATHER_PROVIDER,
} from '../src/integrations/weather/weather.constants';
import type {
  GeocodingProvider,
  WeatherProvider,
} from '../src/integrations/weather/weather.types';
import {
  headerNames,
  type LocationSuggestion,
  type RankedActivitiesResponse,
} from '@activity-ranker/shared';
import { backendLogger } from '../src/common/observability/backend-logger';

const mockWeatherProvider: WeatherProvider = {
  rankActivitiesByCoordinates(latitude, longitude) {
    const today = new Date().toISOString().slice(0, 10);

    return Promise.resolve({
      location: {
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
      },
      days: [
        {
          date: today,
          activities: [
            {
              activity: 'surfing',
              score: 0.82,
              confidence: 0.91,
              reasons: ['Matched nearby surf spot Muizenberg.'],
            },
            {
              activity: 'outdoorSightseeing',
              score: 0.74,
              confidence: 0.86,
              reasons: ['Dry morning and moderate wind speeds.'],
            },
            {
              activity: 'indoorSightseeing',
              score: 0.21,
              confidence: 0.64,
              reasons: ['Outdoor conditions are favorable instead.'],
            },
            {
              activity: 'skiing',
              score: 0.02,
              confidence: 0.94,
              reasons: ['No snow-supporting conditions detected.'],
            },
          ],
        },
        {
          date: '2099-12-31',
          activities: [
            {
              activity: 'outdoorSightseeing',
              score: 0.61,
              confidence: 0.76,
              reasons: ['Steady outlook for sightseeing.'],
            },
          ],
        },
      ],
    });
  },
};

const mockGeocodingProvider: GeocodingProvider = {
  searchLocations(query) {
    return Promise.resolve([
      {
        id: 1,
        name: query,
        latitude: -33.9249,
        longitude: 18.4241,
        country: 'South Africa',
        admin1: 'Western Cape',
      },
    ]);
  },
};

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

describe('App e2e', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let mockInfoLog: jest.SpyInstance;

  beforeAll(async () => {
    withEnv({
      API_KEY_PUBLIC_VALUES: 'public-test-key',
      API_KEY_INTERNAL_VALUES: 'internal-test-key',
      AUTH_WHITELIST_PATH_PREFIXES: '/health',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WEATHER_PROVIDER)
      .useValue(mockWeatherProvider)
      .overrideProvider(GEOCODING_PROVIDER)
      .useValue(mockGeocodingProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
  });

  beforeEach(() => {
    mockInfoLog = jest
      .spyOn(backendLogger, 'info')
      .mockImplementation(() => backendLogger);
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    mockInfoLog.mockRestore();
  });

  it('serves health without auth', async () => {
    await request(server).get('/health').expect(200);
  });

  it('preserves request correlation headers on REST responses', async () => {
    const response = await request(server)
      .get('/health')
      .set(headerNames.xRequestId, 'request-123')
      .expect(200);

    expect(response.headers[headerNames.xRequestId]).toBe('request-123');
    expect(mockInfoLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'backend_request_completed',
        method: 'GET',
        path: '/health',
        requestId: 'request-123',
        statusCode: 200,
        transport: 'rest',
      }),
    );
  });

  it('rejects requests without a supported auth header', async () => {
    await request(server).get('/locations/search?query=Cape').expect(401);
  });

  it('searches locations via REST', async () => {
    const response = await request(server)
      .get('/locations/search?query=Cape Town')
      .set(headerNames.xApiKey, 'public-test-key')
      .expect(200);

    const body = response.body as LocationSuggestion[];

    expect(body[0]?.name).toBe('Cape Town');
  });

  it('accepts XInternalKey on location search routes', async () => {
    const response = await request(server)
      .get('/locations/search?query=Cape Town')
      .set(headerNames.xInternalKey, 'internal-test-key')
      .expect(200);

    const body = response.body as LocationSuggestion[];

    expect(body[0]?.name).toBe('Cape Town');
  });

  it('validates coordinate params', async () => {
    await request(server)
      .get('/locations/181/18.4/rank-activities')
      .set(headerNames.xApiKey, 'public-test-key')
      .expect(400);
  });

  it('returns rankings via REST', async () => {
    const response = await request(server)
      .get('/locations/-33.9249/18.4241/rank-activities')
      .set(headerNames.xApiKey, 'public-test-key')
      .expect(200);

    const body = response.body as RankedActivitiesResponse;

    expect(body.location.name).toBe('-33.9249, 18.4241');
    expect(body.days[0]?.date).toBe(new Date().toISOString().slice(0, 10));
    expect(body.days[0]?.activities[0]?.activity).toBe('surfing');
  });

  it('returns rankings via GraphQL with XApiKey', async () => {
    const response = await request(server)
      .post('/graphql')
      .set(headerNames.xApiKey, 'public-test-key')
      .send({
        query: `
          query RankActivities($input: CoordinatesInput!) {
            rankActivitiesByCoordinates(input: $input) {
              location {
                name
              }
              days {
                date
                activities {
                  activity
                  score
                  confidence
                }
              }
            }
          }
        `,
        variables: {
          input: {
            latitude: -33.9249,
            longitude: 18.4241,
          },
        },
      })
      .expect(200);

    const body = response.body as {
      data: {
        rankActivitiesByCoordinates: RankedActivitiesResponse;
      };
    };

    expect(body.data.rankActivitiesByCoordinates.location.name).toBe(
      '-33.9249, 18.4241',
    );
  });

  it('returns rankings via GraphQL with XInternalKey', async () => {
    const response = await request(server)
      .post('/graphql')
      .set(headerNames.xInternalKey, 'internal-test-key')
      .send({
        query: `
          query RankActivities($input: CoordinatesInput!) {
            rankActivitiesByCoordinates(input: $input) {
              location {
                name
              }
            }
          }
        `,
        variables: {
          input: {
            latitude: -33.9249,
            longitude: 18.4241,
          },
        },
      })
      .expect(200);

    const body = response.body as {
      data: {
        rankActivitiesByCoordinates: RankedActivitiesResponse;
      };
    };

    expect(body.data.rankActivitiesByCoordinates.location.name).toBe(
      '-33.9249, 18.4241',
    );
  });

  it('returns by-name rankings with enriched location metadata', async () => {
    const response = await request(server)
      .get('/locations/by-name/Cape Town/rank-activities')
      .set(headerNames.xApiKey, 'public-test-key')
      .expect(200);

    const body = response.body as RankedActivitiesResponse;

    expect(body.location).toEqual({
      admin1: 'Western Cape',
      country: 'South Africa',
      latitude: -33.9249,
      longitude: 18.4241,
      name: 'Cape Town',
    });
  });

  it('preserves request correlation headers on GraphQL responses', async () => {
    const response = await request(server)
      .post('/graphql')
      .set(headerNames.xInternalKey, 'internal-test-key')
      .set(headerNames.xRequestId, 'request-graphql-123')
      .send({
        query: `
          query RankActivities($input: CoordinatesInput!) {
            rankActivitiesByCoordinates(input: $input) {
              location {
                name
              }
            }
          }
        `,
        variables: {
          input: {
            latitude: -33.9249,
            longitude: 18.4241,
          },
        },
      })
      .expect(200);

    expect(response.headers[headerNames.xRequestId]).toBe(
      'request-graphql-123',
    );
    expect(mockInfoLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'backend_request_completed',
        method: 'POST',
        path: '/graphql',
        requestId: 'request-graphql-123',
        statusCode: 200,
        transport: 'graphql',
      }),
    );
  });
});
