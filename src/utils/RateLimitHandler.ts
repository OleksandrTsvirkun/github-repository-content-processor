import type { Octokit } from "@octokit/rest";
import { ONE_MINUTE_MS, RATE_LIMIT_BUFFER_MS, RATE_LIMIT_FALLBACK_WAIT_MS } from "./constants";
import { delay } from "./delay";

export interface RateLimitHandlerOptions {
  /**
   * Automatically wait when rate limit is reached.
   * @default true
   */
  autoWaitRateLimit?: boolean;

  /**
   * Minimum remaining rate limit before triggering wait.
   * @default 10
   */
  rateLimitThreshold?: number;
}

/**
 * Handles GitHub API rate limit checking and waiting.
 * Can execute operations with automatic rate limit management.
 */
export class RateLimitHandler {
  private autoWaitRateLimit: boolean;
  private rateLimitThreshold: number;
  private lastRateLimitCheck: Date | null = null;

  constructor(
    private octokit: Octokit,
    options: RateLimitHandlerOptions = {}
  ) {
    this.autoWaitRateLimit = options.autoWaitRateLimit ?? true;
    this.rateLimitThreshold = options.rateLimitThreshold ?? 10;
  }

  /**
   * Execute an async operation with automatic rate limit checking and waiting.
   * @param operation - Async function to execute
   * @param operationName - Name of operation for logging
   * @param requiredCalls - Number of API calls needed for this operation (defaults to 0)
   * @returns Result of successful operation
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = "operation",
    requiredCalls: number = 0
  ): Promise<T> {
    const totalRequiredCalls = requiredCalls + this.rateLimitThreshold;

    // Check rate limit before executing
    await this.ensureRateLimit(totalRequiredCalls, operationName);

    try {
      return await operation();
    } catch (error: unknown) {
      // If it's a rate limit error, wait and retry once
      if (error instanceof Error && this.isRateLimitError(error as Error & { status?: number })) {
        console.warn(`⚠️  Rate limit hit during ${operationName}, waiting...`);
        await this.handleRateLimitError(error as Error & { response?: { headers?: Record<string, string> } });

        // Retry once after handling rate limit
        return await operation();
      }

      // Re-throw non-rate-limit errors
      throw error;
    }
  }

  /**
   * Check if error is a rate limit error.
   */
  isRateLimitError(
    error: Error & {
      status?: number;
      response?: { headers?: Record<string, string> };
      message?: string;
    }
  ): boolean {
    return (
      // GitHub returns 429 for rate limit exceeded
      error?.status === 429 ||
      // GitHub can also return 403 with rate limit headers
      (error?.status === 403 &&
        (error?.response?.headers?.["x-ratelimit-remaining"] === "0" ||
          error?.message?.toLowerCase().includes("rate limit")))
    );
  }

  /**
   * Handle rate limit error by waiting for reset.
   */
  async handleRateLimitError(
    error: Error & { response?: { headers?: Record<string, string> } }
  ): Promise<void> {
    if (!this.autoWaitRateLimit) {
      throw error;
    }

    const resetHeader = error?.response?.headers?.["x-ratelimit-reset"];

    if (resetHeader) {
      const resetTime = parseInt(resetHeader) * 1000;
      const totalWaitMs = resetTime - Date.now();

      if (totalWaitMs > 0) {
        const resetDate = new Date(resetTime);

        // Use exponential backoff instead of waiting entire duration
        // Start with 1 minute, then 2, 4, 8, etc. until rate limit resets
        for (let attempt = 0; Date.now() < resetTime; attempt++) {
          const backoffDelay = Math.min(
            ONE_MINUTE_MS * Math.pow(2, attempt),
            totalWaitMs + RATE_LIMIT_BUFFER_MS
          );
          const waitMinutes = Math.ceil(backoffDelay / ONE_MINUTE_MS);

          console.error(
            `❌ Rate limit exceeded! ` +
              `Waiting ${waitMinutes} minute(s) (attempt ${attempt + 1}) until ${resetDate.toISOString()}`
          );

          await delay(backoffDelay);
        }

        console.log("✅ Rate limit reset, retrying...");
        return;
      }
    }

    // Fallback: use exponential backoff starting from 1 minute
    console.error("❌ Rate limit exceeded! Using exponential backoff...");
    await delay(RATE_LIMIT_FALLBACK_WAIT_MS);
  }

  /**
   * Ensure sufficient rate limit for a specific number of API calls.
   * Waits until rate limit is sufficient if needed.
   *
   * @param requiredCalls - Number of API calls needed
   * @param operationName - Optional name of operation for better logging
   * @returns true if had to wait, false otherwise
   */
  async ensureRateLimit(requiredCalls: number = 0, operationName?: string): Promise<boolean> {
    if (!this.autoWaitRateLimit) {
      return false;
    }

    requiredCalls = Math.max(requiredCalls + this.rateLimitThreshold, this.rateLimitThreshold);

    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      const { remaining, reset, limit } = data.rate;

      this.lastRateLimitCheck = new Date();

      const logMessage = operationName
        ? `Rate limit: ${remaining}/${limit} remaining (need ${requiredCalls} for ${operationName})`
        : `Rate limit: ${remaining}/${limit} remaining (need ${requiredCalls} for operation)`;

      console.log(logMessage);

      if (remaining < requiredCalls) {
        const resetTime = reset * 1000;
        const totalWaitMs = resetTime - Date.now();

        if (totalWaitMs > 0) {
          // Use exponential backoff instead of waiting entire duration
          // Start with 1 minute, then 2, 4, 8, etc. until rate limit resets
          for (let attempt = 0; Date.now() < resetTime; attempt++) {
            const backoffDelay = Math.min(
              ONE_MINUTE_MS * Math.pow(2, attempt),
              totalWaitMs + RATE_LIMIT_BUFFER_MS
            );
            const waitMinutes = Math.ceil(backoffDelay / ONE_MINUTE_MS);

            const warningMessage = operationName
              ? `⚠️  Insufficient rate limit for ${operationName} (${remaining}/${limit}, need ${requiredCalls}). ` +
                `Waiting ${waitMinutes} minute(s) (attempt ${attempt + 1}) until ${new Date(resetTime).toISOString()}`
              : `⚠️  Insufficient rate limit (${remaining}/${limit}, need ${requiredCalls}). ` +
                `Waiting ${waitMinutes} minute(s) (attempt ${attempt + 1}) until ${new Date(resetTime).toISOString()}`;

            console.warn(warningMessage);

            await delay(backoffDelay);

            // Re-check rate limit after waiting
            const { data: recheckData } = await this.octokit.rest.rateLimit.get();
            const newRemaining = recheckData.rate.remaining;

            console.log(`Rate limit after wait: ${newRemaining}/${limit} remaining`);

            if (newRemaining >= requiredCalls) {
              console.log("✅ Sufficient rate limit available, continuing...");
              return true;
            }
          }

          console.log("✅ Rate limit reset, continuing...");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn("Failed to check rate limit:", error);
      return false;
    }
  }

  /**
   * Get time since last rate limit check.
   */
  get timeSinceLastCheck(): number | null {
    return this.lastRateLimitCheck ? Date.now() - this.lastRateLimitCheck.getTime() : null;
  }
}
