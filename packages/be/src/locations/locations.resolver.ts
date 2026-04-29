import { Args, Query, Resolver } from '@nestjs/graphql';

import { coordinatesSchema } from '@activity-ranker/shared';
import {
  CoordinatesInput,
  LocationNameInput,
  LocationSuggestionDto,
  RankedActivitiesResponseDto,
} from './locations.graphql';
import { LocationsService } from './locations.service';

@Resolver()
export class LocationsResolver {
  constructor(private readonly locationsService: LocationsService) {}

  @Query(() => [LocationSuggestionDto])
  searchLocations(@Args('query') query: string) {
    return this.locationsService.searchLocations(query);
  }

  @Query(() => RankedActivitiesResponseDto)
  rankActivitiesByCoordinates(@Args('input') input: CoordinatesInput) {
    return this.locationsService.rankActivitiesByCoordinates(
      coordinatesSchema.parse(input),
    );
  }

  @Query(() => RankedActivitiesResponseDto)
  rankActivitiesByName(@Args('input') input: LocationNameInput) {
    return this.locationsService.rankActivitiesByName(input.name);
  }
}
