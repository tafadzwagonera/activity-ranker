import { BadRequestException } from '@nestjs/common';

import { coordinatesSchema } from '@activity-ranker/shared';

export const parseCoordinates = (latitude: string, longitude: string) => {
  const parsed = coordinatesSchema.safeParse({
    latitude: Number(latitude),
    longitude: Number(longitude),
  });

  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_COORDINATES',
      message: 'Latitude and longitude must be valid numeric coordinates.',
      path: `/locations/${latitude}/${longitude}/rank-activities`,
      statusCode: 400,
    });
  }

  return parsed.data;
};
