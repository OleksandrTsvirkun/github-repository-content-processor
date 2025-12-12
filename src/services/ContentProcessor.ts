import { GitHubClient, type FileInfo } from "./GitHubClient";
import * as core from '@actions/core';
import {
  ValidationError,
  ValidationErrorCode,
  ValidationResult
} from "../validations/core/types";

export interface ContentProcessingResult {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errors: Array<{
    file: string;
    errors: string[];
  }>;
}

/**
 * Process repository content using async generators for streaming.
 * Validates markdown files as they are loaded from GitHub.
 */
export async function processRepositoryContent(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  ref: string
): Promise<ContentProcessingResult> {
  const result: ContentProcessingResult = {
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
  };

  core.info(`Processing content from ${owner}/${repo}@${ref}`);

  try {
    // Stream files using async generator
    for await (const fileInfo of githubClient.loadFiles(owner, repo, ref)) {
      result.totalFiles++;

      try {
        const validationResult = await validateFileContent(fileInfo);

        if (validationResult.errors.length === 0) {
          result.validFiles++;
        } else {
          result.invalidFiles++;
          result.errors.push({
            file: fileInfo.path,
            errors: validationResult.errors.map((e) => e.message),
          });
        }
      } catch (error) {
        core.error(`Failed to validate file ${fileInfo.path}: ${error}`);
        result.invalidFiles++;
        result.errors.push({
          file: fileInfo.path,
          errors: [`Validation failed: ${error}`],
        });
      }

      // Log progress every 10 files
      if (result.totalFiles % 10 === 0) {
        core.info(
          `Progress: ${result.totalFiles} files processed ` +
            `(${result.validFiles} valid, ${result.invalidFiles} invalid)`
        );
      }
    }

    core.info(
      `Completed processing: ${result.totalFiles} files ` +
        `(${result.validFiles} valid, ${result.invalidFiles} invalid)`
    );
  } catch (error) {
    core.error(`Failed to process repository content: ${error}`);
    throw error;
  }

  return result;
}

/**
 * Process specific files (for PR validation).
 */
export async function processSpecificFiles(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  filePaths: string[],
  ref: string
): Promise<ContentProcessingResult> {
  const result: ContentProcessingResult = {
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    errors: [],
  };

  core.info(`Processing ${filePaths.length} specific files from ${owner}/${repo}@${ref}`);

  // Filter markdown files
  const markdownFiles = filePaths.filter(
    (path) => path.endsWith(".md") && !path.includes("node_modules")
  );

  core.info(`Found ${markdownFiles.length} markdown files to validate`);
  result.totalFiles = markdownFiles.length;

  // Process files using async iteration
  for (const filePath of markdownFiles) {
    try {
      const fileInfo = await githubClient.loadFileInfo(owner, repo, filePath, ref, true);

      if (!fileInfo) {
        result.invalidFiles++;
        result.errors.push({
          file: filePath,
          errors: ["Failed to load file"],
        });
        continue;
      }

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

  return result;
}

async function validateFileContent(
  fileInfo: FileInfo
): Promise<ValidationResult> {
  try {
    // TODO: Implement actual validation using validation pipeline
    // For now, return basic validation result
    const errors: ValidationError[] = [];

    // Basic checks
    if (!fileInfo.content || fileInfo.content.trim().length === 0) {
      errors.push({
        message: "File content is empty",
        path: fileInfo.path,
        start: { line: 1, column: 1, offset: 0 },
        severity: "error" as const,
        code: ValidationErrorCode.VALIDATION_ERROR,
      });
    }

    if (!fileInfo.frontmatter || Object.keys(fileInfo.frontmatter).length === 0) {
      errors.push({
        message: "Missing frontmatter",
        path: fileInfo.path,
        start: { line: 1, column: 1, offset: 0 },
        severity: "error" as const,
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD,
      });
    }

    if (errors.length > 0) {
      core.warning(`Validation failed for ${fileInfo.path}: ${errors.length} errors`);
    }

    return {
      errors,
      warnings: [],
      infos: [],
      stats: {
        checked: { locales: 0, chapters: 0, directories: 0, articles: 1 },
        generated: { locales: 0, chapters: 0, directories: 0, articles: 0 },
        ignored: { locales: 0, chapters: 0, directories: 0, articles: 0 },
        modified: { locales: 0, chapters: 0, directories: 0, articles: 0 },
      },
    };
  } catch (error) {
    core.error(`Validation error for ${fileInfo.path}: ${error}`);
    return {
      errors: [
        {
          message: `Validation threw error: ${error}`,
          path: fileInfo.path,
          start: { line: 0, column: 0, offset: 0 },
          severity: "error" as const,
          code: ValidationErrorCode.VALIDATION_ERROR,
        },
      ],
      warnings: [],
      infos: [],
      stats: {
        checked: { locales: 0, chapters: 0, directories: 0, articles: 1 },
        generated: { locales: 0, chapters: 0, directories: 0, articles: 0 },
        ignored: { locales: 0, chapters: 0, directories: 0, articles: 0 },
        modified: { locales: 0, chapters: 0, directories: 0, articles: 0 },
      },
    };
  }
}

export function formatValidationReport(result: ContentProcessingResult): string {
  const lines: string[] = [];

  lines.push(`# Content Validation Report`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Total files: ${result.totalFiles}`);
  lines.push(`- Valid files: ${result.validFiles}`);
  lines.push(`- Invalid files: ${result.invalidFiles}`);
  lines.push(``);

  if (result.errors.length > 0) {
    lines.push(`## Errors`);
    lines.push(``);

    for (const error of result.errors) {
      lines.push(`### ${error.file}`);
      lines.push(``);
      for (const msg of error.errors) {
        lines.push(`- ${msg}`);
      }
      lines.push(``);
    }
  }

  return lines.join("\n");
}
