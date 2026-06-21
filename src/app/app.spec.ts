import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { resolveCard, seededRandom, startGame } from './game/game.engine';
import { GameSaveService } from './game/game-save.service';
import { GameState, GameStatus } from './game/game.models';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders the game title and a four-card room', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Choose carefully');
    expect(element.querySelectorAll('.playing-card')).toHaveLength(4);
  });

  it('credits the original game designers', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const credit = fixture.nativeElement.querySelector('.game-credit') as HTMLElement | null;

    expect(credit?.textContent).toContain('Zach Gage and Kurt Bieg');
  });

  it('restores an interrupted game with its empty card slot intact', () => {
    const saveService = TestBed.inject(GameSaveService);
    const initial = startGame(seededRandom(34));
    const usedCard = initial.room.cards[1];
    const restoredState = resolveCard(
      initial,
      usedCard.id,
      usedCard.kind === 'monster' ? 'barehanded' : undefined,
    );
    const roomSlots = initial.room.cards.map((card) => (card.id === usedCard.id ? null : card.id));
    saveService.save(restoredState, roomSlots);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as {
      state: WritableSignal<GameState>;
      roomSlots: WritableSignal<(string | null)[]>;
    };

    expect(component.state()).toEqual(restoredState);
    expect(component.roomSlots()).toEqual(roomSlots);
    expect(element.querySelectorAll('.card-slot')).toHaveLength(4);
    expect(element.querySelectorAll('.playing-card')).toHaveLength(3);
  });

  it('normalizes a used live slot before saving and resumes it as empty', () => {
    const firstFixture = TestBed.createComponent(App);
    const firstComponent = firstFixture.componentInstance as unknown as {
      state: WritableSignal<GameState>;
      resolve: (card: GameState['room']['cards'][number], mode?: 'barehanded') => void;
    };
    const usedCard = firstComponent.state().room.cards[1];

    firstComponent.resolve(
      usedCard,
      usedCard.kind === 'monster' ? 'barehanded' : undefined,
    );

    expect(TestBed.inject(GameSaveService).load()?.roomSlots[1]).toBeNull();

    const restoredFixture = TestBed.createComponent(App);
    restoredFixture.detectChanges();
    const restoredElement = restoredFixture.nativeElement as HTMLElement;

    expect(restoredElement.querySelectorAll('.card-slot')).toHaveLength(4);
    expect(restoredElement.querySelectorAll('.playing-card')).toHaveLength(3);
  });

  it.each([
    ['won', 'You escaped the dungeon'],
    ['lost', 'The dungeon claims another'],
  ] as const)('keeps the reserved board structure when the game is %s', (status, heading) => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance as unknown as {
      state: WritableSignal<GameState>;
    };
    component.state.update((state) => outcomeState(state, status));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.result-panel h3')?.textContent).toContain(heading);
    expect(element.querySelector('.card-grid')).toBeNull();
    expect(element.querySelector('.board-actions')).not.toBeNull();
    expect(element.querySelector('.board-actions .avoid-button')).toBeNull();
  });
});

function outcomeState(state: GameState, status: GameStatus): GameState {
  return {
    ...state,
    health: status === 'won' ? 8 : 0,
    dungeon: [],
    room: { cards: [], actionsRemaining: 0, potionUsed: false },
    status,
    message: status === 'won' ? 'Dungeon cleared.' : 'You fell in the dungeon.',
  };
}
