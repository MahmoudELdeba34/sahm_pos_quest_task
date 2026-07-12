export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly sku: string;
  readonly tags: readonly string[];
  readonly available: boolean;
  readonly inventoryStock?: number;
  readonly lowStockThreshold?: number;
}

export interface ProductSearchResult {
  readonly products: readonly Product[];
  readonly total: number;
  readonly query: string;
  readonly tookMs: number;
}
