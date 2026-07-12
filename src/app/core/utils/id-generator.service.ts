import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IdGeneratorService {
  private sequence = 0;

  next(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.sequence}`;
  }
}
