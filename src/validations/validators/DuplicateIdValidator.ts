import { type ValidationError, ValidationErrorCode } from "../core/types";
import type RepositoryElement from "../elements/RepositoryElement";
import Validator from "../core/Validator";

/**
 * Validates that all element IDs (ULIDs) are unique across the repository.
 * This validator requires batch validation to check across multiple elements.
 */
export default class DuplicateIdValidator extends Validator {
  get name(): string {
    return "DuplicateIdValidator";
  }

  /**
   * Single element validation cannot detect duplicates.
   * Returns empty array - use validateBatch instead.
   */
  *validate(_element: RepositoryElement): Generator<ValidationError> {
    // No validation errors for single element (cannot detect duplicates)
    // Yield nothing
  }

  /**
   * Validates that all IDs are unique across the batch.
   */
  *validateBatch(elements: RepositoryElement[]): Generator<ValidationError> {
    const idMap = new Map<string, string[]>(); // id -> paths

    // Collect all IDs and their paths
    for (const element of elements) {
      const id = element.id.toString();
      const path = element["path"].path.join("/");

      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id)!.push(path);
    }

    // Check for duplicates
    for (const [id, paths] of idMap.entries()) {
      if (paths.length > 1) {
        // Found duplicate ID
        for (const path of paths) {
          yield {
            code: ValidationErrorCode.DUPLICATE_ID,
            message: `Duplicate ID "${id}" found at multiple paths: ${paths.join(", ")}`,
            path,
            start: { line: 1, column: 1, offset: 0 }, // ID is in frontmatter at top
            severity: "error",
          };
        }
      }
    }
  }
}
