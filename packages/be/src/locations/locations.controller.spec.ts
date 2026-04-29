import type { RankedActivitiesResponse } from '@activity-ranker/shared';

import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

describe('LocationsController', () => {
  const mockSearchLocations = jest.fn();
  const mockRankActivitiesByCoordinates = jest.fn();
  const mockRankActivitiesByName = jest.fn();

  let controller: LocationsController;

  beforeEach(() => {
    mockSearchLocations.mockReset();
    mockRankActivitiesByCoordinates.mockReset();
    mockRankActivitiesByName.mockReset();

    controller = new LocationsController({
      rankActivitiesByCoordinates: mockRankActivitiesByCoordinates,
      rankActivitiesByName: mockRankActivitiesByName,
      searchLocations: mockSearchLocations,
    } as unknown as LocationsService);
  });

  it('forwards location searches to the service', async () => {
    mockSearchLocations.mockResolvedValue([{ id: 1, name: 'Cape Town' }]);

    await controller.searchLocations('Cape Town');

    expect(mockSearchLocations).toHaveBeenCalledWith('Cape Town');
  });

  it('parses rest coordinates before ranking via the service', async () => {
    const response: RankedActivitiesResponse = {
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: 'Cape Town',
      },
      days: [],
    };
    mockRankActivitiesByCoordinates.mockResolvedValue(response);

    const result = await controller.rankActivities('-33.9249', '18.4241');

    expect(result).toBe(response);
    expect(mockRankActivitiesByCoordinates).toHaveBeenCalledWith({
      latitude: -33.9249,
      longitude: 18.4241,
    });
  });

  it('forwards by-name rankings to the service', async () => {
    mockRankActivitiesByName.mockResolvedValue({
      days: [],
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: 'Cape Town',
      },
    });

    await controller.rankActivitiesByName('Cape Town');

    expect(mockRankActivitiesByName).toHaveBeenCalledWith('Cape Town');
  });
});
