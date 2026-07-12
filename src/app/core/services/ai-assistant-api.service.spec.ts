import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AiAssistantApiService } from './ai-assistant-api.service';
import { IdGeneratorService } from '../utils/id-generator.service';
import { Order } from '../models/order.model';

describe('AiAssistantApiService', () => {
  let api: AiAssistantApiService;

  const order: Order = {
    id: 'ord-api',
    number: 'A-1',
    channel: 'walk-in',
    status: 'received',
    priority: 'normal',
    customerName: 'Test',
    items: [{ id: 'i1', name: 'Tea', quantity: 1, unitPrice: 20 }],
    total: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedMinutes: 10,
    isDelayed: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AiAssistantApiService, IdGeneratorService] });
    api = TestBed.inject(AiAssistantApiService);
  });

  it('fails the first attempt then streams on retry', fakeAsync(() => {
    const emissions: string[] = [];
    let failures = 0;

    api.streamRecommendations({ order, failFirstAttempts: 1 }).subscribe({
      next: (chunk) => {
        if (chunk.kind === 'token') {
          emissions.push(chunk.text ?? '');
        }
      },
      error: () => {
        failures += 1;
      },
    });

    tick(900);
    expect(failures).toBe(1);

    api.streamRecommendations({ order, failFirstAttempts: 1 }).subscribe({
      next: (chunk) => {
        if (chunk.kind === 'token') {
          emissions.push(chunk.text ?? '');
        }
      },
    });

    tick(5000);
    expect(emissions.join('')).toContain('Analyzing');
  }));
});
