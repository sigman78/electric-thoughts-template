export function format(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}
