import { SurfSpotsService } from './surf-spots.service';

describe('SurfSpotsService', () => {
  let service: SurfSpotsService;

  beforeEach(() => {
    service = new SurfSpotsService();
  });

  it('returns the nearest configured surf spot within range', () => {
    expect(service.resolveNearestSpot(-34.106, 18.469)).toMatchObject({
      name: 'Muizenberg',
    });
  });

  it('returns undefined when no configured surf spot is nearby', () => {
    expect(service.resolveNearestSpot(51.5072, -0.1276)).toBeUndefined();
  });
});
