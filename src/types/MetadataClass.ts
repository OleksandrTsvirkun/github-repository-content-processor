import {
  ArticleMetadata,
  ChapterMetadata,
  DirectoryMetadata,
  LocaleMetadata,
  MetadataType,
} from "./metadata";

/**
 * Base class for Metadata with common functionality.
 */
abstract class BaseMetadata<T extends MetadataType> {
  constructor(protected data: T) {}

  /**
   * Get the slug path (locale + slug segments).
   * Example: "en-US/chapter-1/section-1" or "en-US/chapter-1/article"
   */
  get slugPath(): string {
    return [this.data.locale, ...this.data.slug].join("/");
  }

  /**
   * Get the markdown file path for this metadata.
   * For article: "en-US/chapter-1/article.md"
   * For index: "en-US/chapter-1/index.md"
   */
  get mdPath(): string {
    if (this.type === "article") {
      // For articles, the last slug segment is the filename
      const segments = this.slugPath.split("/");
      const fileName = segments.pop();
      if (fileName) {
        return segments.length > 0 ? `${segments.join("/")}/${fileName}.md` : `${fileName}.md`;
      }
    }
    return `${this.slugPath}/index.md`;
  }

  /**
   * Get raw data.
   */
  get raw(): T {
    return this.data;
  }

  /**
   * Get ID.
   */
  get id(): string {
    return this.data.id;
  }

  /**
   * Get title.
   */
  get title(): string {
    return this.data.title;
  }

  /**
   * Get description.
   */
  get description(): string | undefined {
    return this.data.description;
  }

  /**
   * Get created_at timestamp.
   */
  get createdAt(): string {
    return this.data.created_at;
  }

  /**
   * Get updated_at timestamp.
   */
  get updatedAt(): string {
    return this.data.updated_at;
  }

  /**
   * Get type.
   */
  abstract get type(): MetadataType["type"];

  /**
   * Get slug.
   */
  get slug(): string[] {
    return this.data.slug;
  }

  get locale(): string {
    return this.data.locale;
  }
}

/**
 * Class representing Locale metadata.
 */
export class LocaleMetadataClass extends BaseMetadata<LocaleMetadata> {
  get type(): LocaleMetadata["type"] {
    return "locale";
  }

  get aliases(): string[] | undefined {
    return this.data.aliases;
  }
}

/**
 * Class representing Chapter metadata.
 */
export class ChapterMetadataClass extends BaseMetadata<ChapterMetadata> {
  get type(): ChapterMetadata["type"] {
    return "chapter";
  }
}

/**
 * Class representing Directory metadata.
 */
export class DirectoryMetadataClass extends BaseMetadata<DirectoryMetadata> {
  get type(): DirectoryMetadata["type"] {
    return "directory";
  }
}

/**
 * Class representing Article metadata.
 */
export class ArticleMetadataClass extends BaseMetadata<ArticleMetadata> {
  get type(): ArticleMetadata["type"] {
    return "article";
  }
}

export interface MetadataClassMap {
  locale: LocaleMetadataClass;
  chapter: ChapterMetadataClass;
  directory: DirectoryMetadataClass;
  article: ArticleMetadataClass;
}

export type MetadataClass = MetadataClassMap[keyof MetadataClassMap];
