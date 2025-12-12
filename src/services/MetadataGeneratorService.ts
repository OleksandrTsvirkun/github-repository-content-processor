/**
 * Metadata Generator using OOP and SOLID principles
 * 
 * Responsibilities:
 * - Single Responsibility: Generates all metadata JSON files
 * - Open/Closed: Extensible through dependency injection
 * - Liskov Substitution: Uses interfaces for all dependencies
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */

import * as core from '@actions/core';
import * as path from 'path';
import type {
  LocaleMetadata,
  ChapterMetadata,
  DirectoryMetadata,
  ArticleMetadata,
  LocaleFullMetadata,
  ChapterFullMetadata,
  DirectoryFullMetadata,
  Parents,
  ChildMetadata,
} from '../types/metadata';
import type { ScannedRepository, ScannedLocale, ScannedFolder } from './ContentScanner';
import type { IJsonWriter, IMetadataBuilder, IGitMetadata, IMetadataSorter } from '../types/interfaces';
import type {
  ArticleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  LocaleFrontMatter,
} from '../types/frontmatter';
import {
  ArticleMetadataBuilder,
  ChapterMetadataBuilder,
  DirectoryMetadataBuilder,
  LocaleMetadataBuilder,
  JsonFileWriter,
  FractionalIndexSorter,
} from './DomainServices';
import { AncestorBuilder } from './AncestorBuilder';

export interface GeneratedFiles {
  localesJson: string;
  localeIndices: Map<string, { full: string; shallow: string }>;
  folderIndices: Map<string, { full: string; shallow: string; ancestors: string }>;
}

/**
 * Service for building metadata from scanned content
 */
export class MetadataGeneratorService {
  constructor(
    private readonly jsonWriter: IJsonWriter,
    private readonly articleBuilder: IMetadataBuilder<ArticleFrontMatter, ArticleMetadata>,
    private readonly chapterBuilder: IMetadataBuilder<ChapterFrontMatter, ChapterMetadata>,
    private readonly directoryBuilder: IMetadataBuilder<DirectoryFrontMatter, DirectoryMetadata>,
    private readonly localeBuilder: IMetadataBuilder<LocaleFrontMatter, LocaleMetadata>,
    private readonly ancestorBuilder: AncestorBuilder,
    private readonly sorter: IMetadataSorter
  ) {}

  /**
   * Factory method for creating a MetadataGeneratorService with default dependencies
   */
  static createDefault(): MetadataGeneratorService {
    const jsonWriter = new JsonFileWriter();
    const articleBuilder = new ArticleMetadataBuilder();
    const chapterBuilder = new ChapterMetadataBuilder();
    const directoryBuilder = new DirectoryMetadataBuilder();
    const localeBuilder = new LocaleMetadataBuilder();
    const ancestorBuilder = new AncestorBuilder();
    const sorter = new FractionalIndexSorter();

    return new MetadataGeneratorService(
      jsonWriter,
      articleBuilder,
      chapterBuilder,
      directoryBuilder,
      localeBuilder,
      ancestorBuilder,
      sorter
    );
  }

  /**
   * Generate all metadata JSON files for the repository
   */
  async generateMetadataFiles(
    scanned: ScannedRepository,
    repoRoot: string
  ): Promise<GeneratedFiles> {
    core.info('Generating metadata files...');

    const localeIndices = new Map<string, { full: string; shallow: string }>();
    const folderIndices = new Map<string, { full: string; shallow: string; ancestors: string }>();

    // Generate locales.json
    const localesJsonPath = await this.generateLocalesJson(scanned, repoRoot);

    // Generate indices for each locale in parallel
    await Promise.all(
      scanned.locales.map(async (locale) => {
        await this.generateLocaleIndices(locale, localeIndices, repoRoot, folderIndices);
      })
    );

    return {
      localesJson: localesJsonPath,
      localeIndices,
      folderIndices,
    };
  }

  /**
   * Generate locales.json file
   */
  private async generateLocalesJson(
    scanned: ScannedRepository,
    repoRoot: string
  ): Promise<string> {
    const localesMetadata: LocaleMetadata[] = scanned.locales.map((locale) => {
      const frontmatter = locale.localeFile.fileInfo.frontmatter;
      if (frontmatter.type !== 'locale') {
        throw new Error(`Expected locale frontmatter but got ${frontmatter.type}`);
      }
      return this.localeBuilder.build(frontmatter, locale.localeFile.gitMetadata, locale.name, []);
    });

    const localesJsonPath = path.join(repoRoot, 'locales.json');
    await this.jsonWriter.write(localesJsonPath, localesMetadata);
    core.info(`Generated: locales.json`);

    return localesJsonPath;
  }

  /**
   * Generate indices for a single locale
   */
  private async generateLocaleIndices(
    locale: ScannedLocale,
    localeIndices: Map<string, { full: string; shallow: string }>,
    repoRoot: string,
    folderIndices: Map<string, { full: string; shallow: string; ancestors: string }>
  ): Promise<void> {
    const localePath = locale.absolutePath;

    // Generate locale-level indices
    const { full: fullChapters, shallow: shallowChapters } = await this.buildLocaleIndices(
      locale
    );

    const fullPath = path.join(localePath, 'index.full.json');
    const shallowPath = path.join(localePath, 'index.shallow.json');

    await Promise.all([
      this.jsonWriter.write(fullPath, fullChapters),
      this.jsonWriter.write(shallowPath, shallowChapters),
    ]);

    localeIndices.set(locale.name, { full: fullPath, shallow: shallowPath });
    core.info(`Generated: ${locale.name}/index.full.json, index.shallow.json`);

    // Generate indices for each chapter recursively
    await Promise.all(
      locale.chapters.map((chapter) =>
        this.generateFolderIndices(chapter, locale.name, [], repoRoot, folderIndices)
      )
    );
  }

  /**
   * Build locale-level indices
   */
  private async buildLocaleIndices(
    locale: ScannedLocale
  ): Promise<{ full: ChapterFullMetadata[]; shallow: ChapterMetadata[] }> {
    const full: ChapterFullMetadata[] = [];
    const shallow: ChapterMetadata[] = [];

    for (const chapter of locale.chapters) {
      const chapterSlug = [chapter.name];
      const frontmatter = chapter.indexFile!.fileInfo.frontmatter;

      if (frontmatter.type !== 'chapter') {
        throw new Error(`Expected chapter frontmatter but got ${frontmatter.type}`);
      }

      // Shallow metadata (no children)
      const shallowMetadata = this.chapterBuilder.build(
        frontmatter,
        chapter.indexFile!.gitMetadata,
        locale.name,
        chapterSlug
      );
      shallow.push(shallowMetadata);

      // Full metadata (with children)
      const children = await this.buildChapterChildren(chapter, locale.name, chapterSlug);
      const fullMetadata: ChapterFullMetadata = {
        ...shallowMetadata,
        children: this.sorter.sort(children),
      };
      full.push(fullMetadata);
    }

    return { full, shallow };
  }

  /**
   * Build children for a chapter
   */
  private async buildChapterChildren(
    folder: ScannedFolder,
    locale: string,
    parentSlug: string[]
  ): Promise<Array<DirectoryFullMetadata | ArticleMetadata | ChapterMetadata>> {
    const children: Array<DirectoryFullMetadata | ArticleMetadata | ChapterMetadata> = [];

    // Add articles
    for (const article of folder.articles) {
      const articleMetadata = this.buildArticleMetadata(article, locale, parentSlug);
      children.push(articleMetadata);
    }

    // Add subfolders
    for (const subfolder of folder.subfolders) {
      if (!subfolder.indexFile) continue;

      const subfolderSlug = [...parentSlug, subfolder.name];
      const frontmatter = subfolder.indexFile.fileInfo.frontmatter;
      const type = frontmatter.type;

      if (type === 'chapter') {
        // For nested chapters: only metadata, no children
        const chapterMetadata = this.chapterBuilder.build(
          frontmatter as ChapterFrontMatter,
          subfolder.indexFile.gitMetadata,
          locale,
          subfolderSlug
        );
        children.push(chapterMetadata);
      } else if (type === 'directory') {
        // For directories: full children
        const directoryChildren = await this.buildDirectoryChildren(
          subfolder,
          locale,
          subfolderSlug
        );
        const directoryMetadata: DirectoryFullMetadata = {
          ...this.directoryBuilder.build(
            frontmatter as DirectoryFrontMatter,
            subfolder.indexFile.gitMetadata,
            locale,
            subfolderSlug
          ),
          children: this.sorter.sort(directoryChildren),
        };
        children.push(directoryMetadata);
      }
    }

    return children;
  }

  /**
   * Build children for a directory
   */
  private async buildDirectoryChildren(
    folder: ScannedFolder,
    locale: string,
    parentSlug: string[]
  ): Promise<Array<DirectoryFullMetadata | ArticleMetadata>> {
    const children: Array<DirectoryFullMetadata | ArticleMetadata> = [];

    // Add articles
    for (const article of folder.articles) {
      if (article.fileInfo.frontmatter.type !== 'article') continue;
      const articleMetadata = this.buildArticleMetadata(article, locale, parentSlug);
      children.push(articleMetadata);
    }

    // Add subdirectories
    for (const subfolder of folder.subfolders) {
      if (!subfolder.indexFile) continue;

      const type = subfolder.indexFile.fileInfo.frontmatter.type;

      // Validation: directory cannot contain chapter
      if (type === 'chapter') {
        core.error(
          `Directory ${folder.name} contains chapter ${subfolder.name} - this is a validation error!`
        );
        continue;
      }

      const subfolderSlug = [...parentSlug, subfolder.name];
      const directoryChildren = await this.buildDirectoryChildren(subfolder, locale, subfolderSlug);

      const directoryMetadata: DirectoryFullMetadata = {
        ...this.directoryBuilder.build(
          subfolder.indexFile.fileInfo.frontmatter as DirectoryFrontMatter,
          subfolder.indexFile.gitMetadata,
          locale,
          subfolderSlug
        ),
        children: this.sorter.sort(directoryChildren),
      };
      children.push(directoryMetadata);
    }

    return children;
  }

  /**
   * Build article metadata
   */
  private buildArticleMetadata(
    article: { relativePath: string; fileInfo: { frontmatter: ArticleFrontMatter }; gitMetadata: IGitMetadata },
    locale: string,
    parentSlug: string[]
  ): ArticleMetadata {
    const articleName = path.basename(article.relativePath, '.md');
    const articleSlug = [...parentSlug, articleName];

    return this.articleBuilder.build(
      article.fileInfo.frontmatter as ArticleFrontMatter,
      article.gitMetadata,
      locale,
      articleSlug
    );
  }

  /**
   * Generate indices for a folder and its subfolders recursively
   */
  private async generateFolderIndices(
    folder: ScannedFolder,
    locale: string,
    parentSlug: string[],
    repoRoot: string,
    folderIndices: Map<string, { full: string; shallow: string; ancestors: string }>
  ): Promise<void> {
    if (!folder.indexFile) return;

    const folderSlug = [...parentSlug, folder.name];
    const frontmatter = folder.indexFile.fileInfo.frontmatter;
    const type = frontmatter.type;

    // Build all metadata in parallel
    const [ancestors, children] = await Promise.all([
      this.ancestorBuilder.buildAncestors(locale, parentSlug, repoRoot),
      type === 'chapter'
        ? this.buildChapterChildren(folder, locale, folderSlug)
        : this.buildDirectoryChildren(folder, locale, folderSlug),
    ]);

    const ancestorsPath = path.join(folder.absolutePath, 'ancestors.json');
    const shallowPath = path.join(folder.absolutePath, 'index.shallow.json');
    const fullPath = path.join(folder.absolutePath, 'index.full.json');

    // Shallow metadata (no children)
    const shallowMetadata =
      type === 'chapter'
        ? this.chapterBuilder.build(
            frontmatter as ChapterFrontMatter,
            folder.indexFile.gitMetadata,
            locale,
            folderSlug
          )
        : this.directoryBuilder.build(
            frontmatter as DirectoryFrontMatter,
            folder.indexFile.gitMetadata,
            locale,
            folderSlug
          );

    // Full metadata (with children)
    const fullMetadata = {
      ...shallowMetadata,
      children: this.sorter.sort(children as ChildMetadata[]),
    };

    // Write all JSON files in parallel
    await Promise.all([
      this.jsonWriter.write(ancestorsPath, ancestors),
      this.jsonWriter.write(shallowPath, shallowMetadata),
      this.jsonWriter.write(fullPath, fullMetadata),
    ]);

    folderIndices.set(folderSlug.join('/'), {
      full: fullPath,
      shallow: shallowPath,
      ancestors: ancestorsPath,
    });
    core.info(`Generated: ${folderSlug.join('/')}/index.*.json`);

    // Recursively process subfolders in parallel
    await Promise.all(
      folder.subfolders.map((subfolder) =>
        this.generateFolderIndices(subfolder, locale, folderSlug, repoRoot, folderIndices)
      )
    );
  }
}

/**
 * Backward compatibility: export function that uses the service
 */
export async function generateMetadataFiles(
  scanned: ScannedRepository,
  repoRoot: string
): Promise<GeneratedFiles> {
  const service = MetadataGeneratorService.createDefault();
  return service.generateMetadataFiles(scanned, repoRoot);
}
