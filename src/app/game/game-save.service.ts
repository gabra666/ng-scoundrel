import { Injectable } from '@angular/core';
import { createDeck } from './game.engine';
import { Card, GameState } from './game.models';

const STORAGE_KEY = 'ng-scoundrel.active-game.v1';
const SAVE_VERSION = 1;
const VALID_CARDS = new Map(createDeck().map((card) => [card.id, card]));

export interface SavedGame {
  readonly version: typeof SAVE_VERSION;
  readonly state: GameState;
  readonly roomSlots: readonly (string | null)[];
  readonly savedAt: number;
}

@Injectable({ providedIn: 'root' })
export class GameSaveService {
  load(): SavedGame | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const candidate: unknown = JSON.parse(raw);
      if (isSavedGame(candidate)) {
        return candidate;
      }
    } catch {
      // Invalid or unavailable browser storage is treated as no saved game.
    }

    this.clear();
    return null;
  }

  save(state: GameState, roomSlots: readonly (string | null)[]): void {
    if (state.status !== 'playing') {
      this.clear();
      return;
    }

    const savedGame: SavedGame = {
      version: SAVE_VERSION,
      state,
      roomSlots: [...roomSlots],
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedGame));
    } catch {
      // The game remains playable when storage is blocked or unavailable.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing an optional save should never prevent gameplay.
    }
  }
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const save = value as Record<string, unknown>;
  return (
    save['version'] === SAVE_VERSION &&
    typeof save['savedAt'] === 'number' &&
    Number.isFinite(save['savedAt']) &&
    isGameState(save['state']) &&
    isRoomSlots(save['roomSlots'], (save['state'] as GameState).room.cards)
  );
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;
  const room = state['room'];
  const weapon = state['weapon'];

  return (
    state['status'] === 'playing' &&
    isIntegerInRange(state['health'], 1, 20) &&
    typeof state['avoidedLastRoom'] === 'boolean' &&
    typeof state['message'] === 'string' &&
    isCardArray(state['dungeon'], 0, 44) &&
    isCardArray(state['defeatedMonsters'], 0, 26) &&
    isRoom(room) &&
    (weapon === null || isWeapon(weapon))
  );
}

function isRoom(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const room = value as Record<string, unknown>;
  return (
    isCardArray(room['cards'], 1, 4) &&
    isIntegerInRange(room['actionsRemaining'], 1, 4) &&
    (room['actionsRemaining'] as number) <= (room['cards'] as unknown[]).length &&
    typeof room['potionUsed'] === 'boolean'
  );
}

function isWeapon(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const weapon = value as Record<string, unknown>;
  return (
    isCard(weapon['card']) &&
    (weapon['card'] as Card).kind === 'weapon' &&
    (weapon['lastMonsterValue'] === null || isIntegerInRange(weapon['lastMonsterValue'], 2, 14)) &&
    isCardArray(weapon['defeatedMonsters'], 0, 26)
  );
}

function isRoomSlots(value: unknown, roomCards: readonly Card[]): boolean {
  if (!Array.isArray(value) || value.length !== 4) {
    return false;
  }

  const slots = value as unknown[];
  if (!slots.every((slot) => slot === null || typeof slot === 'string')) {
    return false;
  }

  const cardIds = roomCards.map((card) => card.id).sort();
  const slotIds = slots.filter((slot): slot is string => typeof slot === 'string').sort();
  return (
    cardIds.length === slotIds.length && cardIds.every((cardId, index) => cardId === slotIds[index])
  );
}

function isCardArray(value: unknown, minimum: number, maximum: number): value is Card[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(isCard)
  );
}

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Card;
  const canonical = VALID_CARDS.get(candidate.id);
  return (
    canonical !== undefined &&
    candidate.suit === canonical.suit &&
    candidate.value === canonical.value &&
    candidate.label === canonical.label &&
    candidate.kind === canonical.kind
  );
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
  );
}
