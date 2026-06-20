import { Component, computed, inject, signal } from '@angular/core';
import {
  avoidRoom,
  canAvoidRoom,
  canUseWeapon,
  enterNextRoom,
  resolveCard,
  startGame,
} from './game/game.engine';
import { Card, CombatMode, GameStats } from './game/game.models';
import { StatsService } from './game/stats.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly statsService = inject(StatsService);
  private resultRecorded = false;

  protected readonly state = signal(startGame());
  protected readonly roomSlots = signal<(string | null)[]>(this.createRoomSlots());
  protected readonly stats = signal<GameStats>(this.statsService.load());
  protected readonly rulesOpen = signal(false);
  protected readonly canAvoid = computed(() => canAvoidRoom(this.state()));

  protected newGame(): void {
    this.resultRecorded = false;
    this.state.set(startGame());
    this.syncRoomSlots();
  }

  protected avoid(): void {
    this.state.update(avoidRoom);
    this.syncRoomSlots();
  }

  protected resolve(card: Card, combatMode?: CombatMode): void {
    let enteredNextRoom = false;

    this.state.update((state) => {
      const resolvedState = resolveCard(state, card.id, combatMode);

      if (
        resolvedState.status === 'playing' &&
        resolvedState.room.actionsRemaining === 0 &&
        resolvedState.dungeon.length > 0
      ) {
        enteredNextRoom = true;
        return enterNextRoom(resolvedState);
      }

      return resolvedState;
    });

    if (enteredNextRoom) {
      this.syncRoomSlots();
    }

    this.recordResultOnce();
  }

  protected weaponAvailable(card: Card): boolean {
    return canUseWeapon(this.state(), card);
  }

  protected cardForSlot(cardId: string | null): Card | undefined {
    return cardId ? this.state().room.cards.find((card) => card.id === cardId) : undefined;
  }

  protected suitSymbol(card: Card): string {
    return {
      clubs: '♣',
      spades: '♠',
      diamonds: '♦',
      hearts: '♥',
    }[card.suit];
  }

  protected toggleRules(): void {
    this.rulesOpen.update((open) => !open);
  }

  private recordResultOnce(): void {
    if (this.resultRecorded || this.state().status === 'playing') {
      return;
    }

    this.resultRecorded = true;
    this.stats.set(this.statsService.recordResult(this.state()));
  }

  private syncRoomSlots(): void {
    this.roomSlots.set(this.createRoomSlots());
  }

  private createRoomSlots(): (string | null)[] {
    const cardIds = this.state().room.cards.map((card) => card.id);
    return [...cardIds, ...Array<string | null>(4 - cardIds.length).fill(null)];
  }
}
