/**
 * @fileoverview Safe Type Utilities
 * 
 * @description Utilities to safely handle nullable values and avoid non-null assertions.
 * These functions provide runtime safety for values that might be null or undefined.
 * 
 * @business_rule Prefer these utilities over ! non-null assertions for better error handling
 */

/**
 * Safely extract a required value, throwing a descriptive error if null/undefined
 * 
 * @param value The value to extract
 * @param msg Error message to throw if value is null/undefined
 * @returns The non-null value
 * @throws Error if value is null or undefined
 * 
 * @example
 * ```typescript
 * const user = required(await getUser(id), `User ${id} not found`);
 * // user is guaranteed to be non-null here
 * ```
 */
export function required<T>(value: T | null | undefined, msg: string): T {
  if (value == null) {
    throw new Error(msg);
  }
  return value;
}

/**
 * Safely convert a nullable boolean to a boolean with fallback
 * 
 * @param value The boolean value (may be null/undefined)
 * @param fallback Default value if null/undefined (defaults to false)
 * @returns Boolean value
 * 
 * @example
 * ```typescript
 * const isActive = toBool(user.is_active, true); // defaults to true if null
 * ```
 */
export function toBool(value: boolean | null | undefined, fallback = false): boolean {
  return !!(value ?? fallback);
}

/**
 * Safely convert a nullable string to a string with fallback
 * 
 * @param value The string value (may be null/undefined)
 * @param fallback Default value if null/undefined (defaults to empty string)
 * @returns String value
 * 
 * @example
 * ```typescript
 * const name = toString(user.full_name, 'Unknown User');
 * ```
 */
export function toString(value: string | null | undefined, fallback = ''): string {
  return value ?? fallback;
}

/**
 * Safely convert a nullable number to a number with fallback
 * 
 * @param value The number value (may be null/undefined)
 * @param fallback Default value if null/undefined (defaults to 0)
 * @returns Number value
 * 
 * @example
 * ```typescript
 * const count = toNumber(selection.count, 1);
 * ```
 */
export function toNumber(value: number | null | undefined, fallback = 0): number {
  return value ?? fallback;
}

/**
 * Safely get a property from an object that might be null/undefined
 * 
 * @param obj The object (may be null/undefined)
 * @param key The property key
 * @param fallback Default value if object is null/undefined or property doesn't exist
 * @returns The property value or fallback
 * 
 * @example
 * ```typescript
 * const artistName = safeGet(artist, 'name', 'Unknown Artist');
 * ```
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback: T[K]
): T[K] {
  if (obj == null) return fallback;
  return obj[key] ?? fallback;
}

/**
 * Safely access nested object properties
 * 
 * @param obj The root object
 * @param path Dot-separated path to the property
 * @param fallback Default value if path doesn't exist
 * @returns The property value or fallback
 * 
 * @example
 * ```typescript
 * const city = safePath(user, 'address.city', 'Unknown City');
 * ```
 */
export function safePath<T>(
  obj: unknown,
  path: string,
  fallback: T
): T {
  if (obj == null) return fallback;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current as T ?? fallback;
}

/**
 * Safely parse JSON string
 * 
 * @param jsonString The JSON string to parse
 * @param fallback Default value if parsing fails
 * @returns Parsed object or fallback
 * 
 * @example
 * ```typescript
 * const data = safeJsonParse(user.metadata, {});
 * ```
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely convert array that might be null/undefined to array
 * 
 * @param value The array value (may be null/undefined)
 * @returns Array (empty if null/undefined)
 * 
 * @example
 * ```typescript
 * const items = toArray(user.items);
 * ```
 */
export function toArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

/**
 * Safely get first element of array that might be null/undefined
 * 
 * @param array The array (may be null/undefined)
 * @param fallback Default value if array is empty or null/undefined
 * @returns First element or fallback
 * 
 * @example
 * ```typescript
 * const firstUser = firstOr(userList, null);
 * ```
 */
export function firstOr<T>(array: T[] | null | undefined, fallback: T): T {
  if (!array || array.length === 0) return fallback;
  return array[0];
}

/**
 * Safely get last element of array that might be null/undefined
 * 
 * @param array The array (may be null/undefined)
 * @param fallback Default value if array is empty or null/undefined
 * @returns Last element or fallback
 * 
 * @example
 * ```typescript
 * const lastUser = lastOr(userList, null);
 * ```
 */
export function lastOr<T>(array: T[] | null | undefined, fallback: T): T {
  if (!array || array.length === 0) return fallback;
  return array[array.length - 1];
}

/**
 * Type guard to check if value is not null or undefined
 * 
 * @param value The value to check
 * @returns True if value is not null or undefined
 * 
 * @example
 * ```typescript
 * if (isNotNull(user)) {
 *   // user is guaranteed to be non-null here
 *   console.log(user.email);
 * }
 * ```
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Type guard to check if value is null or undefined
 * 
 * @param value The value to check
 * @returns True if value is null or undefined
 * 
 * @example
 * ```typescript
 * if (isNull(user)) {
 *   // Handle null case
 *   return null;
 * }
 * ```
 */
export function isNull<T>(value: T | null | undefined): value is null | undefined {
  return value == null;
}
