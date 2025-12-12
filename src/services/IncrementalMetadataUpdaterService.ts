/**
 * Incremental Metadata Updater Service
 * 
 * Applies SOLID principles:
 * - Single Responsibility: Updates metadata incrementally based on file changes
 * - Open/Closed: Extensible through strategy pattern for different update types
 * - Liskov Substitution: Uses interfaces for dependencies
 * - Interface Segregation: Small focused interfaces
 * - Dependency Inversion: Depends on abstractions
 */

import * as path from 'path';
import * as core from '@actions/core';
import type { ChangeSet, FileChange } from '../types/changes';
import type {
  LocaleMetadata,
  ChapterMetadata,
  DirectoryMetadata,
  ArticleMetadata,
  LocaleFullMetadata,
  LocaleShallowMetadata,
  ChapterFullMetadata,
  ChapterShallowMetadata,
  DirectoryFullMetadata,
  DirectoryShallowMetadata,
  Parents,
  ChildMetadata,
} from '../types/metadata';
import type { IJsonWriter, IMetadataBuilder, IMetadataSorter } from '../types/interfaces';
import type {
  ArticleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  LocaleFrontMatter,
} from '../types/frontmatter';
import { loadLocalFile } from './LocalFileLoader';
import { getGitFileMetadata } from '../utils/gitMetadata';
import {
  ArticleMetadataBuilder,
  ChapterMetadataBuilder,
  DirectoryMetadataBuilder,
  LocaleMetadataBuilder,
  JsonFileWriter,
  FractionalIndexSorter,
} from './DomainServices';

/**
 * Result of incremental metadata update
 */
export interface IncrementalUpdateResult {
  updatedFiles: string[];
  fullRegeneration: boolean;
  stats: {
    localesUpdated: number;
    foldersUpdated: number;
    filesProcessed: number;
  };
}

/**
 * Statistics tracker for updates
 */
class UpdateStatistics {
  constructor(
    public localesUpdated: number = 0,
    public foldersUpdated: number = 0,
    public filesProcessed: number = 0
  ) {}

  incrementLocales(): void {
    this.localesUpdated++;
  }

  incrementFolders(): void {
    this.foldersUpdated++;
  }

  incrementFiles(): void {
    this.filesProcessed++;
  }

  toObject(): { localesUpdated: number; foldersUpdated: number; filesProcessed: number } {
    return {
      localesUpdated: this.localesUpdated,
      foldersUpdated: this.foldersUpdated,
      filesProcessed: this.filesProcessed,
    };
  }
}

/**
 * Groups file changes by locale
 */
class LocaleChangeGrouper {
  groupByLocale(changes: ChangeSet): Map<string, FileChange[]> {
    const grouped = new Map<string, FileChange[]>();

    for (const change of changes.files) {
      if (!change.locale) continue;

      if (!grouped.has(change.locale)) {
        grouped.set(change.locale, []);
      }

      grouped.get(change.locale)!.push(change);
    }

    return grouped;
  }
}

/**
 * Service for incrementally updating metadata
 */
export class IncrementalMetadataUpdaterService {
  constructor(
    private readonly jsonWriter: IJsonWriter,
    private readonly articleBuilder: IMetadataBuilder<ArticleFrontMatter, ArticleMetadata>,
    private readonly chapterBuilder: IMetadataBuilder<ChapterFrontMatter, ChapterMetadata>,
    private readonly directoryBuilder: IMetadataBuilder<DirectoryFrontMatter, DirectoryMetadata>,
    private readonly localeBuilder: IMetadataBuilder<LocaleFrontMatter, LocaleMetadata>,
    private readonly sorter: IMetadataSorter,
    private readonly grouper: LocaleChangeGrouper
  ) {}

  /**
   * Factory method for creating with default dependencies
   */
  static createDefault(): IncrementalMetadataUpdaterService {
    return new IncrementalMetadataUpdaterService(
      new JsonFileWriter(),
      new ArticleMetadataBuilder(),
      new ChapterMetadataBuilder(),
      new DirectoryMetadataBuilder(),
      new LocaleMetadataBuilder(),
      new FractionalIndexSorter(),
      new LocaleChangeGrouper()
    );
  }

  /**
   * Update metadata incrementally based on detected changes
   */
  async updateMetadataIncrementally(
    changes: ChangeSet,
    repoRoot: string
  ): Promise<IncrementalUpdateResult> {
    core.info(`Incrementally updating metadata for ${changes.files.length} changes`);

    const updatedFiles = new Set<string>();
    const stats = new UpdateStatistics();

    const changesByLocale = this.grouper.groupByLocale(changes);

    // Process locales in parallel
    await Promise.all(
      Array.from(changesByLocale.entries()).map(async ([locale, localeChanges]) => {
        core.info(`Processing ${localeChanges.length} changes for locale ${locale}`);
        await this.processLocaleChanges(localeChanges, repoRoot, updatedFiles, stats);
        stats.incrementLocales();
      })
    );

    return {
      updatedFiles: Array.from(updatedFiles),
      fullRegeneration: false,
      stats: stats.toObject(),
    };
  }

  /**
   * Process all changes for a specific locale
   */
  private async processLocaleChanges(
    changes: FileChange[],
    repoRoot: string,
    updatedFiles: Set<string>,
    stats: UpdateStatistics
  ): Promise<void> {
    // Process changes in parallel
    await Promise.all(
      changes.map(change => this.processFileChange(change, repoRoot, updatedFiles, stats))
    );
  }

  /**
   * Process a single file change
   */
  private async processFileChange(
    change: FileChange,
    repoRoot: string,
    updatedFiles: Set<string>,
    stats: UpdateStatistics
  ): Promise<void> {
    if (!change.locale) return;

    const filename = path.basename(change.file);
    const fileType = filename === 'locale.md' ? 'locale' :
                     filename === 'index.md' ? 'index' : 'article';

    switch (fileType) {
      case 'locale':
        await this.updateLocaleMetadata(change, repoRoot, updatedFiles);
        break;
      case 'index':
        await this.updateFolderMetadata(change, repoRoot, updatedFiles, stats);
        break;
      case 'article':
        await this.updateArticleMetadata(change, repoRoot, updatedFiles, stats);
        break;
    }

    stats.incrementFiles();
  }

  /**
   * Update locale.md metadata
   */
  private async updateLocaleMetadata(
    change: FileChange,
    repoRoot: string,
    updatedFiles: Set<string>
  ): Promise<void> {
    if (!change.locale) return;

    core.info(`Updating locale metadata: ${change.locale}`);

    // Update locales.json
    const localesJsonPath = path.join(repoRoot, 'locales.json');
    const localesJson = await this.jsonWriter.read<LocaleMetadata[]>(localesJsonPath);

    if (!localesJson) {
      core.warning(`locales.json not found, skipping update`);
      return;
    }

    if (change.status === 'removed') {
      const filtered = localesJson.filter((l) => l.locale !== change.locale);
      await this.jsonWriter.write(localesJsonPath, filtered);
    } else {
      const localePath = path.join(repoRoot, change.file);

      // Parallel loading of locale file and git metadata
      const [localeFile, gitMetadata] = await Promise.all([
        loadLocalFile(localePath),
        getGitFileMetadata(localePath, repoRoot)
      ]);

      if (!localeFile) {
        core.warning(`Could not load locale file: ${localePath}`);
        return;
      }

      const frontmatter = localeFile.frontmatter;
      const localeMetadata = this.localeBuilder.build(frontmatter, gitMetadata, change.locale, []);

      const index = localesJson.findIndex((l) => l.locale === change.locale);
      if (index >= 0) {
        localesJson[index] = localeMetadata;
      } else {
        localesJson.push(localeMetadata);
      }

      await this.jsonWriter.write(localesJsonPath, localesJson);
    }

    updatedFiles.add(localesJsonPath);
  }

  /**
   * Update folder index.md metadata
   */
  private async updateFolderMetadata(
    change: FileChange,
    repoRoot: string,
    updatedFiles: Set<string>,
    stats: UpdateStatistics
  ): Promise<void> {
    if (!change.locale) return;

    const folderPath = path.dirname(path.join(repoRoot, change.file));
    core.info(`Updating folder metadata: ${folderPath}`);

    const fullPath = path.join(folderPath, 'index.full.json');
    const shallowPath = path.join(folderPath, 'index.shallow.json');
    const ancestorsPath = path.join(folderPath, 'ancestors.json');

    if (change.status === 'removed') {
      // TODO: Handle removal - might need to remove parent folder's entry
      core.warning(`Folder removal handling not yet implemented`);
      return;
    }

    // Parallel loading of metadata files, index file and git metadata
    const indexPath = path.join(folderPath, 'index.md');
    const [fullMetadata, shallowMetadata, indexFile, gitMetadata] = await Promise.all([
      this.jsonWriter.read<ChapterFullMetadata | DirectoryFullMetadata>(fullPath),
      this.jsonWriter.read<ChapterMetadata | DirectoryMetadata>(shallowPath),
      loadLocalFile(indexPath),
      getGitFileMetadata(indexPath, repoRoot)
    ]);

    if (!fullMetadata || !shallowMetadata) {
      core.warning(`Metadata files not found for ${folderPath}, skipping`);
      return;
    }

    if (!indexFile) {
      core.warning(`Could not load index file: ${indexPath}`);
      return;
    }

    const frontmatter = indexFile.frontmatter;

    const updatedMetadata = frontmatter.type === 'chapter'
      ? this.chapterBuilder.build(frontmatter as ChapterFrontMatter, gitMetadata, change.locale, shallowMetadata.slug)
      : this.directoryBuilder.build(frontmatter as DirectoryFrontMatter, gitMetadata, change.locale, shallowMetadata.slug);

    // Update shallow
    await this.jsonWriter.write(shallowPath, updatedMetadata);
    updatedFiles.add(shallowPath);

    // Update full (preserve children)
    const updatedFull = {
      ...updatedMetadata,
      children: fullMetadata.children,
    };
    await this.jsonWriter.write(fullPath, updatedFull);
    updatedFiles.add(fullPath);

    stats.incrementFolders();
  }

  /**
   * Update article metadata
   */
  private async updateArticleMetadata(
    change: FileChange,
    repoRoot: string,
    updatedFiles: Set<string>,
    stats: UpdateStatistics
  ): Promise<void> {
    if (!change.locale) return;

    const folderPath = path.dirname(path.join(repoRoot, change.file));
    const articleName = path.basename(change.file, '.md');

    core.info(`Updating article metadata: ${change.file}`);

    const fullPath = path.join(folderPath, 'index.full.json');
    const shallowPath = path.join(folderPath, 'index.shallow.json');

    // Parallel loading of metadata files
    const [fullMetadata, shallowMetadata] = await Promise.all([
      this.jsonWriter.read<ChapterFullMetadata | DirectoryFullMetadata>(fullPath),
      this.jsonWriter.read<ChapterShallowMetadata | DirectoryShallowMetadata>(shallowPath)
    ]);

    if (!fullMetadata || !shallowMetadata) {
      core.warning(`Metadata files not found for ${folderPath}, skipping`);
      return;
    }

    if (change.status === 'removed') {
      // Remove from both full and shallow
      fullMetadata.children = fullMetadata.children.filter(
        (child) => child.slug[child.slug.length - 1] !== articleName
      );
      shallowMetadata.children = shallowMetadata.children.filter(
        (child) => child.slug[child.slug.length - 1] !== articleName
      );
    } else {
      const articlePath = path.join(repoRoot, change.file);

      // Parallel loading of article file and git metadata
      const [articleFile, gitMetadata] = await Promise.all([
        loadLocalFile(articlePath),
        getGitFileMetadata(articlePath, repoRoot)
      ]);

      if (!articleFile) {
        core.warning(`Could not load article file: ${articlePath}`);
        return;
      }

      const frontmatter = articleFile.frontmatter;
      const articleSlug = [...shallowMetadata.slug, articleName];
      const articleMetadata = this.articleBuilder.build(frontmatter as ArticleFrontMatter, gitMetadata, change.locale, articleSlug);

      // Update in both full and shallow
      const fullIndex = fullMetadata.children.findIndex(
        (child) => child.slug[child.slug.length - 1] === articleName
      );
      const shallowIndex = shallowMetadata.children.findIndex(
        (child) => child.slug[child.slug.length - 1] === articleName
      );

      if (fullIndex >= 0) {
        fullMetadata.children[fullIndex] = articleMetadata;
      } else {
        fullMetadata.children.push(articleMetadata);
      }

      if (shallowIndex >= 0) {
        shallowMetadata.children[shallowIndex] = articleMetadata;
      } else {
        shallowMetadata.children.push(articleMetadata);
      }

      // Sort children
      fullMetadata.children = this.sorter.sort(fullMetadata.children as ChildMetadata[]);
      shallowMetadata.children = this.sorter.sort(shallowMetadata.children as ChildMetadata[]);
    }

    await Promise.all([
      this.jsonWriter.write(fullPath, fullMetadata),
      this.jsonWriter.write(shallowPath, shallowMetadata),
    ]);

    updatedFiles.add(fullPath);
    updatedFiles.add(shallowPath);
    stats.incrementFolders();
  }
}

/**
 * Backward compatibility: export function that uses the service
 */
export async function updateMetadataIncrementally(
  changes: ChangeSet,
  repoRoot: string
): Promise<IncrementalUpdateResult> {
  const service = IncrementalMetadataUpdaterService.createDefault();
  return service.updateMetadataIncrementally(changes, repoRoot);
}
