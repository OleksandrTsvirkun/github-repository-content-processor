/**
 * Time constants used across the application.
 * All values are in milliseconds.
 */

/**
 * One second in milliseconds.
 */
export const ONE_SECOND_MS = 1000;

/**
 * One minute in milliseconds.
 */
export const ONE_MINUTE_MS = 60000;

/**
 * Default retry delay for failed requests (1 second).
 */
export const DEFAULT_RETRY_DELAY_MS = ONE_SECOND_MS;

/**
 * Default rate limit wait buffer (1 second).
 * Added to rate limit reset time to ensure the limit has truly reset.
 */
export const RATE_LIMIT_BUFFER_MS = ONE_SECOND_MS;

/**
 * Fallback wait time when rate limit reset time is unknown (1 minute).
 */
export const RATE_LIMIT_FALLBACK_WAIT_MS = ONE_MINUTE_MS;

/**
 * Default parallelism degree for batch operations.
 */
export const DEFAULT_MAX_PARALLEL = 10;
