import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type {
  Coordinates,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';
import {
  GEOCODING_PROVIDER,
  WEATHER_PROVIDER,
} from '../integrations/weather/weather.constants';
import type {
  GeocodingProvider,
  WeatherProvider,
} from '../integrations/weather/weather.types';

@Injectable()
export class LocationsService {
  constructor(
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
  ) {}

  async searchLocations(query: string) {
    if (!query?.trim()) {
      throw new BadRequestException({
        code: 'INVALID_QUERY',
        message: 'Location search requires a non-empty query string.',
        path: '/locations/search',
        statusCode: 400,
      });
    }

    return this.geocodingProvider.searchLocations(query.trim());
  }

  rankActivitiesByCoordinates(
    coordinates: Coordinates,
  ): Promise<RankedActivitiesResponse> {
    return this.weatherProvider.rankActivitiesByCoordinates(
      coordinates.latitude,
      coordinates.longitude,
    );
  }

  async rankActivitiesByName(name: string): Promise<RankedActivitiesResponse> {
    const [location] = await this.searchLocations(name);

    if (!location) {
      throw new BadRequestException({
        code: 'LOCATION_NOT_FOUND',
        message: `No location match found for "${name}".`,
        path: `/locations/by-name/${name}/rank-activities`,
        statusCode: 400,
      });
    }

    const result = await this.rankActivitiesByCoordinates({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    return {
      ...result,
      location: {
        ...result.location,
        admin1: location.admin1,
        country: location.country,
        name: location.name,
      },
    };
  }
}
