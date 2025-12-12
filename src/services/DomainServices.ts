/**
 * Concrete implementations of domain interfaces
 */

import type {
  IFrontMatterTypeGuard,
  IMetadataTypeGuard,
  IMetadataSorter,
  IMetadataBuilder,
  IJsonWriter,
  IGitMetadata,
  ChildMetadata,
} from '../types/interfaces';
import type {
  FrontMatter,
  ArticleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  LocaleFrontMatter,
} from '../types/frontmatter';
import type {
  Metadata,
  ArticleMetadata,
  ChapterMetadata,
  DirectoryMetadata,
  LocaleMetadata,
} from '../types/metadata';
import * as fs from 'fs/promises';

/**
 * Type guard implementation for frontmatter
 */
export class FrontMatterTypeGuard implements IFrontMatterTypeGuard {
  isArticle(frontmatter: FrontMatter): frontmatter is ArticleFrontMatter {
    return frontmatter.type === 'article';
  }

  isChapter(frontmatter: FrontMatter): frontmatter is ChapterFrontMatter {
    return frontmatter.type === 'chapter';
  }

  isDirectory(frontmatter: FrontMatter): frontmatter is DirectoryFrontMatter {
    return frontmatter.type === 'directory';
  }

  isLocale(frontmatter: FrontMatter): frontmatter is LocaleFrontMatter {
    return frontmatter.type === 'locale';
  }
}

/**
 * Type guard implementation for metadata
 */
export class MetadataTypeGuard implements IMetadataTypeGuard {
  isArticle(metadata: Metadata): metadata is ArticleMetadata {
    return metadata.type === 'article';
  }

  isChapter(metadata: Metadata): metadata is ChapterMetadata {
    return metadata.type === 'chapter';
  }

  isDirectory(metadata: Metadata): metadata is DirectoryMetadata {
    return metadata.type === 'directory';
  }

  isLocale(metadata: Metadata): metadata is LocaleMetadata {
    return metadata.type === 'locale';
  }
}

/**
 * Metadata sorter using fractional index
 */
export class FractionalIndexSorter implements IMetadataSorter {
  sort<T extends ChildMetadata>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const indexA = ('fractionalIndex' in a && typeof a.fractionalIndex === 'string') ? a.fractionalIndex : '';
      const indexB = ('fractionalIndex' in b && typeof b.fractionalIndex === 'string') ? b.fractionalIndex : '';
      return indexA.localeCompare(indexB);
    });
  }
}

/**
 * Base metadata builder with common logic
 */
abstract class BaseMetadataBuilder<TFrontMatter extends FrontMatter, TMetadata extends Metadata>
  implements IMetadataBuilder<TFrontMatter, TMetadata>
{
  build(
    frontmatter: TFrontMatter,
    gitMetadata: IGitMetadata,
    locale: string,
    slug: string[]
  ): TMetadata {
    return {
      ...frontmatter,
      locale,
      slug,
      ...gitMetadata,
    } as unknown as TMetadata;
  }
}

/**
 * Article metadata builder
 */
export class ArticleMetadataBuilder extends BaseMetadataBuilder<
  ArticleFrontMatter,
  ArticleMetadata
> {}

/**
 * Chapter metadata builder
 */
export class ChapterMetadataBuilder extends BaseMetadataBuilder<
  ChapterFrontMatter,
  ChapterMetadata
> {}

/**
 * Directory metadata builder
 */
export class DirectoryMetadataBuilder extends BaseMetadataBuilder<
  DirectoryFrontMatter,
  DirectoryMetadata
> {}

/**
 * Locale metadata builder
 */
export class LocaleMetadataBuilder extends BaseMetadataBuilder<LocaleFrontMatter, LocaleMetadata> {}

/**
 * JSON file writer implementation
 */
export class JsonFileWriter implements IJsonWriter {
  async write<T>(filePath: string, data: T): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async read<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}
