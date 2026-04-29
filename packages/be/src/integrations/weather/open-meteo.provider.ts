import { Injectable } from '@nestjs/common';

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';
import { openMeteoConfig } from './open-meteo.config';
import { RankingService } from './ranking.service';
import { SurfSpotsService } from './surf-spots.service';
import type {
  DailyForecast,
  GeocodingProvider,
  HourlyForecast,
  WeatherProvider,
} from './weather.types';

type OpenMeteoSearchResponse = {
  results?: Array<{
    admin1?: string;
    country?: string;
    id: number;
    latitude: number;
    longitude: number;
    name: string;
  }>;
};

type OpenMeteoHourlyResponse = {
  hourly: {
    cloud_cover?: Array<number | null>;
    precipitation?: Array<number | null>;
    snow_depth?: Array<number | null>;
    snowfall?: Array<number | null>;
    temperature_2m?: Array<number | null>;
    time: string[];
    uv_index?: Array<number | null>;
    visibility?: Array<number | null>;
    wave_direction?: Array<number | null>;
    wave_height?: Array<number | null>;
    wave_period?: Array<number | null>;
    weather_code?: Array<number | null>;
    wind_direction_10m?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
  };
};

@Injectable()
export class OpenMeteoProvider implements WeatherProvider, GeocodingProvider {
  constructor(
    private readonly rankingService: RankingService,
    private readonly surfSpotsService: SurfSpotsService,
  ) {}

  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const url = new URL(openMeteoConfig.geocodingBaseUrl);
    url.searchParams.set('name', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url);
    const payload = (await response.json()) as OpenMeteoSearchResponse;

    return (payload.results ?? []).map((result) => ({
      admin1: result.admin1,
      country: result.country,
      id: result.id,
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    }));
  }

  async rankActivitiesByCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<RankedActivitiesResponse> {
    const forecastUrl = new URL(openMeteoConfig.forecastBaseUrl);
    forecastUrl.searchParams.set('latitude', String(latitude));
    forecastUrl.searchParams.set('longitude', String(longitude));
    forecastUrl.searchParams.set(
      'hourly',
      openMeteoConfig.forecastHourlyParams.join(','),
    );
    forecastUrl.searchParams.set('forecast_days', '7');
    forecastUrl.searchParams.set('timezone', 'auto');

    const marineUrl = new URL(openMeteoConfig.marineBaseUrl);
    marineUrl.searchParams.set('latitude', String(latitude));
    marineUrl.searchParams.set('longitude', String(longitude));
    marineUrl.searchParams.set(
      'hourly',
      openMeteoConfig.marineHourlyParams.join(','),
    );
    marineUrl.searchParams.set('forecast_days', '7');
    marineUrl.searchParams.set('timezone', 'auto');

    const [forecastResponse, marineResponse] = await Promise.all([
      fetch(forecastUrl),
      fetch(marineUrl),
    ]);

    const forecast = (await forecastResponse.json()) as OpenMeteoHourlyResponse;
    const marine = (await marineResponse.json()) as OpenMeteoHourlyResponse;

    return this.rankingService.rankForecast({
      dailyForecasts: this.groupHourlyForecasts(forecast, marine),
      location: {
        latitude,
        longitude,
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      },
      surfSpot: this.surfSpotsService.resolveNearestSpot(latitude, longitude),
    });
  }

  private groupHourlyForecasts(
    forecast: OpenMeteoHourlyResponse,
    marine: OpenMeteoHourlyResponse,
  ): DailyForecast[] {
    const days = new Map<string, HourlyForecast[]>();

    forecast.hourly.time.forEach((timestamp, index) => {
      const date = timestamp.slice(0, 10);
      const existing = days.get(date) ?? [];

      existing.push({
        cloudCover: forecast.hourly.cloud_cover?.[index] ?? 0,
        precipitation: forecast.hourly.precipitation?.[index] ?? 0,
        snowDepth: forecast.hourly.snow_depth?.[index] ?? 0,
        snowfall: forecast.hourly.snowfall?.[index] ?? 0,
        temperature2m: forecast.hourly.temperature_2m?.[index] ?? 0,
        uvIndex: forecast.hourly.uv_index?.[index] ?? 0,
        visibility: forecast.hourly.visibility?.[index] ?? 0,
        waveDirection: marine.hourly.wave_direction?.[index] ?? 0,
        waveHeight: marine.hourly.wave_height?.[index] ?? 0,
        wavePeriod: marine.hourly.wave_period?.[index] ?? 0,
        weatherCode: forecast.hourly.weather_code?.[index] ?? 0,
        windDirection10m: forecast.hourly.wind_direction_10m?.[index] ?? 0,
        windSpeed10m: forecast.hourly.wind_speed_10m?.[index] ?? 0,
      });

      days.set(date, existing);
    });

    return Array.from(days.entries()).map(([date, hourly]) => ({
      date,
      hourly,
    }));
  }
}
