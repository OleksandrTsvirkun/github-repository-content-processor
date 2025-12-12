import { execSync } from 'child_process';
import * as path from 'path';
import * as core from '@actions/core';
import type { FileChange, FileChangeType, ChangeSet } from '../types/changes';

/**
 * Parse git diff output to detect file changes
 */
export async function detectChanges(
  repoRoot: string,
  beforeSha: string,
  afterSha: string
): Promise<ChangeSet> {
  core.info(`Detecting changes between ${beforeSha} and ${afterSha}`);

  const changes: FileChange[] = [];

  try {
    // Get diff with rename detection
    const diffOutput = execSync(
      `git diff --name-status --find-renames ${beforeSha} ${afterSha}`,
      { encoding: 'utf8', cwd: repoRoot }
    ).trim();

    if (!diffOutput) {
      core.info('No changes detected');
      return createEmptyChangeSet(beforeSha, afterSha);
    }

    const lines = diffOutput.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split('\t');
      const statusCode = parts[0];
      
      // Only process markdown files
      const filePath = parts[1];
      if (!filePath.endsWith('.md')) continue;

      const fileChange = parseFileChange(statusCode, parts, repoRoot);
      if (fileChange) {
        changes.push(fileChange);
      }
    }

    core.info(`Detected ${changes.length} changes`);

  } catch (error) {
    core.error(`Failed to detect changes: ${error}`);
    throw error;
  }

  return buildChangeSet(beforeSha, afterSha, changes);
}

/**
 * Parse individual file change from git diff output
 */
function parseFileChange(
  statusCode: string,
  parts: string[],
  repoRoot: string
): FileChange | null {
  let changeType: FileChangeType;
  let filePath: string;
  let oldPath: string | undefined;

  // Parse git status codes
  if (statusCode === 'A') {
    changeType = 'added';
    filePath = parts[1];
  } else if (statusCode === 'M') {
    changeType = 'modified';
    filePath = parts[1];
  } else if (statusCode === 'D') {
    changeType = 'deleted';
    filePath = parts[1];
  } else if (statusCode.startsWith('R')) {
    // R100 means 100% similarity (pure rename)
    changeType = 'renamed';
    oldPath = parts[1];
    filePath = parts[2];
  } else {
    // Unknown status code
    return null;
  }

  const absolutePath = path.join(repoRoot, filePath);
  const contentInfo = parseContentPath(filePath);

  return {
    changeType,
    filePath: absolutePath,
    relativePath: filePath,
    oldPath,
    ...contentInfo,
  };
}

/**
 * Parse file path to extract content type, locale, and slug
 */
function parseContentPath(relativePath: string): {
  contentType?: 'locale' | 'chapter' | 'directory' | 'article';
  locale?: string;
  slug?: string[];
} {
  const parts = relativePath.split('/');
  
  // Must have at least locale/file.md
  if (parts.length < 2) {
    return {};
  }

  const locale = parts[0];
  
  // Check if it's a valid locale (xx-XX format)
  if (!/^[a-z]{2}-[A-Z]{2}$/.test(locale)) {
    return {};
  }

  const fileName = parts[parts.length - 1];

  // Determine content type
  let contentType: 'locale' | 'chapter' | 'directory' | 'article' | undefined;
  let slug: string[] = [];

  if (fileName === 'locale.md') {
    contentType = 'locale';
    slug = [];
  } else if (fileName === 'index.md') {
    // Could be chapter or directory - we'll need to check frontmatter
    // For now, mark as chapter (will be refined later)
    contentType = 'chapter';
    slug = parts.slice(1, -1); // Remove locale and index.md
  } else if (fileName.endsWith('.md')) {
    contentType = 'article';
    const articleName = fileName.replace(/\.md$/, '');
    slug = [...parts.slice(1, -1), articleName]; // Remove locale, keep folder path + article name
  }

  return {
    contentType,
    locale,
    slug,
  };
}

/**
 * Build organized ChangeSet from detected changes
 */
function buildChangeSet(
  beforeSha: string,
  afterSha: string,
  files: FileChange[]
): ChangeSet {
  const byType = {
    added: files.filter(f => f.changeType === 'added'),
    modified: files.filter(f => f.changeType === 'modified'),
    deleted: files.filter(f => f.changeType === 'deleted'),
    renamed: files.filter(f => f.changeType === 'renamed'),
  };

  const byContentType = {
    locale: files.filter(f => f.contentType === 'locale'),
    chapter: files.filter(f => f.contentType === 'chapter'),
    directory: files.filter(f => f.contentType === 'directory'),
    article: files.filter(f => f.contentType === 'article'),
  };

  return {
    beforeCommit: beforeSha,
    afterCommit: afterSha,
    timestamp: new Date(),
    files,
    byType,
    byContentType,
  };
}

/**
 * Create empty change set
 */
function createEmptyChangeSet(beforeSha: string, afterSha: string): ChangeSet {
  return {
    beforeCommit: beforeSha,
    afterCommit: afterSha,
    timestamp: new Date(),
    files: [],
    byType: {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
    },
    byContentType: {
      locale: [],
      chapter: [],
      directory: [],
      article: [],
    },
  };
}

/**
 * Get all markdown files for full scan (when no before SHA available)
 */
export async function getAllMarkdownFiles(repoRoot: string): Promise<FileChange[]> {
  core.info('No before SHA - treating all files as added');
  
  try {
    const output = execSync(
      'git ls-files "*.md"',
      { encoding: 'utf8', cwd: repoRoot }
    ).trim();

    if (!output) {
      return [];
    }

    const files = output.split('\n').map(relativePath => {
      const absolutePath = path.join(repoRoot, relativePath);
      const contentInfo = parseContentPath(relativePath);

      return {
        changeType: 'added' as FileChangeType,
        filePath: absolutePath,
        relativePath,
        ...contentInfo,
      };
    });

    return files;
  } catch (error) {
    core.error(`Failed to list all files: ${error}`);
    return [];
  }
}
