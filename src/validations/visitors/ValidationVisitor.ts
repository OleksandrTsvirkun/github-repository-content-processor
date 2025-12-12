import ContentVisitor from "./ContentVisitor";
import type LocaleElement from "../elements/LocaleElement";
import type ChapterElement from "../elements/ChapterElement";
import type DirectoryElement from "../elements/DirectoryElement";
import type ArticleElement from "../elements/ArticleElement";
import { ValidationError } from "../core/types";

/**
 * Visitor that collects validation errors from repository elements.
 * Traverses the element tree and validates each element.
 */
export default class ValidationVisitor implements ContentVisitor {
  private errors: ValidationError[] = [];

  /**
   * Gets all collected validation errors.
   */
  getErrors(): ReadonlyArray<ValidationError> {
    return this.errors;
  }

  /**
   * Clears all collected errors.
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Checks if any errors were found.
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  visitLocale(element: LocaleElement): void {
    const elementErrors = element.validate();
    this.errors.push(...elementErrors);

    // Visit all chapter children
    const children = element["children"];
    for (const child of children) {
      child.accept(this);
    }
  }

  visitChapter(element: ChapterElement): void {
    const elementErrors = element.validate();
    this.errors.push(...elementErrors);

    // Visit all children
    const children = element["children"];
    for (const child of children) {
      child.accept(this);
    }
  }

  visitDirectory(element: DirectoryElement): void {
    const elementErrors = element.validate();
    this.errors.push(...elementErrors);

    // Visit all children
    const children = element["children"];
    for (const child of children) {
      child.accept(this);
    }
  }

  visitArticle(element: ArticleElement): void {
    const elementErrors = element.validate();
    this.errors.push(...elementErrors);
  }
}
