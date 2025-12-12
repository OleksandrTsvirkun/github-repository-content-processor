import ChapterElement from "./ChapterElement";
import DirectoryElement from "./DirectoryElement";
import LocaleElement from "./LocaleElement";

export interface ChildElement {
  /**
   * Get parent element
   * @returns parent locale or chapter
   */
  getParent(): LocaleElement | ChapterElement | DirectoryElement;
}
