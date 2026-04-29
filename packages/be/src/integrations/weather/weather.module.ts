import { Module } from '@nestjs/common';

import { GEOCODING_PROVIDER, WEATHER_PROVIDER } from './weather.constants';
import { OpenMeteoProvider } from './open-meteo.provider';
import { RankingService } from './ranking.service';
import { SurfSpotsService } from './surf-spots.service';

@Module({
  providers: [
    OpenMeteoProvider,
    RankingService,
    SurfSpotsService,
    {
      provide: WEATHER_PROVIDER,
      useExisting: OpenMeteoProvider,
    },
    {
      provide: GEOCODING_PROVIDER,
      useExisting: OpenMeteoProvider,
    },
  ],
  exports: [GEOCODING_PROVIDER, WEATHER_PROVIDER],
})
export class WeatherModule {}
