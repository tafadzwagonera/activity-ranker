import { BadRequestException } from '@nestjs/common';

import { parseCoordinates } from './coordinates';

describe('parseCoordinates', () => {
  it('parses valid numeric coordinate strings', () => {
    expect(parseCoordinates('-33.9249', '18.4241')).toEqual({
      latitude: -33.9249,
      longitude: 18.4241,
    });
  });

  it('raises a formatted error for invalid coordinates', () => {
    try {
      parseCoordinates('91', '18.4241');
      fail('Expected invalid coordinates to throw.');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toMatchObject({
        response: {
          code: 'INVALID_COORDINATES',
          message: 'Latitude and longitude must be valid numeric coordinates.',
          path: '/locations/91/18.4241/rank-activities',
          statusCode: 400,
        },
      });
    }
  });
});
