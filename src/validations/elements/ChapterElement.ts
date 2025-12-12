import type { ElementType } from "../domain/ElementType";
import type FileStats from "../domain/FileStats";
import type { ChapterFullMetadata, ChapterFrontMatter, ChapterMetadata } from "../../types";
import type { ValidationError } from "../core/types";
import { ValidationErrorCode } from "../core/types";
import ContentPath from "../domain/ContentPath";
import LocaleElement from "./LocaleElement";
import DirectoryElement from "./DirectoryElement";
import ArticleElement from "./ArticleElement";
import IndexElement from "./IndexElement";
import type { ChildElement } from "./ChildElement";

/**
 * ChapterElement - represents a chapter in the content hierarchy
 * Can contain: ChapterElement, DirectoryElement, ArticleElement
 * Parent: LocaleElement or ChapterElement
 */
export default class ChapterElement extends IndexElement implements ChildElement {
  protected children: (ChapterElement | DirectoryElement | ArticleElement)[] = [];
  private parent: LocaleElement | ChapterElement;

  constructor(
    path: ContentPath,
    frontmatter: ChapterFrontMatter,
    stats: FileStats,
    parent: LocaleElement | ChapterElement
  ) {
    super(path, frontmatter, stats);
    this.parent = parent;
  }

  override get type(): ElementType {
    return "chapter";
  }

  /**
   * Add a child element
   * @param element - child element to add
   */
  addChild(element: ChapterElement | DirectoryElement | ArticleElement): void {
    this.children.push(element);
  }

  /**
   * Get all children
   * @returns readonly array of children
   */
  getChildren(): readonly (ChapterElement | DirectoryElement | ArticleElement)[] {
    return this.children;
  }

  /**
   * Get parent element
   * @returns parent locale or chapter
   */
  getParent(): LocaleElement | ChapterElement {
    return this.parent;
  }

  /**
   * Validate this chapter element
   * @returns array of validation errors
   */
  *validate(): Generator<ValidationError> {
    // Validate type
    if (this.frontmatter.type !== "chapter") {
      yield {
        message: `Invalid type for chapter. Expected "chapter", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.INVALID_TYPE,
        title: "Invalid Element Type",
      } satisfies ValidationError;
    }

    // Validate children
    for (const child of this.children) {
      yield* child.validate();
    }
  }

  /**
   * Generate full metadata with all children
   * Nested chapters include only metadata without their children
   * @returns ChapterFullMetadata
   */
  generateMetadata(): ChapterFullMetadata {
    const sortedChildren = this.sortChildren();

    const chapterFrontmatter = this.frontmatter as ChapterFrontMatter;

    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => {
        if (child instanceof ChapterElement) {
          // Nested chapter - only metadata without children
          return child.generateMetadataWithoutChildren();
        }
        return child.generateMetadata();
      }),
    };
  }

  /**
   * Generate metadata without children (for nested chapters)
   * @returns ChapterMetadata
   */
  generateMetadataWithoutChildren(): ChapterMetadata {
    const chapterFrontmatter = this.frontmatter as ChapterFrontMatter;

    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  /**
   * Generate metadata without articles and directories (only chapter hierarchy)
   * Used for locale index.json
   * @returns ChapterFullMetadata with only chapter children
   */
  generateMetadataWithoutArticles(): ChapterFullMetadata {
    // Filter only chapter children
    const chapterChildren = this.sortChildren().filter(
      (child) => child instanceof ChapterElement
    ) as ChapterElement[];

    const chapterFrontmatter = this.frontmatter as ChapterFrontMatter;

    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: chapterChildren.map((child) => child.generateMetadataWithoutArticles()),
    };
  }

  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor: unknown): void {
    if (visitor && typeof visitor === "object" && "visitChapter" in visitor) {
      (visitor as { visitChapter: (element: ChapterElement) => void }).visitChapter(this);
    }
  }

  /**
   * Sort children by fractional index
   * @returns sorted array of children
   */
  private sortChildren(): (ChapterElement | DirectoryElement | ArticleElement)[] {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[a.contentPath.segments.length - 1];
      const bSlug = b.contentPath.segments[b.contentPath.segments.length - 1];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
}
