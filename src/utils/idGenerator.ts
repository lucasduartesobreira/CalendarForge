export function idGenerator(now = Date.now()) {
  return crypto.randomUUID();
}
