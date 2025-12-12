import {
  ArticleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  LocaleFrontMatter,
} from "./frontmatter";
import { FileValidationResult } from "./validation";

export interface BaseMetadata {
  locale: string;
  slug: string[];
  created_at: string;
  updated_at: string;
  validationResult?: FileValidationResult;
}

export interface LocaleMetadata extends LocaleFrontMatter, BaseMetadata {
  slug: [];
}

export interface ArticleMetadata extends ArticleFrontMatter, BaseMetadata {}

export interface DirectoryMetadata extends DirectoryFrontMatter, BaseMetadata {}

export interface ChapterMetadata extends ChapterFrontMatter, BaseMetadata {}

// index.json type: directory
export interface DirectoryFullMetadata extends DirectoryMetadata {
  children: (ArticleMetadata | DirectoryMetadata)[];
}

// index.json type: chapter
export interface ChapterFullMetadata extends ChapterMetadata {
  children: (DirectoryFullMetadata | ArticleMetadata | ChapterMetadata)[];
}

// index.json type: locale
export interface LocaleFullMetadata extends LocaleMetadata {
  children: ChapterFullMetadata[];
}

export interface IndexMap {
  locale: LocaleFullMetadata;
  chapter: ChapterFullMetadata;
  directory: DirectoryFullMetadata;
}

export interface MetadataMap {
  locale: LocaleMetadata;
  chapter: ChapterMetadata;
  directory: DirectoryMetadata;
  article: ArticleMetadata;
}

export type IndexType = IndexMap[keyof IndexMap];

export type MetadataType = MetadataMap[keyof MetadataMap];
