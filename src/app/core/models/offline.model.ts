export type OfflineActionType =
  | 'order.create'
  | 'order.status.update'
  | 'order.priority.update'
  | 'ai.request.refresh';

export type OfflineActionStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OfflineAction {
  readonly id: string;
  readonly type: OfflineActionType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly status: OfflineActionStatus;
  readonly idempotencyKey: string;
  readonly attempts: number;
  readonly lastError?: string;
}
