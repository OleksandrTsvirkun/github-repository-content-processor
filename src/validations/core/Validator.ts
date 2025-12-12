import type { ValidationError } from "./types";
import type RepositoryElement from "../elements/RepositoryElement";

/**
 * Abstract base class for all validators.
 * Each validator is responsible for checking a specific aspect of content validity.
 */
export default abstract class Validator {
  /**
   * Validates a repository element and returns any errors found.
   * @param element - The element to validate
   * @returns Generator of validation errors (empty if valid)
   */
  abstract validate(element: RepositoryElement): Generator<ValidationError>;

  /**
   * Optional: Validates multiple elements at once for cross-element checks.
   * Default implementation validates each element independently.
   * @param elements - Iterable of elements to validate
   * @returns Generator of validation errors
   */
  *validateBatch(elements: Iterable<RepositoryElement>): Generator<ValidationError> {
    for (const element of elements) {
      yield* this.validate(element);
    }
  }

  /**
   * Gets the name of this validator for logging/debugging.
   */
  abstract get name(): string;
}
