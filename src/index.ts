import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './services/GitHubClient';
import { processRepositoryContent, processSpecificFiles, formatValidationReport } from './services/ContentProcessor';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const context = github.context;
    
    core.info(`Event: ${context.eventName}`);
    core.info(`Action: ${context.payload.action || 'N/A'}`);
    
    const githubClient = new GitHubClient(token);
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    
    let changedFiles: string[] = [];
    let ref: string;
    let checkName = 'Content Validation';
    
    // Determine event type and get changed files
    if (context.eventName === 'push') {
      core.info(`Processing push event`);
      ref = context.sha;
      const beforeSha = context.payload.before;
      const afterSha = context.payload.after || context.sha;
      
      core.info(`Commits: ${beforeSha} -> ${afterSha}`);
      
      // Get changed files
      for await (const file of githubClient.getChangedFilesStream(owner, repo, beforeSha, afterSha)) {
        changedFiles.push(file);
      }
      
    } else if (context.eventName === 'pull_request') {
      core.info(`Processing pull request event`);
      const prNumber = context.payload.pull_request?.number;
      const baseSha = context.payload.pull_request?.base?.sha;
      const headSha = context.payload.pull_request?.head?.sha;
      ref = headSha || context.sha;
      
      core.info(`PR #${prNumber}: ${baseSha} -> ${headSha}`);
      
      // Get changed files in PR
      for await (const file of githubClient.getChangedFilesStream(owner, repo, baseSha, headSha)) {
        changedFiles.push(file);
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
    
    // Create check run
    const checkRunId = await githubClient.createCheckRun(
      owner,
      repo,
      checkName,
      ref,
      'in_progress'
    );
    
    core.info(`Created check run ${checkRunId}`);
    
    // Process and validate content
    const result = await processSpecificFiles(
      githubClient,
      owner,
      repo,
      changedFiles,
      ref
    );
    
    // Determine conclusion
    const conclusion = result.invalidFiles === 0 ? 'success' : 'failure';
    const report = formatValidationReport(result);
    
    // Update check run
    await githubClient.updateCheckRun(
      owner,
      repo,
      checkRunId,
      'completed',
      conclusion,
      {
        title: 'Content Validation Results',
        summary: `Validated ${result.totalFiles} files: ${result.validFiles} valid, ${result.invalidFiles} invalid`,
        text: report,
      }
    );
    
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

run();
