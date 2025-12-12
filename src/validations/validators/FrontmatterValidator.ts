import { ValidationErrorCode, type ValidationError } from "../core/types";
import RepositoryElement from "../elements/RepositoryElement";
import LocaleElement from "../elements/LocaleElement";
import ChapterElement from "../elements/ChapterElement";
import DirectoryElement from "../elements/DirectoryElement";
import ArticleElement from "../elements/ArticleElement";
import Validator from "../core/Validator";

/**
 * Validates frontmatter metadata in content files.
 * Checks for required fields, valid types, and proper metadata structure.
 */
export default class FrontmatterValidator extends Validator {
  get name(): string {
    return "FrontmatterValidator";
  }

  *validate(element: RepositoryElement): Generator<ValidationError> {
    const frontmatter = element["frontmatter"];
    const path = element["path"];

    // Check based on element type
    if (element instanceof LocaleElement) {
      yield* this.validateLocale(frontmatter, path.path);
    } else if (element instanceof ChapterElement) {
      yield* this.validateChapter(frontmatter, path.path);
    } else if (element instanceof DirectoryElement) {
      yield* this.validateDirectory(frontmatter, path.path);
    } else if (element instanceof ArticleElement) {
      yield* this.validateArticle(frontmatter, path.path);
    }
  }

  private *validateLocale(frontmatter: any, path: string[]): Generator<ValidationError> {
    // Type must be "locale"
    if (frontmatter.type !== "locale") {
      yield this.createError(
        ValidationErrorCode.INVALID_FRONTMATTER_TYPE,
        `Locale must have type="locale", got "${frontmatter.type}"`,
        path
      );
    }

    // Title is required
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        ValidationErrorCode.MISSING_REQUIRED_FIELD,
        "Locale must have a title",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Locale description must be a string",
        path
      );
    }

    // Title is required
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        ValidationErrorCode.MISSING_REQUIRED_FIELD,
        "Locale must have a title",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Locale description must be a string",
        path
      );
    }
  }

  private *validateChapter(frontmatter: any, path: string[]): Generator<ValidationError> {
    // Type must be "chapter"
    if (frontmatter.type !== "chapter") {
      yield this.createError(
        ValidationErrorCode.INVALID_FRONTMATTER_TYPE,
        `Chapter must have type="chapter", got "${frontmatter.type}"`,
        path
      );
    }

    // Title is required
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        ValidationErrorCode.MISSING_REQUIRED_FIELD,
        "Chapter must have a title",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Chapter description must be a string",
        path
      );
    }
  }

  private *validateDirectory(frontmatter: any, path: string[]): Generator<ValidationError> {
    // Type must be "directory"
    if (frontmatter.type !== "directory") {
      yield this.createError(
        ValidationErrorCode.INVALID_FRONTMATTER_TYPE,
        `Directory must have type="directory", got "${frontmatter.type}"`,
        path
      );
    }

    // Title is required
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        ValidationErrorCode.MISSING_REQUIRED_FIELD,
        "Directory must have a title",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Directory description must be a string",
        path
      );
    }
  }

  private *validateArticle(frontmatter: any, path: string[]): Generator<ValidationError> {
    // Type is optional for articles, but if present must be "article"
    if (frontmatter.type && frontmatter.type !== "article") {
      yield this.createError(
        ValidationErrorCode.INVALID_FRONTMATTER_TYPE,
        `Article type must be "article" if specified, got "${frontmatter.type}"`,
        path
      );
    }

    // Title is required
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        ValidationErrorCode.MISSING_REQUIRED_FIELD,
        "Article must have a title",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Article description must be a string",
        path
      );
    }

    // Description is optional but must be string if present
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        ValidationErrorCode.INVALID_FIELD_TYPE,
        "Article description must be a string",
        path
      );
    }
  }

  private createError(code: ValidationErrorCode, message: string, path: string[]): ValidationError {
    return {
      code,
      message,
      path: path.join("/"),
      start: { line: 1, column: 1, offset: 0 }, // Frontmatter is at top
      severity: "error",
    };
  }
}
