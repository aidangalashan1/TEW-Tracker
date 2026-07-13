export function nextId(): string {
  return 'mod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}
