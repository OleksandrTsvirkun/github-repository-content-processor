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
  sha: string;
  size: number;
  validationResult?: FileValidationResult;
}

export interface LocaleMetadata extends LocaleFrontMatter, BaseMetadata {
  slug: [];
}

export interface ArticleMetadata extends ArticleFrontMatter, BaseMetadata {}

export interface DirectoryMetadata extends DirectoryFrontMatter, BaseMetadata {}

export interface ChapterMetadata extends ChapterFrontMatter, BaseMetadata {}

interface Parent {
  children: Metadata[];
}

// index.json type: directory
export interface DirectoryFullMetadata extends DirectoryMetadata, Parent {
  children: (ArticleMetadata | DirectoryFullMetadata)[];
}

export interface DirectoryShallowMetadata extends DirectoryMetadata, Parent {
  children: (ArticleMetadata | DirectoryMetadata)[];
}

// index.json type: chapter
export interface ChapterFullMetadata extends ChapterMetadata, Parent {
  children: (DirectoryFullMetadata | ArticleMetadata | ChapterMetadata)[];
}

export interface ChapterShallowMetadata extends ChapterMetadata, Parent {
  children: (DirectoryMetadata | ArticleMetadata | ChapterMetadata)[];
}

// index.json type: locale
export interface LocaleFullMetadata extends LocaleMetadata, Parent {
  children: ChapterFullMetadata[];
}

export interface LocaleShallowMetadata extends LocaleMetadata, Parent {
  children: ChapterMetadata[];
}

export interface FullIndexMap {
  locale: LocaleFullMetadata;
  chapter: ChapterFullMetadata;
  directory: DirectoryFullMetadata;
}


export interface ShallowIndexMap {
  locale: LocaleShallowMetadata;
  chapter: ChapterShallowMetadata;
  directory: DirectoryShallowMetadata;
}

export interface MetadataMap {
  locale: LocaleMetadata;
  chapter: ChapterMetadata;
  directory: DirectoryMetadata;
  article: ArticleMetadata;
}

export interface ParentMap {
  locale: LocaleMetadata;
  chapter: ChapterMetadata;
  directory: DirectoryMetadata;
}

export type FullIndex = FullIndexMap[keyof FullIndexMap];
export type ShallowIndex = ShallowIndexMap[keyof ShallowIndexMap];

export type Metadata = MetadataMap[keyof MetadataMap];
export type Parents = ParentMap[keyof ParentMap];
