import { Injectable } from '@angular/core';
import { GameState, GameStats } from './game.models';

const STORAGE_KEY = 'ng-scoundrel.stats.v1';
const EMPTY_STATS: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  bestRemainingHealth: 0,
};

@Injectable({ providedIn: 'root' })
export class StatsService {
  load(): GameStats {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return EMPTY_STATS;
      }

      const candidate: unknown = JSON.parse(raw);
      return isGameStats(candidate) ? candidate : EMPTY_STATS;
    } catch {
      return EMPTY_STATS;
    }
  }

  recordResult(state: GameState): GameStats {
    if (state.status === 'playing') {
      return this.load();
    }

    const current = this.load();
    const next: GameStats = {
      gamesPlayed: current.gamesPlayed + 1,
      wins: current.wins + (state.status === 'won' ? 1 : 0),
      losses: current.losses + (state.status === 'lost' ? 1 : 0),
      bestRemainingHealth:
        state.status === 'won'
          ? Math.max(current.bestRemainingHealth, state.health)
          : current.bestRemainingHealth,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Statistics are optional; the game remains playable when storage is unavailable.
    }

    return next;
  }
}

function isGameStats(value: unknown): value is GameStats {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stats = value as Record<string, unknown>;
  return ['gamesPlayed', 'wins', 'losses', 'bestRemainingHealth'].every(
    (key) =>
      typeof stats[key] === 'number' && Number.isInteger(stats[key]) && (stats[key] as number) >= 0,
  );
}
