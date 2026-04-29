import { Injectable } from '@nestjs/common';

import { surfSpots } from './surf-spots.config';
import type { SurfSpot } from './weather.types';

@Injectable()
export class SurfSpotsService {
  resolveNearestSpot(
    latitude: number,
    longitude: number,
  ): SurfSpot | undefined {
    const maxDistanceInKm = 25;

    return surfSpots
      .map((spot) => ({
        distance: this.distanceInKm(
          latitude,
          longitude,
          spot.latitude,
          spot.longitude,
        ),
        spot,
      }))
      .filter(({ distance }) => distance <= maxDistanceInKm)
      .sort((left, right) => left.distance - right.distance)[0]?.spot;
  }

  private distanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusInKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * earthRadiusInKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }
}
