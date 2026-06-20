import {
  Card,
  CombatMode,
  GameState,
  MAX_HEALTH,
  RoomState,
  Suit,
  WeaponState,
} from './game.models';

const SUITS: readonly Suit[] = ['clubs', 'spades', 'diamonds', 'hearts'];
const FACE_LABELS: Readonly<Record<number, string>> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export type RandomSource = () => number;

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => {
    const values =
      suit === 'clubs' || suit === 'spades'
        ? Array.from({ length: 13 }, (_, index) => index + 2)
        : Array.from({ length: 9 }, (_, index) => index + 2);

    return values.map((value) => ({
      id: `${suit}-${value}`,
      suit,
      value,
      label: FACE_LABELS[value] ?? String(value),
      kind:
        suit === 'clubs' || suit === 'spades'
          ? 'monster'
          : suit === 'diamonds'
            ? 'weapon'
            : 'potion',
    }));
  });
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function startGame(random: RandomSource = Math.random): GameState {
  const deck = shuffle(createDeck(), random);
  const { room, dungeon } = dealRoom([], deck);

  return {
    health: MAX_HEALTH,
    dungeon,
    room,
    weapon: null,
    defeatedMonsters: [],
    status: 'playing',
    avoidedLastRoom: false,
    message: 'Choose three cards to clear the room.',
  };
}

export function canAvoidRoom(state: GameState): boolean {
  return (
    state.status === 'playing' &&
    !state.avoidedLastRoom &&
    state.room.actionsRemaining > 0 &&
    state.room.cards.length === 4 &&
    state.dungeon.length > 0
  );
}

export function canUseWeapon(state: GameState, monster: Card): boolean {
  if (monster.kind !== 'monster' || !state.weapon) {
    return false;
  }

  return state.weapon.lastMonsterValue === null || monster.value <= state.weapon.lastMonsterValue;
}

export function avoidRoom(state: GameState): GameState {
  if (!canAvoidRoom(state)) {
    return { ...state, message: 'This room cannot be avoided.' };
  }

  const recycledDungeon = [...state.dungeon, ...state.room.cards];
  const { room, dungeon } = dealRoom([], recycledDungeon);

  return {
    ...state,
    dungeon,
    room,
    avoidedLastRoom: true,
    message: 'The room was moved to the bottom of the dungeon.',
  };
}

export function resolveCard(state: GameState, cardId: string, combatMode?: CombatMode): GameState {
  if (state.status !== 'playing' || state.room.actionsRemaining <= 0) {
    return state;
  }

  const card = state.room.cards.find((candidate) => candidate.id === cardId);
  if (!card) {
    return { ...state, message: 'That card is not in the current room.' };
  }

  if (card.kind === 'monster' && !combatMode) {
    return { ...state, message: 'Choose how to fight this monster.' };
  }

  if (card.kind === 'monster' && combatMode === 'weapon' && !canUseWeapon(state, card)) {
    return {
      ...state,
      message: 'This weapon cannot fight a stronger monster than its previous kill.',
    };
  }

  const roomWithoutCard = state.room.cards.filter((candidate) => candidate.id !== cardId);
  const actionsRemaining = state.room.actionsRemaining - 1;
  let health = state.health;
  let weapon = state.weapon;
  let defeatedMonsters = state.defeatedMonsters;
  let potionUsed = state.room.potionUsed;
  let message = '';

  if (card.kind === 'potion') {
    if (potionUsed) {
      message = `${card.label}♥ was discarded. Only one potion works per room.`;
    } else {
      const healed = Math.min(card.value, MAX_HEALTH - health);
      health += healed;
      potionUsed = true;
      message = healed > 0 ? `Recovered ${healed} health.` : 'Health is already full.';
    }
  }

  if (card.kind === 'weapon') {
    weapon = {
      card,
      lastMonsterValue: null,
      defeatedMonsters: [],
    };
    message = `Equipped the ${card.label}♦ weapon.`;
  }

  if (card.kind === 'monster') {
    defeatedMonsters = [...defeatedMonsters, card];

    if (combatMode === 'weapon' && weapon) {
      const damage = Math.max(0, card.value - weapon.card.value);
      health -= damage;
      weapon = {
        ...weapon,
        lastMonsterValue: card.value,
        defeatedMonsters: [...weapon.defeatedMonsters, card],
      };
      message =
        damage > 0
          ? `The ${card.label} monster dealt ${damage} damage through your weapon.`
          : `The ${card.label} monster was defeated without damage.`;
    } else {
      health -= card.value;
      message = `Barehanded combat cost ${card.value} health.`;
    }
  }

  if (health <= 0) {
    return {
      ...state,
      health: 0,
      room: {
        cards: roomWithoutCard,
        actionsRemaining,
        potionUsed,
      },
      weapon,
      defeatedMonsters,
      status: 'lost',
      message: 'You fell in the dungeon.',
    };
  }

  if (actionsRemaining === 0 && roomWithoutCard.length === 0 && state.dungeon.length === 0) {
    return {
      ...state,
      health,
      room: {
        cards: [],
        actionsRemaining: 0,
        potionUsed,
      },
      weapon,
      defeatedMonsters,
      status: 'won',
      message: `Dungeon cleared with ${health} health remaining.`,
    };
  }

  return {
    ...state,
    health,
    room: {
      cards: roomWithoutCard,
      actionsRemaining,
      potionUsed,
    },
    weapon,
    defeatedMonsters,
    message: actionsRemaining === 0 ? 'Room cleared. Continue deeper into the dungeon.' : message,
  };
}

export function enterNextRoom(state: GameState): GameState {
  if (
    state.status !== 'playing' ||
    state.room.actionsRemaining !== 0 ||
    state.dungeon.length === 0
  ) {
    return state;
  }

  const { room, dungeon } = dealRoom(state.room.cards, state.dungeon);

  return {
    ...state,
    dungeon,
    room,
    avoidedLastRoom: false,
    message:
      room.actionsRemaining === room.cards.length
        ? 'Final room. Clear every remaining card.'
        : 'A new room blocks your path.',
  };
}

function dealRoom(
  carriedCards: readonly Card[],
  dungeon: readonly Card[],
): {
  room: RoomState;
  dungeon: Card[];
} {
  const drawCount = Math.min(4 - carriedCards.length, dungeon.length);
  const drawnCards = dungeon.slice(0, drawCount);
  const remainingDungeon = dungeon.slice(drawCount);
  const cards = [...carriedCards, ...drawnCards];
  const actionsRemaining = remainingDungeon.length === 0 ? cards.length : cards.length - 1;

  return {
    dungeon: remainingDungeon,
    room: {
      cards,
      actionsRemaining,
      potionUsed: false,
    },
  };
}
