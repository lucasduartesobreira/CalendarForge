export function idGenerator(now = Date.now()) {
  return Buffer.from(now.toString()).toString("base64");
}
