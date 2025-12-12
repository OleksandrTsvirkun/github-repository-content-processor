/**
 * Domain interfaces following SOLID principles
 */

import type {
  FrontMatter,
  ArticleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  LocaleFrontMatter,
} from './frontmatter';
import type {
  Metadata,
  ArticleMetadata,
  ChapterMetadata,
  DirectoryMetadata,
  LocaleMetadata,
  Parents,
} from './metadata';
import type { FileValidationResult } from './validation';

/**
 * Interface for file information loaded from disk
 */
export interface IFileInfo {
  readonly frontmatter: FrontMatter;
  readonly content: string;
  readonly path: string;
}

/**
 * Interface for Git metadata
 */
export interface IGitMetadata {
  readonly created_at: string;
  readonly updated_at: string;
  readonly sha: string;
  readonly size: number;
}

/**
 * Interface for file loading operations (Dependency Inversion)
 */
export interface IFileLoader {
  loadFile(filePath: string): Promise<IFileInfo>;
  fileExists(filePath: string): Promise<boolean>;
}

/**
 * Interface for Git operations
 */
export interface IGitMetadataProvider {
  getMetadata(filePath: string, repoRoot: string): Promise<IGitMetadata>;
}

/**
 * Interface for metadata builder (Single Responsibility)
 */
export interface IMetadataBuilder<TFrontMatter extends FrontMatter, TMetadata extends Metadata> {
  build(
    frontmatter: TFrontMatter,
    gitMetadata: IGitMetadata,
    locale: string,
    slug: string[]
  ): TMetadata;
}

/**
 * Interface for JSON file writer
 */
export interface IJsonWriter {
  write<T>(filePath: string, data: T): Promise<void>;
  read<T>(filePath: string): Promise<T | null>;
}

/**
 * Type guard for frontmatter types
 */
export interface IFrontMatterTypeGuard {
  isArticle(frontmatter: FrontMatter): frontmatter is ArticleFrontMatter;
  isChapter(frontmatter: FrontMatter): frontmatter is ChapterFrontMatter;
  isDirectory(frontmatter: FrontMatter): frontmatter is DirectoryFrontMatter;
  isLocale(frontmatter: FrontMatter): frontmatter is LocaleFrontMatter;
}

/**
 * Interface for metadata type guards
 */
export interface IMetadataTypeGuard {
  isArticle(metadata: Metadata): metadata is ArticleMetadata;
  isChapter(metadata: Metadata): metadata is ChapterMetadata;
  isDirectory(metadata: Metadata): metadata is DirectoryMetadata;
  isLocale(metadata: Metadata): metadata is LocaleMetadata;
}

/**
 * Interface for child metadata (can appear in parent collections)
 */
export type ChildMetadata = ArticleMetadata | ChapterMetadata | DirectoryMetadata;

/**
 * Interface for sorting operations
 */
export interface IMetadataSorter {
  sort<T extends ChildMetadata>(items: T[]): T[];
}

/**
 * Interface for ancestor chain builder
 */
export interface IAncestorBuilder {
  buildAncestors(localeName: string, slugPath: string[], repoRoot: string): Promise<Parents[]>;
}
