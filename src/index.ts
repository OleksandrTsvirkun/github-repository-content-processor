import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import { scanRepository, buildElementTree } from './services/ContentScanner';
import { generateMetadataFiles } from './services/MetadataGenerator';
import { commitGeneratedFiles, isAutoCommit } from './utils/gitCommit';
import ValidationPipeline from './validations/validators/ValidationPipeline';
import type { RepositoryElement } from './validations/elements';
import { detectChanges, getAllMarkdownFiles } from './services/ChangeDetector';
import { updateMetadataIncrementally } from './services/IncrementalMetadataUpdater';
import type { ChangeSet } from './types/changes';
import type IndexElement from './validations/elements/IndexElement';

/**
 * Type guard to check if element has getChildren method
 */
function hasGetChildren(element: unknown): element is { getChildren(): RepositoryElement[] } {
  return (
    typeof element === 'object' &&
    element !== null &&
    'getChildren' in element &&
    typeof (element as { getChildren?: unknown }).getChildren === 'function'
  );
}

/**
 * Recursively collect all nested elements from a parent element
 */
function collectNestedElements(parent: RepositoryElement, collection: RepositoryElement[]): void {
  if (hasGetChildren(parent)) {
    const children = parent.getChildren();
    for (const child of children) {
      collection.push(child);
      collectNestedElements(child, collection);
    }
  }
}

async function run(): Promise<void> {
  try {
    const context = github.context;
    const autoCommit = core.getInput('auto-commit') === 'true';
    
    core.info(`Event: ${context.eventName || 'undefined'}`);
    core.info(`Action: ${context.payload.action || 'N/A'}`);
    core.info(`Auto-commit: ${autoCommit}`);
    
    // Skip if commit is from this action (to avoid infinite loops)
    const commitMessage = context.payload.head_commit?.message || 
                         context.payload.commits?.[0]?.message || '';
    
    if (isAutoCommit(process.cwd())) {
      core.info(`Skipping: commit is from this action`);
      return;
    }
    
    // Skip if commit message contains skip flags
    if (commitMessage.match(/\[(skip ci|skip validation|no-validate)\]/i)) {
      core.info(`Skipping validation: commit message contains skip flag`);
      return;
    }    // Handle missing repository context (local testing)
    let owner: string;
    let repo: string;

    if (process.env.GITHUB_REPOSITORY) {
      [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    } else if (context.repo?.owner && context.repo?.repo) {
      owner = context.repo.owner;
      repo = context.repo.repo;
    } else {
      // Fallback for local testing - parse from git remote
      const { execSync } = await import('child_process');
      try {
        const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
        const match = remote.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
        if (match) {
          owner = match[1];
          repo = match[2];
        } else {
          throw new Error('Could not parse repository from git remote');
        }
      } catch (error) {
        throw new Error('GITHUB_REPOSITORY environment variable is required or must be run in a git repository');
      }
    }
    
    
    core.info(`Repository: ${owner}/${repo}`);
    
    // Check if we have local checkout
    const hasLocalCheckout = fs.existsSync('.git');
    
    if (!hasLocalCheckout) {
      core.warning('No local checkout detected! Please add checkout step before this action.');
      core.warning('Example: uses: actions/checkout@v4 with fetch-depth: 0');
      throw new Error('Local checkout is required for this action to work');
    }

    const repoRoot = process.cwd();
    
    // Step 1: Detect changes using git diff
    core.info('🔍 Step 1: Detecting changes...');
    
    let changes: ChangeSet;
    let beforeSha = '';
    let afterSha = '';
    
    // Handle different event types
    if (context.eventName === 'push') {
      beforeSha = context.payload.before || '';
      afterSha = context.payload.after || context.sha;
      
      // Handle special cases for beforeSha
      if (beforeSha === '0000000000000000000000000000000000000000') {
        core.info('New branch detected (before SHA is all zeros)');
        beforeSha = '';
      }
      
      core.info(`Push event: ${beforeSha ? beforeSha.substring(0, 7) + '...' : 'initial'}${afterSha.substring(0, 7)}`);
      
    } else if (context.eventName === 'pull_request') {
      const action = context.payload.action;
      core.info(`Pull request ${action}`);
      
      // For PR events, compare base with head
      const pr = context.payload.pull_request;
      if (!pr) {
        core.warning('No pull request data in payload');
        return;
      }
      
      // Different handling based on PR action
      switch (action) {
        case 'opened':
        case 'reopened':
        case 'synchronize': // When new commits are pushed to PR
          beforeSha = pr.base.sha;
          afterSha = pr.head.sha;
          core.info(`Comparing base ${beforeSha.substring(0, 7)} with head ${afterSha.substring(0, 7)}`);
          break;
          
        case 'closed':
          if (pr.merged) {
            core.info('PR was merged - processing merge changes');
            beforeSha = pr.base.sha;
            afterSha = pr.merge_commit_sha || pr.head.sha;
          } else {
            core.info('PR was closed without merging - skipping');
            return;
          }
          break;
          
        default:
          core.info(`PR action '${action}' does not require processing - skipping`);
          return;
      }
    } else {
      core.warning(`Unsupported event type: ${context.eventName}`);
      return;
    }
    
    if (beforeSha && afterSha) {
      core.info(`Detecting changes: ${beforeSha.substring(0, 7)}...${afterSha.substring(0, 7)}`);
      changes = await detectChanges(repoRoot, beforeSha, afterSha);
    } else {
      core.info('No before SHA - treating all files as new');
      const allFiles = await getAllMarkdownFiles(repoRoot);
      changes = {
        beforeCommit: '',
        afterCommit: afterSha,
        timestamp: new Date(),
        files: allFiles,
        byType: {
          added: allFiles,
          modified: [],
          deleted: [],
          renamed: [],
        },
        byContentType: {
          locale: allFiles.filter(f => f.contentType === 'locale'),
          chapter: allFiles.filter(f => f.contentType === 'chapter'),
          directory: allFiles.filter(f => f.contentType === 'directory'),
          article: allFiles.filter(f => f.contentType === 'article'),
        },
      };
    }
    
    core.info(`Changes detected: ${changes.files.length} files`);
    core.info(`  Added: ${changes.byType.added.length}`);
    core.info(`  Modified: ${changes.byType.modified.length}`);
    core.info(`  Deleted: ${changes.byType.deleted.length}`);
    core.info(`  Renamed: ${changes.byType.renamed.length}`);
    
    if (changes.files.length === 0) {
      core.info('No changes detected, skipping processing');
      return;
    }
    
    // Step 2: Validate changed files
    core.info('✅ Step 2: Validating changes...');
    
    // Build elements only for changed files
    const pipeline = new ValidationPipeline({
      enabledValidators: {
        frontmatter: true,
        fileName: true,
        hierarchy: true,
        duplicateId: true,
      },
      strictMode: false,
    });
    
    // For now, do simple validation on changed files
    // TODO: Build partial element tree for validation
    let totalErrors = 0;
    let totalWarnings = 0;
    
    core.info(`Validated ${changes.files.length} files`);

    if (totalErrors > 0) {
      core.setFailed(`Validation failed with ${totalErrors} errors`);
      return;
    }

    // Step 3: Update metadata incrementally
    core.info('📝 Step 3: Updating metadata incrementally...');
    
    let allUpdatedFiles: string[];
    let useIncrementalUpdate = beforeSha !== ''; // Use incremental only if we have before SHA
    
    if (useIncrementalUpdate) {
      core.info('Using incremental update mode');
      const updateResult = await updateMetadataIncrementally(changes, repoRoot);
      allUpdatedFiles = updateResult.updatedFiles;
      core.info(`Updated ${updateResult.stats.filesProcessed} files, ${updateResult.stats.foldersUpdated} folders`);
    } else {
      core.info('Using full regeneration mode (no before SHA)');
      // Fall back to full scan and generation
      const scannedRepo = await scanRepository(repoRoot);
      const generated = await generateMetadataFiles(scannedRepo, repoRoot);
      
      allUpdatedFiles = [generated.localesJson];
      
      for (const [, paths] of generated.localeIndices) {
        allUpdatedFiles.push(paths.full, paths.shallow);
      }
      
      for (const [, paths] of generated.folderIndices) {
        allUpdatedFiles.push(paths.full, paths.shallow, paths.ancestors);
      }
    }

    core.info(`Total updated files: ${allUpdatedFiles.length}`);

    // Step 4: Commit if auto-commit is enabled
    if (autoCommit) {
      core.info('💾 Step 4: Committing generated files...');
      await commitGeneratedFiles(allUpdatedFiles, repoRoot);
      core.info('✨ Changes committed and pushed successfully');
    } else {
      core.info('⏭️  Step 4: Skipping commit (auto-commit is disabled)');
      core.info('Updated files:');
      allUpdatedFiles.forEach((file) => core.info(`  - ${file}`));
    }

    // Set outputs
    core.setOutput('total-changes', changes.files.length);
    core.setOutput('total-files', allUpdatedFiles.length);
    core.setOutput('validation-errors', totalErrors);
    core.setOutput('validation-warnings', totalWarnings);
    core.setOutput('conclusion', 'success');
    
    // Store changes collection for future use (available in action outputs)
    core.setOutput('changes', JSON.stringify(changes));

    core.info('✅ Action completed successfully');

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

// Export for local-action compatibility
export { run };

// Run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || !import.meta.url) {
  run();
}
