import { Module } from '@nestjs/common';

import { WeatherModule } from '../integrations/weather/weather.module';
import { LocationsController } from './locations.controller';
import { LocationsResolver } from './locations.resolver';
import { LocationsService } from './locations.service';

@Module({
  imports: [WeatherModule],
  controllers: [LocationsController],
  providers: [LocationsResolver, LocationsService],
})
export class LocationsModule {}
