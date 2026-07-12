import { Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineSignal = signal(true);
  private readonly reasonSignal = signal('Connected');

  readonly online = this.onlineSignal.asReadonly();
  readonly reason = this.reasonSignal.asReadonly();
  readonly online$ = toObservable(this.onlineSignal);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true, 'Browser online event'));
      window.addEventListener('offline', () => this.setOnline(false, 'Browser offline event'));
    }
  }

  setOnline(online: boolean, reason: string): void {
    this.onlineSignal.set(online);
    this.reasonSignal.set(reason);
  }

  /** Demo control: force offline for walkthroughs and tests. */
  simulateOffline(): void {
    this.setOnline(false, 'Simulated network loss');
  }

  simulateOnline(): void {
    this.setOnline(true, 'Simulated reconnection');
  }

  toggle(): void {
    if (this.onlineSignal()) {
      this.simulateOffline();
    } else {
      this.simulateOnline();
    }
  }
}
