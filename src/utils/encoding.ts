/**
 * Decodes base64 string to UTF-8 text.
 */
export function decodeBase64(base64: string): string {
  // Remove whitespace and newlines that GitHub API includes
  const cleaned = base64.replace(/\s/g, "");

  // Use atob (available in Node.js 16+) to decode base64
  const decoded = atob(cleaned);

  // Convert to UTF-8
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }

  // Decode UTF-8 bytes to string
  return new TextDecoder("utf-8").decode(bytes);
}

/**
 * Encodes UTF-8 text to base64 string.
 */
export function encodeBase64(text: string): string {
  // Encode string to UTF-8 bytes
  const bytes = new TextEncoder().encode(text);

  // Convert bytes to binary string
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }

  // Use btoa (available in Node.js 16+) to encode to base64
  return btoa(binary);
}
