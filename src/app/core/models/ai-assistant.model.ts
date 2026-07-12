export type AiSuggestionType =
  | 'upsell'
  | 'allergy'
  | 'missing_info'
  | 'delivery_risk'
  | 'kitchen_overload';

export type AiRequestStatus =
  | 'idle'
  | 'loading'
  | 'streaming'
  | 'success'
  | 'error'
  | 'retrying';

export interface AiSuggestion {
  readonly id: string;
  readonly type: AiSuggestionType;
  readonly title: string;
  readonly message: string;
  readonly confidence: number;
  readonly actionable: boolean;
}

export interface AiAssistantState {
  readonly orderId: string | null;
  readonly status: AiRequestStatus;
  readonly partialText: string;
  readonly suggestions: readonly AiSuggestion[];
  readonly error: string | null;
  readonly attempt: number;
  readonly lastUpdatedAt: string | null;
}
