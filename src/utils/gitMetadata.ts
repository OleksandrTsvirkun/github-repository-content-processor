import { execSync } from 'child_process';
import * as path from 'path';

export interface GitFileMetadata {
  sha: string;
  size: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get Git metadata for a file
 * @param filePath - Absolute path to the file
 * @param repoRoot - Repository root directory
 * @returns Git metadata (sha, size, created_at, updated_at)
 */
export async function getGitFileMetadata(
  filePath: string,
  repoRoot: string
): Promise<GitFileMetadata> {
  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');

  try {
    // Get SHA and size
    const sha = execSync(
      `git -C "${repoRoot}" rev-parse HEAD:"${relativePath}"`,
      { encoding: 'utf-8' }
    ).trim();

    const size = parseInt(
      execSync(
        `git -C "${repoRoot}" cat-file -s "${sha}"`,
        { encoding: 'utf-8' }
      ).trim(),
      10
    );

    // Get first commit timestamp (created_at)
    const created_at = execSync(
      `git -C "${repoRoot}" log --follow --format=%aI --reverse "${relativePath}" | head -1`,
      { encoding: 'utf-8' }
    ).trim();

    // Get last commit timestamp (updated_at)
    const updated_at = execSync(
      `git -C "${repoRoot}" log -1 --format=%aI "${relativePath}"`,
      { encoding: 'utf-8' }
    ).trim();

    return {
      sha,
      size,
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || new Date().toISOString(),
    };
  } catch (error) {
    // Fallback for files not yet committed
    const fs = await import('fs/promises');
    const stats = await fs.stat(filePath);
    
    return {
      sha: '', // Empty SHA for uncommitted files
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString(),
    };
  }
}

/**
 * Get Git metadata for multiple files in parallel
 * @param filePaths - Array of absolute file paths
 * @param repoRoot - Repository root directory
 * @returns Map of file paths to their Git metadata
 */
export async function getGitFileMetadataBatch(
  filePaths: string[],
  repoRoot: string
): Promise<Map<string, GitFileMetadata>> {
  const results = await Promise.all(
    filePaths.map(async (filePath) => {
      const metadata = await getGitFileMetadata(filePath, repoRoot);
      return [filePath, metadata] as [string, GitFileMetadata];
    })
  );

  return new Map(results);
}
