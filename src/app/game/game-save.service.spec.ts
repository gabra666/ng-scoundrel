import { TestBed } from '@angular/core/testing';
import { resolveCard, seededRandom, startGame } from './game.engine';
import { GameSaveService } from './game-save.service';
import { GameState } from './game.models';

describe('GameSaveService', () => {
  let service: GameSaveService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameSaveService);
  });

  it('round-trips an active game and its fixed card slots', () => {
    const initial = startGame(seededRandom(21));
    const firstCard = initial.room.cards[0];
    const state = resolveCard(
      initial,
      firstCard.id,
      firstCard.kind === 'monster' ? 'barehanded' : undefined,
    );
    const roomSlots = initial.room.cards.map((card) => (card.id === firstCard.id ? null : card.id));

    service.save(state, roomSlots);

    expect(service.load()).toMatchObject({
      version: 1,
      state,
      roomSlots,
    });
  });

  it.each([
    '{not-json',
    JSON.stringify({ version: 99 }),
    JSON.stringify({
      version: 1,
      state: { status: 'playing' },
      roomSlots: [],
      savedAt: Date.now(),
    }),
  ])('discards invalid saved data', (raw) => {
    localStorage.setItem('ng-scoundrel.active-game.v1', raw);

    expect(service.load()).toBeNull();
    expect(localStorage.getItem('ng-scoundrel.active-game.v1')).toBeNull();
  });

  it('does not retain completed games', () => {
    const terminalState: GameState = {
      ...startGame(seededRandom(4)),
      health: 0,
      status: 'lost',
    };

    service.save(
      terminalState,
      terminalState.room.cards.map((card) => card.id),
    );

    expect(service.load()).toBeNull();
  });

  it('clears an existing active game', () => {
    const state = startGame(seededRandom(8));
    service.save(
      state,
      state.room.cards.map((card) => card.id),
    );

    service.clear();

    expect(service.load()).toBeNull();
  });
});
