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
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
    name: string;
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
