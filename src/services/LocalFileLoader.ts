import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import * as core from '@actions/core';

export interface LocalFileInfo {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
}

/**
 * Load markdown files from local filesystem (when checkout is available)
 */
export async function* loadLocalFiles(
  directory: string,
  rootDir: string = directory
): AsyncGenerator<LocalFileInfo> {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    // Skip node_modules, .git, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory()) {
      yield* loadLocalFiles(fullPath, rootDir);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const { data: frontmatter, content: markdown } = matter(content);
        
        // Get relative path from root
        const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
        
        yield {
          path: relativePath,
          content: markdown,
          frontmatter,
        };
      } catch (error) {
        core.warning(`Failed to read file ${fullPath}: ${error}`);
      }
    }
  }
}

/**
 * Get list of changed files using git diff (faster than GitHub API)
 */
export async function getChangedFilesLocal(
  beforeSha: string,
  afterSha: string,
  cwd: string = process.cwd()
): Promise<string[]> {
  const { execSync } = await import('child_process');
  
  try {
    const output = execSync(
      `git diff --name-only ${beforeSha} ${afterSha}`,
      { encoding: 'utf8', cwd }
    );
    
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.endsWith('.md'));
  } catch (error) {
    core.error(`Failed to get changed files: ${error}`);
    return [];
  }
}

/**
 * Load specific files from local filesystem
 */
export async function loadLocalFile(filePath: string): Promise<LocalFileInfo | null> {
  try {
    const fullPath = path.resolve(filePath);
    const content = await fs.promises.readFile(fullPath, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content);
    
    return {
      path: filePath,
      content: markdown,
      frontmatter,
    };
  } catch (error) {
    core.error(`Failed to read file ${filePath}: ${error}`);
    return null;
  }
}
