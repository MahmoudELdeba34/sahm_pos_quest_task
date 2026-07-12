export type KitchenLoadLevel = 'low' | 'medium' | 'high' | 'critical';

export interface KitchenStationLoad {
  readonly id: string;
  readonly name: string;
  readonly activeTickets: number;
  readonly capacity: number;
  readonly loadPercent: number;
}

export interface KitchenLoadSnapshot {
  readonly level: KitchenLoadLevel;
  readonly overallPercent: number;
  readonly stations: readonly KitchenStationLoad[];
  readonly delayedOrderIds: readonly string[];
  readonly updatedAt: string;
}
