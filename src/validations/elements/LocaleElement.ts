import type { ElementType } from "../domain/ElementType";
import type FileStats from "../domain/FileStats";
import type { LocaleFullMetadata, LocaleFrontMatter } from "../../types";
import { ValidationError, ValidationErrorCode } from "../core/types";
import ContentPath from "../domain/ContentPath";
import ChapterElement from "./ChapterElement";
import IndexElement from "./IndexElement";

/**
 * LocaleElement - represents a locale (e.g., en-US, uk-UA)
 * Can only contain ChapterElement children
 */
export default class LocaleElement extends IndexElement {
  protected children: ChapterElement[] = [];

  constructor(path: ContentPath, frontmatter: LocaleFrontMatter, stats: FileStats) {
    super(path, frontmatter, stats);
  }

  get type(): ElementType {
    return "locale";
  }

  get markdownFilePath(): string {
    return [this.path.locale, "index.md"].join("/");
  }

  get jsonFilePath(): string {
    return [this.path.locale, "index.json"].join("/");
  }

  /**
   * Add a chapter to this locale
   * @param chapter - ChapterElement to add
   * @throws Error if trying to add non-chapter element
   */
  addChild(chapter: ChapterElement): void {
    if (chapter.type !== "chapter") {
      throw new Error("Locale can only contain chapters");
    }
    this.children.push(chapter);
  }

  /**
   * Get all children
   * @returns readonly array of chapters
   */
  getChildren(): readonly ChapterElement[] {
    return this.children;
  }

  /**
   * Validate this locale element
   * @returns array of validation errors
   */
  *validate() {
    // Validate frontmatter type
    if (this.frontmatter.type !== "locale") {
      yield {
        message: `Invalid type for locale. Expected "locale", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.INVALID_TYPE,
        title: "Invalid Element Type",
      } satisfies ValidationError;
    }

    // Validate locale format
    if (!ContentPath.isValidLocale(this.path.locale)) {
      yield {
        message: `Invalid locale format: ${this.path.locale}. Expected format: xx-XX (e.g., en-US)`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.INVALID_LOCALE_FORMAT,
        title: "Invalid Locale Format",
      } satisfies ValidationError;
    }

    // Validate children
    for (const child of this.children) {
      yield* child.validate();
    }
  }

  /**
   * Generate metadata for this locale
   * Children include only chapter hierarchy without articles/directories
   * @returns LocaleFullMetadata
   */
  generateMetadata(): LocaleFullMetadata {
    const sortedChildren = this.sortChildren();

    const localeFrontmatter = this.frontmatter as LocaleFrontMatter;

    return {
      id: this.id.toString(),
      title: localeFrontmatter.title,
      description: localeFrontmatter.description,
      cover_url: localeFrontmatter.cover_url,
      type: "locale",
      aliases: localeFrontmatter.aliases,
      locale: this.path.locale,
      slug: [],
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => child.generateMetadataWithoutArticles()),
    };
  }

  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor: unknown): void {
    // Will be properly typed when visitor is implemented
    if (visitor && typeof visitor === "object" && "visitLocale" in visitor) {
      (visitor as { visitLocale: (element: LocaleElement) => void }).visitLocale(this);
    }
  }

  /**
   * Sort children by fractional index
   * @returns sorted array of chapters
   */
  private sortChildren(): ChapterElement[] {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[0];
      const bSlug = b.contentPath.segments[0];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
}
