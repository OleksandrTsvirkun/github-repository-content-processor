import * as fs from 'fs/promises';
import * as path from 'path';
import * as core from '@actions/core';
import { loadLocalFile, type LocalFileInfo } from './LocalFileLoader';
import { getGitFileMetadata, type GitFileMetadata } from '../utils/gitMetadata';
import type {
  LocaleFrontMatter,
  ChapterFrontMatter,
  DirectoryFrontMatter,
  ArticleFrontMatter,
} from '../types/frontmatter';
import type { LocaleMetadata, ChapterMetadata, DirectoryMetadata, ArticleMetadata } from '../types/metadata';
import LocaleElement from '../validations/elements/LocaleElement';
import ChapterElement from '../validations/elements/ChapterElement';
import DirectoryElement from '../validations/elements/DirectoryElement';
import ArticleElement from '../validations/elements/ArticleElement';
import ContentPath from '../validations/domain/ContentPath';
import FileStats from '../validations/domain/FileStats';

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  fileInfo: LocalFileInfo;
  gitMetadata: GitFileMetadata;
}

export interface ScannedFolder {
  absolutePath: string;
  relativePath: string;
  name: string;
  indexFile?: ScannedFile;
  articles: ScannedFile[];
  subfolders: ScannedFolder[];
}

export interface ScannedLocale {
  absolutePath: string;
  name: string; // e.g., "uk-UA"
  localeFile: ScannedFile;
  chapters: ScannedFolder[];
}

export interface ScannedRepository {
  root: string;
  locales: ScannedLocale[];
}

/**
 * Check if a string is a valid locale format (xx-XX)
 */
function isValidLocale(name: string): boolean {
  return /^[a-z]{2}-[A-Z]{2}$/.test(name);
}

/**
 * Check if a folder/file name uses fractional index format
 */
function isFractionalIndex(name: string): boolean {
  return /^[0-9]+[a-z]?-.+$/.test(name);
}

/**
 * Scan a repository and build the content structure using generators for memory efficiency
 * @param repoRoot - Absolute path to repository root
 * @returns Scanned repository structure
 */
export async function scanRepository(repoRoot: string): Promise<ScannedRepository> {
  core.info(`Scanning repository: ${repoRoot}`);

  const locales: ScannedLocale[] = [];
  
  // Use async iteration for directory entries
  for await (const locale of scanLocales(repoRoot)) {
    locales.push(locale);
  }

  return {
    root: repoRoot,
    locales,
  };
}

/**
 * Generator function to scan locales asynchronously
 */
async function* scanLocales(repoRoot: string): AsyncGenerator<ScannedLocale> {
  const entries = await fs.readdir(repoRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isValidLocale(entry.name)) continue;

    const localePath = path.join(repoRoot, entry.name);
    const localeFilePath = path.join(localePath, 'locale.md');

    // Check if locale.md exists
    try {
      await fs.access(localeFilePath);
    } catch {
      core.warning(`Skipping locale ${entry.name}: locale.md not found`);
      continue;
    }

    core.info(`Found locale: ${entry.name}`);

    // Parallel loading of locale file and git metadata
    const [localeFileInfo, gitMetadata] = await Promise.all([
      loadLocalFile(localeFilePath),
      getGitFileMetadata(localeFilePath, repoRoot)
    ]);

    if (!localeFileInfo) {
      core.warning(`Skipping locale ${entry.name}: failed to load locale.md`);
      continue;
    }

    const localeFile: ScannedFile = {
      absolutePath: localeFilePath,
      relativePath: `${entry.name}/locale.md`,
      fileInfo: localeFileInfo,
      gitMetadata,
    };

    // Scan chapters in this locale
    const chapters: ScannedFolder[] = [];
    for await (const chapter of scanFolders(localePath, repoRoot, entry.name, true)) {
      chapters.push(chapter);
    }

    yield {
      absolutePath: localePath,
      name: entry.name,
      localeFile,
      chapters,
    };
  }
}

/**
 * Generator function to recursively scan folders asynchronously
 * @param folderPath - Absolute path to folder
 * @param repoRoot - Repository root path
 * @param relativePath - Relative path from repo root
 * @param isLocaleRoot - True if this is scanning directly under locale folder
 */
async function* scanFolders(
  folderPath: string,
  repoRoot: string,
  relativePath: string,
  isLocaleRoot: boolean = false
): AsyncGenerator<ScannedFolder> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip special files and generated files
    if (entry.name === 'locale.md') continue;
    if (entry.name.endsWith('.json')) continue;
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      const subfolderPath = path.join(folderPath, entry.name);
      const indexFilePath = path.join(subfolderPath, 'index.md');

      // Check fractional index naming (unless at locale root where we expect chapters)
      if (!isLocaleRoot && !isFractionalIndex(entry.name)) {
        core.warning(`Folder ${entry.name} does not use fractional index naming`);
      }

      // Check if index.md exists
      let indexFile: ScannedFile | undefined;
      try {
        await fs.access(indexFilePath);
        const indexFileInfo = await loadLocalFile(indexFilePath);
        if (!indexFileInfo) {
          core.warning(`Skipping folder ${entry.name}: failed to load index.md`);
          continue;
        }

        const gitMetadata = await getGitFileMetadata(indexFilePath, repoRoot);

        indexFile = {
          absolutePath: indexFilePath,
          relativePath: `${relativePath}/${entry.name}/index.md`,
          fileInfo: indexFileInfo,
          gitMetadata,
        };
      } catch {
        core.warning(`Skipping folder ${entry.name}: index.md not found`);
        continue; // Skip folders without index.md
      }

      // Scan articles and subfolders
      const articles: ScannedFile[] = [];
      const subfolders: ScannedFolder[] = [];

      const subEntries = await fs.readdir(subfolderPath, { withFileTypes: true });

      // Process articles first (they're simple)
      for (const subEntry of subEntries) {
        if (subEntry.name === 'index.md') continue;
        if (subEntry.name.endsWith('.json')) continue;
        if (subEntry.name.startsWith('.')) continue;

        if (subEntry.isFile() && subEntry.name.endsWith('.md')) {
          // It's an article
          const articlePath = path.join(subfolderPath, subEntry.name);
          
          // Check fractional index naming
          const articleName = subEntry.name.replace(/\.md$/, '');
          if (!isFractionalIndex(articleName)) {
            core.warning(`Article ${subEntry.name} does not use fractional index naming`);
          }

          const articleFileInfo = await loadLocalFile(articlePath);
          if (!articleFileInfo) {
            core.warning(`Failed to load article ${subEntry.name}`);
            continue;
          }

          const gitMetadata = await getGitFileMetadata(articlePath, repoRoot);

          articles.push({
            absolutePath: articlePath,
            relativePath: `${relativePath}/${entry.name}/${subEntry.name}`,
            fileInfo: articleFileInfo,
            gitMetadata,
          });
        }
      }

      // Then process subfolders recursively using generator
      for (const subEntry of subEntries) {
        if (subEntry.isDirectory()) {
          for await (const subfolder of scanFolders(
            subfolderPath,
            repoRoot,
            `${relativePath}/${entry.name}`,
            false
          )) {
            subfolders.push(subfolder);
          }
        }
      }

      yield {
        absolutePath: subfolderPath,
        relativePath: `${relativePath}/${entry.name}`,
        name: entry.name,
        indexFile,
        articles,
        subfolders,
      };
    }
  }
}

/**
 * Convert scanned data to Metadata types for validation
 * @param scanned - Scanned repository
 * @returns Array of all metadata objects for validation
 */
export function convertToMetadata(scanned: ScannedRepository): Array<
  LocaleMetadata | ChapterMetadata | DirectoryMetadata | ArticleMetadata
> {
  const metadata: Array<LocaleMetadata | ChapterMetadata | DirectoryMetadata | ArticleMetadata> = [];

  for (const locale of scanned.locales) {
    // Add locale metadata
    const localeMetadata: LocaleMetadata = {
      ...(locale.localeFile.fileInfo.frontmatter as LocaleFrontMatter),
      locale: locale.name,
      slug: [],
      ...locale.localeFile.gitMetadata,
    };
    metadata.push(localeMetadata);

    // Process chapters
    for (const chapter of locale.chapters) {
      processFolder(chapter, locale.name, [], metadata);
    }
  }

  return metadata;
}

function processFolder(
  folder: ScannedFolder,
  locale: string,
  parentSlug: string[],
  metadata: Array<LocaleMetadata | ChapterMetadata | DirectoryMetadata | ArticleMetadata>
): void {
  if (!folder.indexFile) return;

  const folderName = folder.name;
  const slug = [...parentSlug, folderName];
  const type = folder.indexFile.fileInfo.frontmatter.type as 'chapter' | 'directory';

  if (type === 'chapter') {
    const chapterMetadata: ChapterMetadata = {
      ...(folder.indexFile.fileInfo.frontmatter as ChapterFrontMatter),
      locale,
      slug,
      ...folder.indexFile.gitMetadata,
    };
    metadata.push(chapterMetadata);
  } else if (type === 'directory') {
    const directoryMetadata: DirectoryMetadata = {
      ...(folder.indexFile.fileInfo.frontmatter as DirectoryFrontMatter),
      locale,
      slug,
      ...folder.indexFile.gitMetadata,
    };
    metadata.push(directoryMetadata);
  }

  // Process articles
  for (const article of folder.articles) {
    const articleName = path.basename(article.relativePath, '.md');
    const articleSlug = [...slug, articleName];

    const articleMetadata: ArticleMetadata = {
      ...(article.fileInfo.frontmatter as ArticleFrontMatter),
      locale,
      slug: articleSlug,
      ...article.gitMetadata,
    };
    metadata.push(articleMetadata);
  }

  // Process subfolders
  for (const subfolder of folder.subfolders) {
    processFolder(subfolder, locale, slug, metadata);
  }
}

/**
 * Build a tree of validation elements from scanned repository
 */
export async function buildElementTree(scannedRepo: ScannedRepository): Promise<LocaleElement[]> {
  const localeElements: LocaleElement[] = [];

  for (const locale of scannedRepo.locales) {
    // Create locale element
    const localePath = ContentPath.parse(locale.name);
    const localeStats = new FileStats(
      locale.localeFile.gitMetadata.size,
      new Date(locale.localeFile.gitMetadata.created_at),
      new Date(locale.localeFile.gitMetadata.updated_at),
      locale.localeFile.gitMetadata.sha
    );
    
    const localeElement = new LocaleElement(
      localePath,
      locale.localeFile.fileInfo.frontmatter as import('../types/frontmatter').LocaleFrontMatter,
      localeStats
    );

    // Process chapters
    for (const chapter of locale.chapters) {
      if (!chapter.indexFile) continue;
      
      const chapterPath = ContentPath.parse(`${locale.name}/${chapter.name}`);
      const chapterStats = new FileStats(
        chapter.indexFile.gitMetadata.size,
        new Date(chapter.indexFile.gitMetadata.created_at),
        new Date(chapter.indexFile.gitMetadata.updated_at),
        chapter.indexFile.gitMetadata.sha
      );

      const chapterElement = new ChapterElement(
        chapterPath,
        chapter.indexFile.fileInfo.frontmatter as import('../types/frontmatter').ChapterFrontMatter,
        chapterStats,
        localeElement
      );

      // Process chapter content recursively
      processElementFolder(chapter, chapterElement, `${locale.name}/${chapter.name}`, chapterElement);
      
      localeElement.addChild(chapterElement);
    }

    localeElements.push(localeElement);
  }

  return localeElements;
}

function processElementFolder(
  folder: ScannedFolder,
  parentElement: ChapterElement | DirectoryElement,
  basePath: string,
  parentElementRef: ChapterElement | DirectoryElement
): void {
  // Process articles
  for (const article of folder.articles) {
    const articleName = path.basename(article.relativePath, '.md');
    const articlePath = ContentPath.parse(`${basePath}/${articleName}`);
    const articleStats = new FileStats(
      article.gitMetadata.size,
      new Date(article.gitMetadata.created_at),
      new Date(article.gitMetadata.updated_at),
      article.gitMetadata.sha
    );

    const articleElement = new ArticleElement(
      articlePath,
      article.fileInfo.frontmatter as ArticleFrontMatter,
      articleStats,
      parentElement
    );

    parentElement.addChild(articleElement);
  }

  // Process subfolders
  for (const subfolder of folder.subfolders) {
    if (!subfolder.indexFile) continue;

    const subfolderPath = ContentPath.parse(`${basePath}/${subfolder.name}`);
    const subfolderStats = new FileStats(
      subfolder.indexFile.gitMetadata.size,
      new Date(subfolder.indexFile.gitMetadata.created_at),
      new Date(subfolder.indexFile.gitMetadata.updated_at),
      subfolder.indexFile.gitMetadata.sha
    );

    const type = subfolder.indexFile.fileInfo.frontmatter.type;
    
    if (type === 'chapter') {
      const chapterElement = new ChapterElement(
        subfolderPath,
        subfolder.indexFile.fileInfo.frontmatter as ChapterFrontMatter,
        subfolderStats,
        parentElement
      );
      
      processElementFolder(subfolder, chapterElement, `${basePath}/${subfolder.name}`, chapterElement);
      parentElement.addChild(chapterElement);
    } else if (type === 'directory') {
      const directoryElement = new DirectoryElement(
        subfolderPath,
        subfolder.indexFile.fileInfo.frontmatter as DirectoryFrontMatter,
        subfolderStats,
        parentElement
      );
      
      processElementFolder(subfolder, directoryElement, `${basePath}/${subfolder.name}`, directoryElement);
      parentElement.addChild(directoryElement);
    }
  }
}
