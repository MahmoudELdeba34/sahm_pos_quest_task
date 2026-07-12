import { nextOrderStatus } from './order.model';

describe('order.model', () => {
  it('advances through the happy-path status flow', () => {
    expect(nextOrderStatus('received')).toBe('preparing');
    expect(nextOrderStatus('preparing')).toBe('ready');
    expect(nextOrderStatus('ready')).toBe('delivered');
    expect(nextOrderStatus('delivered')).toBe('completed');
    expect(nextOrderStatus('completed')).toBeNull();
  });
});
