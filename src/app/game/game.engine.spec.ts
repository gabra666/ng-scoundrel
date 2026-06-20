import {
  avoidRoom,
  canAvoidRoom,
  canUseWeapon,
  createDeck,
  enterNextRoom,
  resolveCard,
  seededRandom,
  shuffle,
  startGame,
} from './game.engine';
import { Card, GameState } from './game.models';

describe('Scoundrel game engine', () => {
  it('builds the 44-card dungeon with the correct card types', () => {
    const deck = createDeck();

    expect(deck).toHaveLength(44);
    expect(deck.filter((card) => card.kind === 'monster')).toHaveLength(26);
    expect(deck.filter((card) => card.kind === 'weapon')).toHaveLength(9);
    expect(deck.filter((card) => card.kind === 'potion')).toHaveLength(9);
    expect(deck.some((card) => card.suit === 'hearts' && card.value > 10)).toBe(false);
  });

  it('produces repeatable shuffles with a seeded source', () => {
    const first = shuffle(createDeck(), seededRandom(13)).map((card) => card.id);
    const second = shuffle(createDeck(), seededRandom(13)).map((card) => card.id);

    expect(first).toEqual(second);
    expect(first).not.toEqual(createDeck().map((card) => card.id));
  });

  it('starts at full health with four cards and three required actions', () => {
    const state = startGame(seededRandom(7));

    expect(state.health).toBe(20);
    expect(state.room.cards).toHaveLength(4);
    expect(state.room.actionsRemaining).toBe(3);
    expect(state.dungeon).toHaveLength(40);
    expect(canAvoidRoom(state)).toBe(true);
  });

  it('moves an avoided room to the dungeon bottom and prevents consecutive avoidance', () => {
    const initial = startGame(seededRandom(5));
    const avoidedIds = initial.room.cards.map((card) => card.id);
    const next = avoidRoom(initial);

    expect(next.dungeon.slice(-4).map((card) => card.id)).toEqual(avoidedIds);
    expect(next.room.cards).toHaveLength(4);
    expect(canAvoidRoom(next)).toBe(false);
    expect(avoidRoom(next).room.cards).toEqual(next.room.cards);
  });

  it('carries the unplayed card into the next room', () => {
    let state = startGame(seededRandom(17));
    const resolvedIds = state.room.cards.slice(0, 3).map((card) => card.id);

    for (const cardId of resolvedIds) {
      const card = state.room.cards.find((candidate) => candidate.id === cardId)!;
      state = resolveCard(state, cardId, card.kind === 'monster' ? 'barehanded' : undefined);

      if (state.status === 'lost') {
        state = { ...state, health: 20, status: 'playing' };
      }
    }

    const carriedCard = state.room.cards[0];
    const next = enterNextRoom(state);

    expect(next.room.cards[0]).toEqual(carriedCard);
    expect(next.room.cards).toHaveLength(4);
    expect(next.room.actionsRemaining).toBe(3);
  });

  it('applies only the first potion in a room and caps health at 20', () => {
    const potionFive = card('hearts', 5, 'potion');
    const potionNine = card('hearts', 9, 'potion');
    let state = customState({
      health: 13,
      roomCards: [potionFive, potionNine],
      actionsRemaining: 2,
    });

    state = resolveCard(state, potionFive.id);
    expect(state.health).toBe(18);

    state = resolveCard(state, potionNine.id);
    expect(state.health).toBe(18);
    expect(state.status).toBe('won');
  });

  it('uses weapon power for damage and enforces descending monster strength', () => {
    const weapon = card('diamonds', 6, 'weapon');
    const monsterNine = card('clubs', 9, 'monster');
    const monsterTen = card('spades', 10, 'monster');
    let state = customState({
      roomCards: [weapon, monsterNine, monsterTen],
      actionsRemaining: 3,
    });

    state = resolveCard(state, weapon.id);
    state = resolveCard(state, monsterNine.id, 'weapon');

    expect(state.health).toBe(17);
    expect(state.weapon?.lastMonsterValue).toBe(9);
    expect(canUseWeapon(state, monsterTen)).toBe(false);

    const rejected = resolveCard(state, monsterTen.id, 'weapon');
    expect(rejected.health).toBe(17);
    expect(rejected.room.cards).toContain(monsterTen);

    const finished = resolveCard(rejected, monsterTen.id, 'barehanded');
    expect(finished.health).toBe(7);
    expect(finished.status).toBe('won');
  });

  it('ends the run immediately when combat reduces health to zero', () => {
    const monster = card('spades', 14, 'monster');
    const state = customState({
      health: 10,
      roomCards: [monster],
      actionsRemaining: 1,
    });
    const result = resolveCard(state, monster.id, 'barehanded');

    expect(result.health).toBe(0);
    expect(result.status).toBe('lost');
  });

  it('requires every card in the final short room to be resolved', () => {
    const carried = card('hearts', 2, 'potion');
    const lastCard = card('diamonds', 3, 'weapon');
    const state = customState({
      roomCards: [carried],
      actionsRemaining: 0,
      dungeon: [lastCard],
    });

    const finalRoom = enterNextRoom(state);

    expect(finalRoom.room.cards).toHaveLength(2);
    expect(finalRoom.room.actionsRemaining).toBe(2);
    expect(finalRoom.dungeon).toHaveLength(0);
  });
});

function card(suit: Card['suit'], value: number, kind: Card['kind']): Card {
  return {
    id: `${suit}-${value}`,
    suit,
    value,
    label:
      value > 10 ? ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[value] ?? String(value)) : String(value),
    kind,
  };
}

function customState(options: {
  health?: number;
  roomCards: Card[];
  actionsRemaining: number;
  dungeon?: Card[];
}): GameState {
  return {
    health: options.health ?? 20,
    dungeon: options.dungeon ?? [],
    room: {
      cards: options.roomCards,
      actionsRemaining: options.actionsRemaining,
      potionUsed: false,
    },
    weapon: null,
    defeatedMonsters: [],
    status: 'playing',
    avoidedLastRoom: false,
    message: '',
  };
}
