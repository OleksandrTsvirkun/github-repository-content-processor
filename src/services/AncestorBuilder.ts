/**
 * Ancestor Builder Service
 * 
 * Single Responsibility: Builds ancestor chains for metadata
 */

import * as path from 'path';
import type { Parents, LocaleMetadata, ChapterMetadata, DirectoryMetadata } from '../types/metadata';
import type { IFileLoader, IGitMetadataProvider, IMetadataBuilder } from '../types/interfaces';
import type { LocaleFrontMatter, ChapterFrontMatter, DirectoryFrontMatter } from '../types/frontmatter';
import { loadLocalFile } from './LocalFileLoader';
import { getGitFileMetadata } from '../utils/gitMetadata';
import { LocaleMetadataBuilder, ChapterMetadataBuilder, DirectoryMetadataBuilder } from './DomainServices';

/**
 * Service for building ancestor chains
 */
export class AncestorBuilder {
  constructor(
    private readonly localeBuilder: IMetadataBuilder<LocaleFrontMatter, LocaleMetadata> = new LocaleMetadataBuilder(),
    private readonly chapterBuilder: IMetadataBuilder<ChapterFrontMatter, ChapterMetadata> = new ChapterMetadataBuilder(),
    private readonly directoryBuilder: IMetadataBuilder<DirectoryFrontMatter, DirectoryMetadata> = new DirectoryMetadataBuilder()
  ) {}

  /**
   * Build ancestors chain from locale to immediate parent
   */
  async buildAncestors(
    localeName: string,
    slugPath: string[],
    repoRoot: string
  ): Promise<Parents[]> {
    const ancestors: Parents[] = [];

    // Add locale as first ancestor
    const localeAncestor = await this.buildLocaleAncestor(localeName, repoRoot);
    if (localeAncestor) {
      ancestors.push(localeAncestor);
    }

    // Add each folder in the path
    await this.buildFolderAncestors(localeName, slugPath, repoRoot, ancestors);

    return ancestors;
  }

  /**
   * Build locale ancestor
   */
  private async buildLocaleAncestor(
    localeName: string,
    repoRoot: string
  ): Promise<LocaleMetadata | null> {
    const localePath = path.join(repoRoot, localeName, 'locale.md');

    // Parallel loading of locale file and git metadata
    const [localeFileInfo, localeGitMetadata] = await Promise.all([
      loadLocalFile(localePath),
      getGitFileMetadata(localePath, repoRoot)
    ]);

    if (!localeFileInfo) {
      return null;
    }

    const frontmatter = localeFileInfo.frontmatter;
    if (frontmatter.type !== 'locale') {
      throw new Error(`Expected locale frontmatter but got ${frontmatter.type}`);
    }

    return this.localeBuilder.build(frontmatter as LocaleFrontMatter, localeGitMetadata, localeName, []);
  }

  /**
   * Build folder ancestors recursively
   */
  private async buildFolderAncestors(
    localeName: string,
    slugPath: string[],
    repoRoot: string,
    ancestors: Parents[]
  ): Promise<void> {
    let currentPath = path.join(repoRoot, localeName);
    const currentSlug: string[] = [];

    // Parallel loading of all ancestor index files
    const ancestorPromises = slugPath.map(async (segment, index) => {
      const pathSegments = slugPath.slice(0, index + 1);
      const folderPath = path.join(repoRoot, localeName, ...pathSegments);
      const indexPath = path.join(folderPath, 'index.md');

      const [indexFileInfo, indexGitMetadata] = await Promise.all([
        loadLocalFile(indexPath),
        getGitFileMetadata(indexPath, repoRoot)
      ]);

      return {
        segment,
        slug: [...pathSegments],
        indexFileInfo,
        indexGitMetadata
      };
    });

    const ancestorData = await Promise.all(ancestorPromises);

    for (const { segment, slug, indexFileInfo, indexGitMetadata } of ancestorData) {
      currentSlug.push(segment);

      if (!indexFileInfo) {
        continue;
      }

      const frontmatter = indexFileInfo.frontmatter;

      if (frontmatter.type === 'chapter') {
        const ancestor = this.chapterBuilder.build(
          frontmatter,
          indexGitMetadata,
          localeName,
          [...currentSlug]
        );
        ancestors.push(ancestor);
      } else if (frontmatter.type === 'directory') {
        const ancestor = this.directoryBuilder.build(
          frontmatter,
          indexGitMetadata,
          localeName,
          [...currentSlug]
        );
        ancestors.push(ancestor);
      }
    }
  }
}
