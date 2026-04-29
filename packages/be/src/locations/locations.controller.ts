import { Controller, Get, Param, Query } from '@nestjs/common';

import { LocationsService } from './locations.service';
import { parseCoordinates } from '../common/validation/coordinates';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('search')
  searchLocations(@Query('query') query: string) {
    return this.locationsService.searchLocations(query);
  }

  @Get('by-name/:name/rank-activities')
  rankActivitiesByName(@Param('name') name: string) {
    return this.locationsService.rankActivitiesByName(name);
  }

  @Get(':latitude/:longitude/rank-activities')
  rankActivities(
    @Param('latitude') latitude: string,
    @Param('longitude') longitude: string,
  ) {
    const coordinates = parseCoordinates(latitude, longitude);
    return this.locationsService.rankActivitiesByCoordinates(coordinates);
  }
}
