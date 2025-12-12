import { execSync } from 'child_process';
import * as core from '@actions/core';

const COMMIT_MESSAGE_PREFIX = '[auto:Amentor GitHub Content Manager Action]';

/**
 * Check if the last commit was made by this action
 */
export function isAutoCommit(repoRoot: string = process.cwd()): boolean {
  try {
    const lastMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8',
      cwd: repoRoot,
    }).trim();

    return lastMessage.startsWith(COMMIT_MESSAGE_PREFIX);
  } catch {
    return false;
  }
}

/**
 * Commit generated files to the repository
 * @param files - Array of file paths to commit
 * @param repoRoot - Repository root directory
 */
export async function commitGeneratedFiles(
  files: string[],
  repoRoot: string = process.cwd()
): Promise<void> {
  if (files.length === 0) {
    core.info('No files to commit');
    return;
  }

  try {
    // Configure git user (use GitHub Actions bot)
    execSync('git config user.name "github-actions[bot]"', { cwd: repoRoot });
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', {
      cwd: repoRoot,
    });

    // Add all generated files
    for (const file of files) {
      execSync(`git add "${file}"`, { cwd: repoRoot });
    }

    // Check if there are changes to commit
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
      cwd: repoRoot,
    }).trim();

    if (!status) {
      core.info('No changes to commit (files are already up-to-date)');
      return;
    }

    // Commit with special message
    const commitMessage = `${COMMIT_MESSAGE_PREFIX} Generated metadata files\n\nGenerated ${files.length} metadata files:\n${files.map((f) => `- ${f}`).join('\n')}`;

    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      stdio: 'inherit',
    });

    core.info(`Committed ${files.length} generated files`);

    // Push to remote
    execSync('git push', {
      cwd: repoRoot,
      stdio: 'inherit',
    });

    core.info('Pushed changes to remote repository');
  } catch (error) {
    core.error(`Failed to commit files: ${error}`);
    throw error;
  }
}
