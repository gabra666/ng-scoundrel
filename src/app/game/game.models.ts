export type Suit = 'clubs' | 'spades' | 'diamonds' | 'hearts';
export type CardKind = 'monster' | 'weapon' | 'potion';
export type GameStatus = 'playing' | 'won' | 'lost';
export type CombatMode = 'weapon' | 'barehanded';

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly value: number;
  readonly label: string;
  readonly kind: CardKind;
}

export interface WeaponState {
  readonly card: Card;
  readonly lastMonsterValue: number | null;
  readonly defeatedMonsters: readonly Card[];
}

export interface RoomState {
  readonly cards: readonly Card[];
  readonly actionsRemaining: number;
  readonly potionUsed: boolean;
}

export interface GameState {
  readonly health: number;
  readonly dungeon: readonly Card[];
  readonly room: RoomState;
  readonly weapon: WeaponState | null;
  readonly defeatedMonsters: readonly Card[];
  readonly status: GameStatus;
  readonly avoidedLastRoom: boolean;
  readonly message: string;
}

export interface GameStats {
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly bestRemainingHealth: number;
}

export const MAX_HEALTH = 20;
