import { ONE_SECOND_MS } from "./constants";
import type { RateLimitHandler } from "./RateLimitHandler";
import { delay } from "./delay";

export interface RetryHandlerOptions {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay between retries in milliseconds.
   * Uses exponential backoff: delay * 2^attempt
   * @default 1000
   */
  retryDelayMs?: number;

  /**
   * Optional rate limit handler for handling rate limit errors.
   */
  rateLimitHandler?: RateLimitHandler;

  /**
   * Optional callback for logging retry attempts.
   */
  onRetry?: (attempt: number, maxRetries: number, delay: number, error: Error) => void;
}

/**
 * Utility for executing operations with exponential backoff retry logic.
 * Handles both regular errors and rate limit errors differently.
 */
export class RetryHandler {
  private _maxRetries: number;
  private _retryDelayMs: number;
  private rateLimitHandler?: RateLimitHandler;
  private onRetry?: (attempt: number, maxRetries: number, delay: number, error: Error) => void;

  constructor(options: RetryHandlerOptions = {}) {
    this._maxRetries = options.maxRetries ?? 3;
    this._retryDelayMs = options.retryDelayMs ?? ONE_SECOND_MS;
    this.rateLimitHandler = options.rateLimitHandler;
    this.onRetry = options.onRetry;
  }

  /**
   * Execute an async operation with retry logic.
   * @param operation - Async function to execute
   * @param operationName - Name of operation for logging
   * @returns Result of successful operation
   * @throws Error after max retries exhausted
   */
  async execute<T>(operation: () => Promise<T>, operationName: string = "operation"): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        if (this.rateLimitHandler?.isRateLimitError(error)) {
          console.warn(`⚠️  Rate limit hit during ${operationName}`);
          await this.rateLimitHandler.handleRateLimitError(error);
          // Don't count rate limit as retry attempt
          attempt--;
          continue;
        }

        // If this was the last attempt, throw
        if (attempt === this._maxRetries) {
          console.error(
            `❌ Failed ${operationName} after ${this._maxRetries} retries: ${error.message}`
          );
          throw new Error(
            `Failed ${operationName} after ${this._maxRetries} retries: ${error.message}`
          );
        }

        // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delayMs = this._retryDelayMs * Math.pow(2, attempt);

        // Log retry attempt
        if (this.onRetry) {
          this.onRetry(attempt + 1, this._maxRetries, delayMs, error);
        } else {
          console.warn(
            `⚠️  Retry ${attempt + 1}/${this._maxRetries} for ${operationName} after ${delayMs}ms (${error.message})`
          );
        }

        await delay(delayMs);
      }
    }

    // Should never reach here, but just in case
    throw lastError || new Error(`Failed ${operationName} after ${this._maxRetries} retries`);
  }

  /**
   * Get max retries.
   */
  get maxRetries(): number {
    return this._maxRetries;
  }

  /**
   * Get retry delay in milliseconds.
   */
  get retryDelayMs(): number {
    return this._retryDelayMs;
  }
}
