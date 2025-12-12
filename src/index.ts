import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import { formatValidationReport, validateFileContent } from './services/ContentProcessor';
import { loadLocalFiles, loadLocalFile } from './services/LocalFileLoader';
import { ValidationResult } from './types/validation';

interface ContentProcessingResult {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: Array<{ file: string; errors: string[] }>;
}

async function run(): Promise<void> {
  try {
    const context = github.context;
    
    core.info(`Event: ${context.eventName || 'undefined'}`);
    core.info(`Action: ${context.payload.action || 'N/A'}`);
    
    // Skip if commit is from a bot (to avoid infinite loops)
    const commitAuthor = context.payload.head_commit?.author?.username || 
                        context.payload.commits?.[0]?.author?.username;
    const commitMessage = context.payload.head_commit?.message || 
                         context.payload.commits?.[0]?.message || '';
    
    if (commitAuthor?.endsWith('[bot]') || commitAuthor === 'github-actions[bot]') {
      core.info(`Skipping validation: commit is from bot ${commitAuthor}`);
      return;
    }
    
    // Skip if commit message contains [skip ci] or [skip validation]
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
    
    let changedFiles: string[] = [];
    let ref: string;
    let checkName = 'Content Validation';    // Determine event type and get changed files
    if (context.eventName === 'push') {
      core.info(`Processing push event`);
      ref = context.sha;

      // Get before/after SHAs from webhook payload (GitHub provides these automatically)
      let beforeSha = context.payload.before || '';
      let afterSha = context.payload.after || context.sha;

      // Handle special cases for beforeSha
      // GitHub sends '0000000000000000000000000000000000000000' for new branches
      if (beforeSha === '0000000000000000000000000000000000000000') {
        core.info('New branch detected (before SHA is all zeros)');
        beforeSha = '';
      }

      // Log the SHAs from webhook
      core.info(`Before SHA from webhook: ${beforeSha || '(empty - will scan all files)'}`);
      core.info(`After SHA from webhook: ${afterSha}`);
      core.info(`Commits: ${beforeSha || '(none)'} -> ${afterSha}`);
      
      // Check if we have local checkout (faster than API)
      const hasLocalCheckout = fs.existsSync('.git');
      
      if (hasLocalCheckout) {
        core.info('Using local git for file comparison (faster)');
        
        // Get changed files using local git
        if (beforeSha && afterSha) {
          const { execSync } = await import('child_process');
          try {
            const output = execSync(
              `git diff --name-only ${beforeSha} ${afterSha}`,
              { encoding: 'utf8', cwd: process.cwd() }
            );
            
            changedFiles = output
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && line.endsWith('.md'));
            
            core.info(`Found ${changedFiles.length} changed markdown files locally`);
          } catch (error) {
            core.warning(`Failed to get local git diff: ${error}`);
          }
        }
        
        // If no changed files or no beforeSha, get all local markdown files
        if (changedFiles.length === 0 && !beforeSha) {
          core.info('No before SHA, scanning all local markdown files');
          for await (const fileInfo of loadLocalFiles(process.cwd())) {
            changedFiles.push(fileInfo.path);
          }
        }
      } else {
        core.warning('No local checkout detected! Please add checkout step before this action.');
        core.warning('Example: uses: actions/checkout@v4 with fetch-depth: 0');
        throw new Error('Local checkout is required for this action to work');
      }
    } else if (context.eventName === 'pull_request') {
      core.info(`Processing pull request event`);
      core.warning('Pull request event not supported without GitHub API - using local files only');
      ref = context.sha;

      // Get all local markdown files for PR (without API)
      for await (const fileInfo of loadLocalFiles(process.cwd())) {
        changedFiles.push(fileInfo.path);
      }

    } else {
      core.warning(`Unsupported event type: ${context.eventName}`);
      return;
    }

    core.info(`Found ${changedFiles.length} changed files`);
    
    if (changedFiles.length === 0) {
      core.info('No files changed, skipping validation');
      return;
    }
    
    // Process and validate content locally
    const result: ContentProcessingResult = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      errors: [],
    };

    core.info(`Processing ${changedFiles.length} files locally`);

    // Filter markdown files
    const markdownFiles = changedFiles.filter(
      (path) => path.endsWith('.md') && !path.includes('node_modules')
    );

    core.info(`Found ${markdownFiles.length} markdown files to validate`);
    result.totalFiles = markdownFiles.length;

    // Process files locally
    for (const filePath of markdownFiles) {
      try {
        const localFileInfo = await loadLocalFile(filePath);

        if (!localFileInfo) {
          result.invalidFiles++;
          result.errors.push({
            file: filePath,
            errors: ['Failed to load file'],
          });
          continue;
        }

        // Convert LocalFileInfo to FileInfo format
        const fileInfo = {
          ...localFileInfo,
          sha: '', // SHA not available for local files
        };

        const validationResult = await validateFileContent(fileInfo);

        if (validationResult.errors.length === 0) {
          result.validFiles++;
        } else {
          result.invalidFiles++;
          result.errors.push({
            file: filePath,
            errors: validationResult.errors.map((e) => e.message),
          });
        }
      } catch (error) {
        core.error(`Failed to process file ${filePath}: ${error}`);
        result.invalidFiles++;
        result.errors.push({
          file: filePath,
          errors: [`Failed to process: ${error}`],
        });
      }
    }

    core.info(`Completed: ${result.validFiles} valid, ${result.invalidFiles} invalid`);

    // Determine conclusion
    const conclusion = result.invalidFiles === 0 ? 'success' : 'failure';
    const report = formatValidationReport(result);

    core.info(`Validation completed: ${conclusion}`);
    core.info(`Valid: ${result.validFiles}, Invalid: ${result.invalidFiles}`);

    // Set outputs
    core.setOutput('total-files', result.totalFiles);
    core.setOutput('valid-files', result.validFiles);
    core.setOutput('invalid-files', result.invalidFiles);
    core.setOutput('conclusion', conclusion);

    // Fail the action if validation failed
    if (conclusion === 'failure') {
      core.setFailed(`Content validation failed: ${result.invalidFiles} invalid files`);
    }

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
