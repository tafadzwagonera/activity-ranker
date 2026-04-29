import { BadRequestException } from '@nestjs/common';

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';
import { LocationsService } from './locations.service';
import type {
  GeocodingProvider,
  WeatherProvider,
} from '../integrations/weather/weather.types';

const buildRankingResponse = (): RankedActivitiesResponse => ({
  location: {
    latitude: -33.9249,
    longitude: 18.4241,
    name: 'Original Forecast Name',
  },
  days: [
    {
      activities: [
        {
          activity: 'surfing',
          confidence: 0.9,
          reasons: ['Consistent swell.'],
          score: 0.82,
        },
      ],
      date: '2026-04-29',
    },
  ],
});

describe('LocationsService', () => {
  const mockRankActivitiesByCoordinates = jest.fn<
    Promise<RankedActivitiesResponse>,
    [number, number]
  >();
  const mockSearchLocations = jest.fn<
    Promise<LocationSuggestion[]>,
    [string]
  >();

  let service: LocationsService;

  beforeEach(() => {
    mockRankActivitiesByCoordinates.mockReset();
    mockSearchLocations.mockReset();

    const mockWeatherProvider: WeatherProvider = {
      rankActivitiesByCoordinates: mockRankActivitiesByCoordinates,
    };
    const mockGeocodingProvider: GeocodingProvider = {
      searchLocations: mockSearchLocations,
    };

    service = new LocationsService(mockWeatherProvider, mockGeocodingProvider);
  });

  it('trims search queries before forwarding them to the geocoder', async () => {
    mockSearchLocations.mockResolvedValue([]);

    await service.searchLocations('  Cape Town  ');

    expect(mockSearchLocations).toHaveBeenCalledWith('Cape Town');
  });

  it('rejects empty search queries', async () => {
    await expect(service.searchLocations('   ')).rejects.toMatchObject({
      response: {
        code: 'INVALID_QUERY',
        path: '/locations/search',
        statusCode: 400,
      },
    });
  });

  it('forwards coordinate rankings to the weather provider', async () => {
    const mockResponse = buildRankingResponse();
    mockRankActivitiesByCoordinates.mockResolvedValue(mockResponse);

    const result = await service.rankActivitiesByCoordinates({
      latitude: -33.9249,
      longitude: 18.4241,
    });

    expect(result).toBe(mockResponse);
    expect(mockRankActivitiesByCoordinates).toHaveBeenCalledWith(
      -33.9249,
      18.4241,
    );
  });

  it('enriches by-name rankings with geocoded location metadata', async () => {
    mockSearchLocations.mockResolvedValue([
      {
        admin1: 'Western Cape',
        country: 'South Africa',
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: 'Cape Town',
      },
    ]);
    mockRankActivitiesByCoordinates.mockResolvedValue(buildRankingResponse());

    const result = await service.rankActivitiesByName('Cape Town');

    expect(mockRankActivitiesByCoordinates).toHaveBeenCalledWith(
      -33.9249,
      18.4241,
    );
    expect(result.location).toEqual({
      admin1: 'Western Cape',
      country: 'South Africa',
      latitude: -33.9249,
      longitude: 18.4241,
      name: 'Cape Town',
    });
  });

  it('raises a formatted error when a named location cannot be found', async () => {
    mockSearchLocations.mockResolvedValue([]);

    await expect(
      service.rankActivitiesByName('Atlantis'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.rankActivitiesByName('Atlantis'),
    ).rejects.toMatchObject({
      response: {
        code: 'LOCATION_NOT_FOUND',
        message: 'No location match found for "Atlantis".',
        path: '/locations/by-name/Atlantis/rank-activities',
        statusCode: 400,
      },
    });
  });
});
