import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';

import { OpenMeteoProvider } from './open-meteo.provider';
import type { DailyForecast, RankingInput, SurfSpot } from './weather.types';

const createForecastPayload = () => ({
  hourly: {
    cloud_cover: [25, 55],
    precipitation: [0.1, 0.4],
    snow_depth: [0, 0],
    snowfall: [0, 0],
    temperature_2m: [22, 20],
    time: ['2026-04-29T00:00', '2026-04-29T01:00'],
    uv_index: [5, 3],
    visibility: [10000, 9000],
    weather_code: [1, 2],
    wind_direction_10m: [90, 100],
    wind_speed_10m: [12, 14],
  },
});

const createMarinePayload = () => ({
  hourly: {
    time: ['2026-04-29T00:00', '2026-04-29T01:00'],
    wave_direction: [180, 182],
    wave_height: [1.2, 1.4],
    wave_period: [10, 11],
  },
});

const createMockResponse = (body: unknown): Response =>
  ({
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('OpenMeteoProvider', () => {
  const mockRankForecast = jest.fn<RankedActivitiesResponse, [RankingInput]>();
  const mockResolveNearestSpot = jest.fn<
    SurfSpot | undefined,
    [number, number]
  >();
  const mockFetch = jest.fn<Promise<Response>, [URL]>();

  let provider: OpenMeteoProvider;

  beforeEach(() => {
    mockRankForecast.mockReset();
    mockResolveNearestSpot.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;

    provider = new OpenMeteoProvider(
      {
        rankForecast: mockRankForecast,
      } as never,
      {
        resolveNearestSpot: mockResolveNearestSpot,
      } as never,
    );
  });

  it('maps geocoding responses into shared location suggestions', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        results: [
          {
            admin1: 'Western Cape',
            country: 'South Africa',
            id: 1,
            latitude: -33.9249,
            longitude: 18.4241,
            name: 'Cape Town',
          },
        ],
      }),
    );

    const results = await provider.searchLocations('Cape Town');

    expect(results).toEqual<LocationSuggestion[]>([
      {
        admin1: 'Western Cape',
        country: 'South Africa',
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: 'Cape Town',
      },
    ]);
    expect(mockFetch.mock.calls[0]?.[0].toString()).toContain('name=Cape+Town');
  });

  it('returns an empty array when geocoding yields no results', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}));

    await expect(provider.searchLocations('Unknown')).resolves.toEqual([]);
  });

  it('groups forecast and marine data before ranking the response', async () => {
    const mockResponse: RankedActivitiesResponse = {
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: 'Cape Town',
      },
      days: [],
    };
    mockResolveNearestSpot.mockReturnValue({
      idealWaveDirection: 180,
      latitude: -34.107,
      longitude: 18.47,
      name: 'Muizenberg',
      offshoreWindDirection: 315,
      waveToleranceDegrees: 75,
      windToleranceDegrees: 60,
    });
    mockFetch
      .mockResolvedValueOnce(createMockResponse(createForecastPayload()))
      .mockResolvedValueOnce(createMockResponse(createMarinePayload()));
    mockRankForecast.mockReturnValue(mockResponse);

    const result = await provider.rankActivitiesByCoordinates(
      -33.9249,
      18.4241,
    );

    expect(result).toBe(mockResponse);
    expect(mockResolveNearestSpot).toHaveBeenCalledWith(-33.9249, 18.4241);
    expect(mockRankForecast).toHaveBeenCalledWith({
      dailyForecasts: [
        {
          date: '2026-04-29',
          hourly: [
            {
              cloudCover: 25,
              precipitation: 0.1,
              snowDepth: 0,
              snowfall: 0,
              temperature2m: 22,
              uvIndex: 5,
              visibility: 10000,
              waveDirection: 180,
              waveHeight: 1.2,
              wavePeriod: 10,
              weatherCode: 1,
              windDirection10m: 90,
              windSpeed10m: 12,
            },
            {
              cloudCover: 55,
              precipitation: 0.4,
              snowDepth: 0,
              snowfall: 0,
              temperature2m: 20,
              uvIndex: 3,
              visibility: 9000,
              waveDirection: 182,
              waveHeight: 1.4,
              wavePeriod: 11,
              weatherCode: 2,
              windDirection10m: 100,
              windSpeed10m: 14,
            },
          ],
        },
      ] satisfies DailyForecast[],
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: '-33.9249, 18.4241',
      },
      surfSpot: {
        idealWaveDirection: 180,
        latitude: -34.107,
        longitude: 18.47,
        name: 'Muizenberg',
        offshoreWindDirection: 315,
        waveToleranceDegrees: 75,
        windToleranceDegrees: 60,
      },
    });
  });

  it('fills missing hourly values with zeros before ranking', async () => {
    mockResolveNearestSpot.mockReturnValue(undefined);
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          hourly: {
            time: ['2026-04-29T00:00'],
          },
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          hourly: {
            time: ['2026-04-29T00:00'],
          },
        }),
      );
    mockRankForecast.mockReturnValue({
      days: [],
      location: {
        latitude: 0,
        longitude: 0,
        name: 'Fallback',
      },
    });

    await provider.rankActivitiesByCoordinates(1, 2);

    expect(mockRankForecast).toHaveBeenCalledWith({
      dailyForecasts: [
        {
          date: '2026-04-29',
          hourly: [
            {
              cloudCover: 0,
              precipitation: 0,
              snowDepth: 0,
              snowfall: 0,
              temperature2m: 0,
              uvIndex: 0,
              visibility: 0,
              waveDirection: 0,
              waveHeight: 0,
              wavePeriod: 0,
              weatherCode: 0,
              windDirection10m: 0,
              windSpeed10m: 0,
            },
          ],
        },
      ],
      location: {
        latitude: 1,
        longitude: 2,
        name: '1.0000, 2.0000',
      },
      surfSpot: undefined,
    });
  });
});
