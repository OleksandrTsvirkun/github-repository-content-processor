export default function hashCode<T>(value: T): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return numberHashCode(value);
  }

  if (typeof value === "string") {
    return stringHashCode(value);
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "object") {
    return objectHashCode(value);
  }

  throw new Error(`Unsupported type for hashing: ${typeof value}`);
}

export function numberHashCode(value: number) {
  return Math.floor(value) % 2147483647;
}

export function stringHashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
}

export function objectHashCode(obj: object) {
  let hash = 0;

  for (const [key, value] of Object.entries(obj)) {
    const keyHash = stringHashCode(key);
    const valueHash = hashCode(value); // Recursive call for nested structures
    hash = (hash + (keyHash * 31 + valueHash)) % 2147483647;
  }

  return hash;
}
