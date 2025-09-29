const memoryStore: Record<string, any> = {};

export function setItem(key: string, value: any) {
  memoryStore[key] = value;
}

export function getItem(key: string) {
  return memoryStore[key] ?? null;
}

export function removeItem(key: string) {
  delete memoryStore[key];
}
