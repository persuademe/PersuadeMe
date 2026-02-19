import { v4 as uuidv4 } from "uuid";

/**
 * Generate a UUID v4 API key
 * Format: pm_<uuid> (prefix for "Persuade Me")
 */
export function generateApiKey(): string {
  const uuid = uuidv4();
  return `pm_${uuid}`;
}

/**
 * Validate API key format
 * @param apiKey - The API key to validate
 * @returns boolean - true if valid format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return apiKey.startsWith("pm_") && uuidRegex.test(apiKey.substring(3));
}

/**
 * Extract UUID from API key
 * @param apiKey - The full API key with prefix
 * @returns The UUID portion or null if invalid
 */
export function extractUuidFromApiKey(apiKey: string): string | null {
  if (!isValidApiKeyFormat(apiKey)) {
    return null;
  }
  return apiKey.substring(3);
}

/**
 * Create full API key from UUID
 * @param uuid - The UUID v4 string
 * @returns The full API key with prefix
 */
export function createApiKeyFromUuid(uuid: string): string {
  return `pm_${uuid}`;
}
