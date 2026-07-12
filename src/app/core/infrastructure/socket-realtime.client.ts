import { Injectable, OnDestroy, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { RealtimeEnvelope } from '../models/realtime.model';
import { ConnectivityService } from '../services/connectivity.service';

/**
 * Socket.IO transport adapter.
 * Maps server events into the existing RealtimeEnvelope contract used by feature stores.
 */
@Injectable({ providedIn: 'root' })
export class SocketRealtimeClient implements OnDestroy {
  private readonly connectivity = inject(ConnectivityService);
  private readonly eventsSubject = new Subject<RealtimeEnvelope>();
  private socket?: Socket;

  readonly events$: Observable<RealtimeEnvelope> = this.eventsSubject.asObservable();

  connect(): void {
    if (this.socket || !environment.useRemoteBackend) {
      return;
    }
    this.socket = io(environment.socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.connectivity.setOnline(true, 'Socket connected');
      this.eventsSubject.next({
        type: 'connection',
        payload: { online: true, reason: 'Socket connected' },
        at: new Date().toISOString(),
      });
    });

    this.socket.on('disconnect', () => {
      this.connectivity.setOnline(false, 'Socket disconnected');
      this.eventsSubject.next({
        type: 'connection',
        payload: { online: false, reason: 'Socket disconnected' },
        at: new Date().toISOString(),
      });
    });

    this.socket.on('event', (raw: RealtimeEnvelope | { type: string; payload: unknown; at: string }) => {
      if (raw.type === 'kitchen.updated') {
        this.eventsSubject.next({ type: 'kitchen.load', payload: raw.payload, at: raw.at });
        return;
      }
      this.eventsSubject.next(raw as RealtimeEnvelope);
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.eventsSubject.complete();
  }
}
