import type LocaleElement from "../elements/LocaleElement";
import type ChapterElement from "../elements/ChapterElement";
import type DirectoryElement from "../elements/DirectoryElement";
import type ArticleElement from "../elements/ArticleElement";

/**
 * Visitor interface for traversing repository elements.
 * Implements the Visitor pattern for processing different element types.
 */
export default interface ContentVisitor {
  /**
   * Visit a locale element.
   */
  visitLocale(element: LocaleElement): void;

  /**
   * Visit a chapter element.
   */
  visitChapter(element: ChapterElement): void;

  /**
   * Visit a directory element.
   */
  visitDirectory(element: DirectoryElement): void;

  /**
   * Visit an article element.
   */
  visitArticle(element: ArticleElement): void;
}
