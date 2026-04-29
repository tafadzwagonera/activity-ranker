import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';

export type SurfSpot = {
  idealWaveDirection: number;
  latitude: number;
  longitude: number;
  name: string;
  offshoreWindDirection: number;
  waveToleranceDegrees: number;
  windToleranceDegrees: number;
};

export type HourlyForecast = {
  cloudCover: number;
  precipitation: number;
  snowfall: number;
  snowDepth: number;
  temperature2m: number;
  uvIndex: number;
  visibility: number;
  waveDirection: number;
  waveHeight: number;
  wavePeriod: number;
  weatherCode: number;
  windDirection10m: number;
  windSpeed10m: number;
};

export type DailyForecast = {
  date: string;
  hourly: HourlyForecast[];
};

export type RankingInput = {
  dailyForecasts: DailyForecast[];
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  };
  surfSpot?: SurfSpot;
};

export interface WeatherProvider {
  rankActivitiesByCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<RankedActivitiesResponse>;
}

export interface GeocodingProvider {
  searchLocations(query: string): Promise<LocationSuggestion[]>;
}
