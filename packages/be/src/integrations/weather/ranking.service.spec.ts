import { describe, expect, it } from '@jest/globals';

import { RankingService } from './ranking.service';

describe('RankingService', () => {
  const rankingService = new RankingService();

  it('degrades surfing confidence when no surf spot is available', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Nairobi',
        latitude: -1.286389,
        longitude: 36.817223,
      },
      surfSpot: undefined,
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 24,
              precipitation: 0,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 24,
              uvIndex: 5,
              visibility: 12000,
              waveDirection: 0,
              waveHeight: 0,
              wavePeriod: 0,
              weatherCode: 1,
              windDirection10m: 40,
              windSpeed10m: 12,
            },
          ],
        },
      ],
    });

    const surfing = result.days[0].activities.find(
      ({ activity }) => activity === 'surfing',
    );

    expect(surfing?.confidence).toBeLessThan(0.7);
    expect(surfing?.reasons[0]).toContain('No nearby configured surf spot');
  });

  it('sorts stronger activities first', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Cape Town',
        latitude: -33.9249,
        longitude: 18.4241,
      },
      surfSpot: {
        idealWaveDirection: 180,
        latitude: -34.107,
        longitude: 18.47,
        name: 'Muizenberg',
        offshoreWindDirection: 315,
        waveToleranceDegrees: 75,
        windToleranceDegrees: 60,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 28,
              precipitation: 0.2,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 23,
              uvIndex: 5,
              visibility: 13000,
              waveDirection: 185,
              waveHeight: 1.8,
              wavePeriod: 11,
              weatherCode: 1,
              windDirection10m: 315,
              windSpeed10m: 11,
            },
          ],
        },
      ],
    });

    expect(result.days[0].activities[0].activity).toBe('surfing');
  });

  it('sorts day results chronologically', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Cape Town',
        latitude: -33.9249,
        longitude: 18.4241,
      },
      dailyForecasts: [
        {
          date: '2026-04-27',
          hourly: [],
        },
        {
          date: '2026-04-26',
          hourly: [],
        },
      ],
    });

    expect(result.days.map((day) => day.date)).toEqual([
      '2026-04-26',
      '2026-04-27',
    ]);
  });

  it('adds activity-specific weather reasons for rain and warm ski conditions', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Rainy City',
        latitude: 0,
        longitude: 0,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 60,
              precipitation: 5,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 10,
              uvIndex: 4,
              visibility: 6000,
              waveDirection: 0,
              waveHeight: 0.5,
              wavePeriod: 5,
              weatherCode: 61,
              windDirection10m: 90,
              windSpeed10m: 14,
            },
          ],
        },
      ],
    });

    const outdoor = result.days[0].activities.find(
      ({ activity }) => activity === 'outdoorSightseeing',
    );
    const indoor = result.days[0].activities.find(
      ({ activity }) => activity === 'indoorSightseeing',
    );
    const skiing = result.days[0].activities.find(
      ({ activity }) => activity === 'skiing',
    );

    expect(outdoor?.reasons).toContain(
      'At least one hourly rain window weakens outdoor reliability.',
    );
    expect(indoor?.reasons).toContain(
      'Wet conditions improve indoor activity desirability.',
    );
    expect(skiing?.reasons).toContain(
      'Temperatures are too warm to strongly support skiing.',
    );
  });

  it('uses the windy fallback reason when no activity-specific reason applies', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Windy City',
        latitude: 0,
        longitude: 0,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 20,
              precipitation: 0.4,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 20,
              uvIndex: 2,
              visibility: 11000,
              waveDirection: 0,
              waveHeight: 0.5,
              wavePeriod: 6,
              weatherCode: 1,
              windDirection10m: 90,
              windSpeed10m: 30,
            },
          ],
        },
      ],
    });

    expect(result.days[0].activities[0].reasons).toContain(
      'Stronger winds add uncertainty across the day.',
    );
  });

  it('uses the calm fallback reason when no activity-specific reason applies', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Calm City',
        latitude: 0,
        longitude: 0,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 20,
              precipitation: 0.4,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 20,
              uvIndex: 2,
              visibility: 11000,
              waveDirection: 0,
              waveHeight: 0.5,
              wavePeriod: 6,
              weatherCode: 1,
              windDirection10m: 90,
              windSpeed10m: 12,
            },
          ],
        },
      ],
    });

    expect(result.days[0].activities[0].reasons).toContain(
      'Hourly conditions remain reasonably consistent through the day.',
    );
  });

  it('scores indoor sightseeing higher when temperatures are far outside comfort bounds', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Heatwave City',
        latitude: 0,
        longitude: 0,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 10,
              precipitation: 0,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 36,
              uvIndex: 4,
              visibility: 12000,
              waveDirection: 0,
              waveHeight: 0,
              wavePeriod: 0,
              weatherCode: 1,
              windDirection10m: 0,
              windSpeed10m: 8,
            },
          ],
        },
      ],
    });

    const indoor = result.days[0].activities.find(
      ({ activity }) => activity === 'indoorSightseeing',
    );

    expect(indoor?.score).toBeGreaterThan(0.15);
  });

  it('handles surf angle wraparound across north correctly', () => {
    const result = rankingService.rankForecast({
      location: {
        name: 'Wraparound Bay',
        latitude: 0,
        longitude: 0,
      },
      surfSpot: {
        idealWaveDirection: 350,
        latitude: 0,
        longitude: 0,
        name: 'Wraparound Point',
        offshoreWindDirection: 350,
        waveToleranceDegrees: 40,
        windToleranceDegrees: 40,
      },
      dailyForecasts: [
        {
          date: '2026-04-26',
          hourly: [
            {
              cloudCover: 10,
              precipitation: 0,
              snowfall: 0,
              snowDepth: 0,
              temperature2m: 24,
              uvIndex: 3,
              visibility: 13000,
              waveDirection: 10,
              waveHeight: 2,
              wavePeriod: 10,
              weatherCode: 1,
              windDirection10m: 10,
              windSpeed10m: 9,
            },
          ],
        },
      ],
    });

    const surfing = result.days[0].activities.find(
      ({ activity }) => activity === 'surfing',
    );

    expect(surfing?.score).toBeGreaterThan(0.7);
  });

  it('treats missing weighted score parts as zero', () => {
    const weightedScore = (
      rankingService as unknown as {
        weightedScore: (
          parts: Record<string, number>,
          weights: Record<string, number>,
        ) => number;
      }
    ).weightedScore;

    expect(
      weightedScore(
        {
          onlyPart: 0.5,
        },
        {
          missingPart: 0.5,
          onlyPart: 0.5,
        },
      ),
    ).toBe(0.25);
  });
});
