import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
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
