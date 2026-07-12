import type { Request, Response } from 'express';

export function healthController(_req: Request, res: Response): void {
  res.json({ ok: true, service: 'gourmetos-api', at: new Date().toISOString() });
}
