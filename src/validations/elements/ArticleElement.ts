import RepositoryElement from "./RepositoryElement";
import type { ElementType } from "../domain/ElementType";
import type FileStats from "../domain/FileStats";
import type { ArticleMetadata, ArticleFrontMatter } from "../../types";
import { ValidationError, ValidationErrorCode } from "../core/types";
import ContentPath from "../domain/ContentPath";
import ChapterElement from "./ChapterElement";
import DirectoryElement from "./DirectoryElement";
import type { ChildElement } from "./ChildElement";

/**
 * ArticleElement - represents an article in the content hierarchy
 * Cannot have children
 * Parent: ChapterElement or DirectoryElement
 */
export default class ArticleElement extends RepositoryElement implements ChildElement {
  private parent: ChapterElement | DirectoryElement;

  constructor(
    path: ContentPath,
    frontmatter: ArticleFrontMatter,
    stats: FileStats,
    parent: ChapterElement | DirectoryElement
  ) {
    super(path, frontmatter, stats);
    this.parent = parent;
  }

  override get type(): ElementType {
    return "article";
  }

  override get markdownFilePath(): string {
    const segments = this.path.segments.slice(0, -1);
    const last = this.path.segments.at(-1);

    if (last) {
      return [this.path.locale, ...segments.map((x) => x.full), `${last}.md`].join("/");
    }

    throw new Error("Invalid path: missing last segment");
  }

  /**
   * Get parent element
   * @returns parent chapter or directory
   */
  getParent(): ChapterElement | DirectoryElement {
    return this.parent;
  }

  /**
   * Validate this article element
   * @returns array of validation errors
   */
  override *validate(): Generator<ValidationError> {
    // Validate type (can be undefined or "article")
    if (this.frontmatter.type && this.frontmatter.type !== "article") {
      yield {
        message: `Invalid type for article. Expected "article" or undefined, got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: ValidationErrorCode.INVALID_TYPE,
        title: "Invalid Element Type",
        suggestion: 'Remove type field or set it to "article"',
      } satisfies ValidationError;
    }
  }

  /**
   * Generate metadata for this article
   * @returns ArticleMetadata
   */
  override generateMetadata(): ArticleMetadata {
    const articleFrontmatter = this.frontmatter as ArticleFrontMatter;

    return {
      id: this.id.toString(),
      title: articleFrontmatter.title,
      description: articleFrontmatter.description,
      cover_url: articleFrontmatter.cover_url,
      type: "article",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  override accept(visitor: unknown): void {
    if (visitor && typeof visitor === "object" && "visitArticle" in visitor) {
      (visitor as { visitArticle: (element: ArticleElement) => void }).visitArticle(this);
    }
  }
}
