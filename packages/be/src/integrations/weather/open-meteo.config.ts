export const openMeteoConfig = {
  forecastBaseUrl: 'https://api.open-meteo.com/v1/forecast',
  geocodingBaseUrl: 'https://geocoding-api.open-meteo.com/v1/search',
  marineBaseUrl: 'https://marine-api.open-meteo.com/v1/marine',
  forecastHourlyParams: [
    'cloud_cover',
    'precipitation',
    'snow_depth',
    'snowfall',
    'temperature_2m',
    'uv_index',
    'visibility',
    'weather_code',
    'wind_direction_10m',
    'wind_speed_10m',
  ],
  marineHourlyParams: ['wave_direction', 'wave_height', 'wave_period'],
} as const;
