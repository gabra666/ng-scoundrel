import { TestBed } from '@angular/core/testing';
import { GameState } from './game.models';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsService);
  });

  it('returns empty statistics when storage is missing or corrupt', () => {
    expect(service.load().gamesPlayed).toBe(0);

    localStorage.setItem('ng-scoundrel.stats.v1', '{not-json');
    expect(service.load().gamesPlayed).toBe(0);
  });

  it('records wins, losses, and best remaining health', () => {
    service.recordResult(finishedState('won', 8));
    service.recordResult(finishedState('won', 13));
    const result = service.recordResult(finishedState('lost', 0));

    expect(result).toEqual({
      gamesPlayed: 3,
      wins: 2,
      losses: 1,
      bestRemainingHealth: 13,
    });
  });
});

function finishedState(status: 'won' | 'lost', health: number): GameState {
  return {
    health,
    dungeon: [],
    room: { cards: [], actionsRemaining: 0, potionUsed: false },
    weapon: null,
    defeatedMonsters: [],
    status,
    avoidedLastRoom: false,
    message: '',
  };
}
