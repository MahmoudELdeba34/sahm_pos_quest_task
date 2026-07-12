/** Express 5 params can be string | string[]. */
export function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}
