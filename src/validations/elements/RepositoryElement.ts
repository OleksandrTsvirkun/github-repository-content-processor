import type { FrontMatter } from "../../types";
import ContentPath from "../domain/ContentPath";
import ULID from "../domain/ULID";
import type FileStats from "../domain/FileStats";
import type { ElementType } from "../domain/ElementType";
import type { ValidationError } from "../core/types";

/**
 * RepositoryElement - base abstract class for all content elements
 */
export default abstract class RepositoryElement {
  constructor(
    protected readonly path: ContentPath,
    protected readonly frontmatter: FrontMatter,
    protected readonly stats: FileStats
  ) {}

  abstract get type(): ElementType;

  abstract validate(): Generator<ValidationError>;

  abstract generateMetadata(): unknown;

  abstract accept(visitor: unknown): void;

  abstract get markdownFilePath(): string;

  get id(): ULID {
    return ULID.from(this.frontmatter.id);
  }

  get slug(): string[] {
    return this.path.path;
  }

  get createdAt(): Date {
    return this.stats.createdAt;
  }

  get updatedAt(): Date {
    return this.stats.updatedAt;
  }

  get contentPath(): ContentPath {
    return this.path;
  }
}
