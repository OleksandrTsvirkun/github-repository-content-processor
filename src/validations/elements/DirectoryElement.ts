import type { ElementType } from "../domain/ElementType";
import type FileStats from "../domain/FileStats";
import type { DirectoryFullMetadata, DirectoryFrontMatter } from "../../types";
import type { ValidationError } from "../core/types";
import { ValidationErrorCode } from "../core/types";
import ContentPath from "../domain/ContentPath";
import ChapterElement from "./ChapterElement";
import ArticleElement from "./ArticleElement";
import IndexElement from "./IndexElement";
import type { ChildElement } from "./ChildElement";

/**
 * DirectoryElement - represents a directory in the content hierarchy
 * Can contain: DirectoryElement, ArticleElement (NOT ChapterElement!)
 * Parent: ChapterElement or DirectoryElement
 */
export default class DirectoryElement extends IndexElement implements ChildElement {
  protected children: (DirectoryElement | ArticleElement)[] = [];
  private parent: ChapterElement | DirectoryElement;

  constructor(
    path: ContentPath,
    frontmatter: DirectoryFrontMatter,
    stats: FileStats,
    parent: ChapterElement | DirectoryElement
  ) {
    super(path, frontmatter, stats);
    this.parent = parent;
  }

  get type(): ElementType {
    return "directory";
  }

  /**
   * Add a child element
   * @param element - child element to add
   * @throws Error if trying to add chapter
   */
  addChild(element: DirectoryElement | ArticleElement): void {
    if (element.type === "chapter") {
      throw new Error("Directory cannot contain chapters");
    }
    this.children.push(element);
  }

  /**
   * Get all children
   * @returns readonly array of children
   */
  getChildren(): readonly (DirectoryElement | ArticleElement)[] {
    return this.children;
  }

  /**
   * Get parent element
   * @returns parent chapter or directory
   */
  getParent(): ChapterElement | DirectoryElement {
    return this.parent;
  }

  /**
   * Validate this directory element
   * @returns array of validation errors
   */
  *validate(): Generator<ValidationError> {
    // Validate type
    if (this.frontmatter.type !== "directory") {
      yield {
        message: `Invalid type for directory. Expected "directory", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.INVALID_TYPE,
        title: "Invalid Element Type",
      } satisfies ValidationError;
    }

    // Validate no chapters in children
    const hasChapters = this.children.some((child) => child.type === "chapter");
    if (hasChapters) {
      yield {
        message: "Directory cannot contain chapters",
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.DIRECTORY_CONTAINS_CHAPTER,
        title: "Invalid Hierarchy",
        suggestion: 'Change parent type to "chapter" or remove chapter children',
      } satisfies ValidationError;
    }

    // Validate children
    for (const child of this.children) {
      yield* child.validate();
    }
  }

  /**
   * Generate full metadata with all children
   * @returns DirectoryFullMetadata
   */
  generateMetadata(): DirectoryFullMetadata {
    const sortedChildren = this.sortChildren();

    const directoryFrontmatter = this.frontmatter as DirectoryFrontMatter;

    return {
      id: this.id.toString(),
      title: directoryFrontmatter.title,
      description: directoryFrontmatter.description,
      cover_url: directoryFrontmatter.cover_url,
      type: "directory",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => child.generateMetadata()),
    };
  }

  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor: unknown): void {
    if (visitor && typeof visitor === "object" && "visitDirectory" in visitor) {
      (visitor as { visitDirectory: (element: DirectoryElement) => void }).visitDirectory(this);
    }
  }

  /**
   * Sort children by fractional index
   * @returns sorted array of children
   */
  private sortChildren(): (DirectoryElement | ArticleElement)[] {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[a.contentPath.segments.length - 1];
      const bSlug = b.contentPath.segments[b.contentPath.segments.length - 1];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
}
