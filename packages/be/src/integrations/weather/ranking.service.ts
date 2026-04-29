import { Injectable } from '@nestjs/common';

import type {
  ActivityId,
  ActivityScore,
  RankedActivitiesResponse,
} from '@activity-ranker/shared';
import { activityIds } from '@activity-ranker/shared';
import type { HourlyForecast, RankingInput, SurfSpot } from './weather.types';

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

@Injectable()
export class RankingService {
  rankForecast(input: RankingInput): RankedActivitiesResponse {
    return {
      location: input.location,
      days: input.dailyForecasts
        .slice()
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((day) => ({
          date: day.date,
          activities: activityIds
            .map((activity) =>
              this.rankActivity(activity, day.hourly, input.surfSpot),
            )
            .sort((left, right) => right.score - left.score),
        })),
    };
  }

  private rankActivity(
    activity: ActivityId,
    hourlyForecasts: HourlyForecast[],
    surfSpot?: SurfSpot,
  ): ActivityScore {
    const hourlyScores = hourlyForecasts.map((hourly) =>
      this.scoreHourForActivity(activity, hourly, surfSpot),
    );
    const average = this.average(hourlyScores);
    const volatility = this.standardDeviation(hourlyScores);
    const reasons = this.buildReasons(activity, hourlyForecasts, surfSpot);
    const baseConfidence = clamp(1 - volatility, 0.35, 0.98);
    const confidence =
      activity === 'surfing' && !surfSpot
        ? clamp(baseConfidence - 0.31)
        : baseConfidence;

    return {
      activity,
      confidence: Number(confidence.toFixed(2)),
      reasons,
      score: Number(average.toFixed(2)),
    };
  }

  private buildReasons(
    activity: ActivityId,
    hourlyForecasts: HourlyForecast[],
    surfSpot?: SurfSpot,
  ): string[] {
    const reasons: string[] = [];
    const precipitationPeak = Math.max(
      ...hourlyForecasts.map((hour) => hour.precipitation),
    );
    const maxWind = Math.max(
      ...hourlyForecasts.map((hour) => hour.windSpeed10m),
    );
    const meanTemperature = this.average(
      hourlyForecasts.map((hour) => hour.temperature2m),
    );

    if (activity === 'surfing' && surfSpot) {
      reasons.push(`Matched nearby surf spot ${surfSpot.name}.`);
    }

    if (activity === 'surfing' && !surfSpot) {
      reasons.push(
        'No nearby configured surf spot, so surfing confidence is reduced.',
      );
    }

    if (activity === 'outdoorSightseeing' && precipitationPeak > 4) {
      reasons.push(
        'At least one hourly rain window weakens outdoor reliability.',
      );
    }

    if (activity === 'skiing' && meanTemperature > 2) {
      reasons.push('Temperatures are too warm to strongly support skiing.');
    }

    if (activity === 'indoorSightseeing' && precipitationPeak > 2) {
      reasons.push('Wet conditions improve indoor activity desirability.');
    }

    if (!reasons.length) {
      reasons.push(
        maxWind > 25
          ? 'Stronger winds add uncertainty across the day.'
          : 'Hourly conditions remain reasonably consistent through the day.',
      );
    }

    return reasons;
  }

  private scoreHourForActivity(
    activity: ActivityId,
    hourly: HourlyForecast,
    surfSpot?: SurfSpot,
  ) {
    switch (activity) {
      case 'skiing':
        return this.weightedScore(
          {
            snowDepth: this.rangeScore(hourly.snowDepth, [30, 200]),
            snowfall: this.rangeScore(hourly.snowfall, [1, 10]),
            temperature2m: this.rangeScore(hourly.temperature2m, [-12, -2]),
            visibility: this.minScore(hourly.visibility, 5000, 10000),
            windSpeed10m: this.maxScore(hourly.windSpeed10m, 12, 30),
          },
          {
            snowDepth: 0.3,
            snowfall: 0.2,
            temperature2m: 0.2,
            visibility: 0.15,
            windSpeed10m: 0.15,
          },
        );
      case 'surfing': {
        const waveDirectionScore = surfSpot
          ? this.angleScore(
              hourly.waveDirection,
              surfSpot.idealWaveDirection,
              surfSpot.waveToleranceDegrees,
            )
          : 0.5;
        const windDirectionScore = surfSpot
          ? this.angleScore(
              hourly.windDirection10m,
              surfSpot.offshoreWindDirection,
              surfSpot.windToleranceDegrees,
            )
          : 0.5;

        const baseSurfingScore = this.weightedScore(
          {
            temperature2m: this.rangeScore(hourly.temperature2m, [18, 30]),
            waveDirection: waveDirectionScore,
            waveHeight: this.rangeScore(hourly.waveHeight, [1, 3]),
            wavePeriod: this.minScore(hourly.wavePeriod, 8, 14),
            windDirection10m: windDirectionScore,
            windSpeed10m: this.maxScore(hourly.windSpeed10m, 10, 24),
          },
          {
            temperature2m: 0.08,
            waveDirection: 0.16,
            waveHeight: 0.3,
            wavePeriod: 0.18,
            windDirection10m: 0.12,
            windSpeed10m: 0.16,
          },
        );

        return surfSpot ? clamp(baseSurfingScore + 0.08) : baseSurfingScore;
      }
      case 'outdoorSightseeing':
        return this.weightedScore(
          {
            cloudCover: this.rangeScore(hourly.cloudCover, [15, 55]),
            precipitation: this.maxScore(hourly.precipitation, 1, 8),
            temperature2m: this.rangeScore(hourly.temperature2m, [18, 26]),
            uvIndex: this.maxScore(hourly.uvIndex, 6, 11),
            visibility: this.minScore(hourly.visibility, 8000, 15000),
            windSpeed10m: this.maxScore(hourly.windSpeed10m, 10, 24),
          },
          {
            precipitation: 0.3,
            temperature2m: 0.24,
            visibility: 0.18,
            cloudCover: 0.12,
            uvIndex: 0.08,
            windSpeed10m: 0.08,
          },
        );
      case 'indoorSightseeing':
        return this.weightedScore(
          {
            precipitation: this.minScore(hourly.precipitation, 1.5, 8),
            temperature2m: this.outsideDiscomfortScore(
              hourly.temperature2m,
              15,
              30,
            ),
            windSpeed10m: this.minScore(hourly.windSpeed10m, 12, 30),
          },
          {
            precipitation: 0.45,
            temperature2m: 0.35,
            windSpeed10m: 0.2,
          },
        );
    }
  }

  private weightedScore(
    parts: Record<string, number>,
    weights: Record<string, number>,
  ) {
    const total = Object.entries(weights).reduce(
      (sum, [key, weight]) => sum + (parts[key] ?? 0) * weight,
      0,
    );
    const weightTotal = Object.values(weights).reduce(
      (sum, value) => sum + value,
      0,
    );
    return clamp(total / weightTotal);
  }

  private rangeScore(
    value: number,
    [min, max]: readonly [number, number],
    tolerance = 0.5,
  ) {
    if (value >= min && value <= max) {
      return 1;
    }

    const width = max - min;
    const buffer = Math.max(width * tolerance, 1);

    if (value < min) {
      return clamp(1 - (min - value) / buffer);
    }

    return clamp(1 - (value - max) / buffer);
  }

  private minScore(value: number, minimum: number, ideal: number) {
    if (value >= ideal) {
      return 1;
    }

    if (value <= 0) {
      return 0;
    }

    return clamp((value - minimum) / Math.max(ideal - minimum, 1));
  }

  private maxScore(value: number, maximum: number, zeroAt: number) {
    if (value <= maximum) {
      return 1;
    }

    if (value >= zeroAt) {
      return 0;
    }

    return clamp(1 - (value - maximum) / (zeroAt - maximum));
  }

  private outsideDiscomfortScore(value: number, low: number, high: number) {
    if (value < low) {
      return clamp((low - value) / 10);
    }

    if (value > high) {
      return clamp((value - high) / 10);
    }

    return 0.15;
  }

  private angleScore(actual: number, ideal: number, tolerance: number) {
    return clamp(1 - this.angleDifference(actual, ideal) / tolerance);
  }

  private angleDifference(left: number, right: number) {
    const diff = Math.abs(left - right) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  private average(values: number[]) {
    return values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  }

  private standardDeviation(values: number[]) {
    const mean = this.average(values);
    const variance = this.average(values.map((value) => (value - mean) ** 2));
    return Math.sqrt(variance);
  }
}
