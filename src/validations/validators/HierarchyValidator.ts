import { ValidationError, ValidationErrorCode } from "../core/types";
import type RepositoryElement from "../elements/RepositoryElement";
import LocaleElement from "../elements/LocaleElement";
import ChapterElement from "../elements/ChapterElement";
import DirectoryElement from "../elements/DirectoryElement";
import ArticleElement from "../elements/ArticleElement";
import Validator from "../core/Validator";
import { ValidationSeverity } from "../../types";

/**
 * Validates content hierarchy rules.
 *
 * Rules:
 * - Locale can only contain Chapters
 * - Chapter can contain Chapters, Directories, and Articles
 * - Directory can only contain Directories and Articles (NO Chapters)
 * - Article is a leaf node (no children)
 */
export default class HierarchyValidator extends Validator {
  get name(): string {
    return "HierarchyValidator";
  }

  *validate(element: RepositoryElement): Generator<ValidationError> {
    const path = element["path"];

    if (element instanceof LocaleElement) {
      // Locale should only contain chapters
      const children = element["children"];
      for (const child of children) {
        if (!(child instanceof ChapterElement)) {
          const childElement = child as RepositoryElement;
          yield {
            code: ValidationErrorCode.INVALID_HIERARCHY,
            message: `Locale can only contain Chapters. Found ${childElement.type} at ${childElement["path"].path.join("/")}`,
            path: path.path.join("/"),
            start: { line: 0, column: 0, offset: 0 },
            severity: "error",
          };
        }
      }
    } else if (element instanceof ChapterElement) {
      // Chapter can contain chapters, directories, and articles - all valid
      // No specific validation needed here
    } else if (element instanceof DirectoryElement) {
      // Directory cannot contain chapters
      const children = element["children"];
      for (const child of children) {
        if (child instanceof ChapterElement) {
          const childElement = child as ChapterElement;
          yield {
            code: ValidationErrorCode.INVALID_HIERARCHY,
            message: `Directory cannot contain Chapters. Found Chapter at ${childElement["path"].path.join("/")}`,
            path: path.path.join("/"),
            start: { line: 0, column: 0, offset: 0 },
            severity: "error",
          };
        }
      }
    } else if (element instanceof ArticleElement) {
      // Article is a leaf - no children to validate
    }
  }

  /**
   * Override validateBatch to check parent-child relationships across elements.
   */
  override *validateBatch(elements: RepositoryElement[]): Generator<ValidationError> {
    const errors = super.validateBatch(elements);

    // Build element map for quick lookup
    const elementMap = new Map<string, RepositoryElement>();
    for (const element of elements) {
      const path = element["path"];
      elementMap.set(path.path.join("/"), element);
    }

    // Check parent-child type compatibility
    for (const element of elements) {
      const path = element["path"];
      const parentPath = path.getParent();

      if (!parentPath) {
        // This is a locale (root), skip parent check
        continue;
      }

      const parent = elementMap.get(parentPath.path.join("/"));
      if (!parent) {
        // Parent not in current batch, skip
        continue;
      }

      // Check if this element type is allowed under parent
      if (parent instanceof DirectoryElement && element instanceof ChapterElement) {
        yield {
          code: ValidationErrorCode.INVALID_HIERARCHY,
          message: `Chapter cannot be placed under Directory. Path: ${path.path.join("/")}`,
          path: path.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: ValidationSeverity.Error,
        } satisfies ValidationError;
      }

      if (parent instanceof ArticleElement) {
        yield {
          code: ValidationErrorCode.INVALID_HIERARCHY,
          message: `Article cannot contain children. Path: ${path.path.join("/")}`,
          path: parentPath.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: ValidationSeverity.Error,
        } satisfies ValidationError;
      }

      if (parent instanceof LocaleElement && !(element instanceof ChapterElement)) {
        yield {
          code: ValidationErrorCode.INVALID_HIERARCHY,
          message: `Locale can only contain Chapters. Found ${element.type} at ${path.path.join("/")}`,
          path: path.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: ValidationSeverity.Error,
        } satisfies ValidationError;
      }
    }

    return errors;
  }
}
