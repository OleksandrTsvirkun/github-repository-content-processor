import { type ValidationError, ValidationErrorCode } from "../core/types";
import type RepositoryElement from "../elements/RepositoryElement";
import Validator from "../core/Validator";

/**
 * Validates file naming conventions.
 * Checks that filenames follow the fractional index format: <number><letters>-<slug>
 * where letters are mandatory and slug contains only lowercase letters, digits, and hyphens.
 */
export default class FileNameValidator extends Validator {
  private static readonly FILENAME_PATTERN = /^(\d+)([a-z]+)-([a-z0-9-]+)$/;
  private static readonly LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;

  get name(): string {
    return "FileNameValidator";
  }

  *validate(element: RepositoryElement): Generator<ValidationError> {
    const path = element["path"];
    const segments = path.segments;

    // Validate locale format (first segment is locale, not a slug)
    const locale = path.locale;
    if (!FileNameValidator.LOCALE_PATTERN.test(locale)) {
      yield {
        code: ValidationErrorCode.INVALID_FILE_NAME,
        message: `Invalid locale format: "${locale}". Expected format: xx-XX (e.g., en-US, uk-UA)`,
        path: path.path.join("/"),
        start: { line: 0, column: 0, offset: 0 },
        severity: "error",
      };
    }

    // Validate each segment (slug)
    for (let i = 0; i < segments.length; i++) {
      const slug = segments[i];
      if (!slug) continue;

      const fullSlug = slug.full;
      const match = FileNameValidator.FILENAME_PATTERN.exec(fullSlug);

      if (!match) {
        yield {
          code: ValidationErrorCode.INVALID_FILE_NAME,
          message: `Invalid filename format: "${fullSlug}". Expected format: <number><letters>-<name> (e.g., 1a-intro, 2b-advanced). Letters are mandatory.`,
          path: path.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error",
        };
        continue;
      }

      const [, , letters, name] = match;

      // Validate letters are present (should be caught by regex but double-check)
      if (!letters || letters.length === 0) {
        yield {
          code: ValidationErrorCode.INVALID_FILE_NAME,
          message: `Fractional index must include letters: "${fullSlug}". Letters are mandatory (e.g., 1a, 2b, 10aa).`,
          path: path.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error",
        };
      }

      // Validate name contains only allowed characters
      if (name && !/^[a-z0-9-]+$/.test(name)) {
        yield {
          code: ValidationErrorCode.INVALID_FILE_NAME,
          message: `Slug name contains invalid characters: "${name}". Only lowercase letters, digits, and hyphens are allowed.`,
          path: path.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error",
        };
      }

      // Validate name doesn't start or end with hyphen
      if (name && (name.startsWith("-") || name.endsWith("-"))) {
        yield {
          code: ValidationErrorCode.INVALID_FILE_NAME,
          message: `Slug name cannot start or end with hyphen: "${name}"`,
          path: path.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error",
        };
      }

      // Validate name doesn't contain consecutive hyphens
      if (name && name.includes("--")) {
        yield {
          code: ValidationErrorCode.INVALID_FILE_NAME,
          message: `Slug name cannot contain consecutive hyphens: "${name}"`,
          path: path.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error",
        };
      }
    }
  }
}
