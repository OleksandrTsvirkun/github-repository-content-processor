import { Octokit } from "@octokit/rest";
import matter from "gray-matter";
import { RateLimitHandler } from "../utils/RateLimitHandler";
import { RetryHandler } from "../utils/RetryHandler";
import { ParallelBatchHandler } from "../utils/ParallelBatchHandler";
import { decodeBase64 } from "../utils/encoding";

export interface FileInfo {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  sha: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

/**
 * GitHub API client for content operations.
 * Uses async generators for streaming file processing with rate limiting and retries.
 */
export class GitHubClient {
  private octokit: Octokit;
  private rateLimitHandler: RateLimitHandler;
  private retryHandler: RetryHandler;
  private batchProcessor: ParallelBatchHandler;
  private contentRoot: string;

  constructor(token: string, contentRoot: string = "content") {
    if (!token) {
      throw new Error("GitHub token not provided");
    }

    this.contentRoot = contentRoot;
    this.octokit = new Octokit({
      auth: token,
    });

    this.rateLimitHandler = new RateLimitHandler(this.octokit, {
      autoWaitRateLimit: true,
      rateLimitThreshold: 10,
    });

    this.retryHandler = new RetryHandler({
      maxRetries: 3,
      retryDelayMs: 1000,
      rateLimitHandler: this.rateLimitHandler,
    });

    this.batchProcessor = new ParallelBatchHandler({
      maxParallel: 10,
    });
  }

  async *loadFiles(owner: string, repo: string, ref: string): AsyncGenerator<FileInfo> {
    for await (const fileInfo of this.batchProcessor.executeAsync(
      this.loadMarkdownPaths(owner, repo, this.contentRoot, ref),
      (path) => this.loadFileInfo(owner, repo, path, ref)
    )) {
      if (fileInfo !== null) {
        yield fileInfo;
      }
    }
  }

  /**
   * Recursively yields all markdown file paths from a directory.
   * Uses parallel processing for subdirectories with controlled concurrency.
   */
  private async *loadMarkdownPaths(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): AsyncGenerator<string> {
    const contents = await this.loadDirectory(owner, repo, path, ref, true);

    const subdirs: string[] = [];

    for (const item of contents) {
      if (item.type === "file" && item.name.endsWith(".md")) {
        yield item.path;
      } else if (item.type === "dir") {
        subdirs.push(item.path);
      }
    }

    // Process subdirectories in parallel batches
    if (subdirs.length === 0) {
      return;
    }

    yield* this.batchProcessor.executeMany(
      subdirs,
      (subdir) => this.loadMarkdownPaths(owner, repo, subdir, ref)
    );
  }

  /**
   * Loads a single file with parsed frontmatter.
   */
  async loadFileInfo(
    owner: string,
    repo: string,
    path: string,
    ref: string,
    withRateLimitCheck?: boolean
  ): Promise<FileInfo | null> {
    try {
      const { content, sha } = await this.loadFile(owner, repo, path, ref, withRateLimitCheck);
      const { data: frontmatter, content: markdown } = matter(content);

      return {
        path,
        content: markdown,
        frontmatter,
        sha,
      };
    } catch (error) {
      console.error(`Failed to load file ${path}:`, error);
      return null;
    }
  }

  /**
   * Gets directory contents from GitHub with retry mechanism and exponential backoff.
   */
  private loadDirectory(
    owner: string,
    repo: string,
    path: string,
    ref: string,
    withRateLimitCheck?: boolean
  ) {
    const loader = async () => {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    };

    return this.retryHandler.execute(
      () => withRateLimitCheck
        ? this.rateLimitHandler.execute(
          loader,
          `loading directory ${path} with rate limit check`
        )
        : loader(),
      `loading directory ${path} with retry`
    );
  }

  /**
   * Gets file content from GitHub.
   * Supports both inline content (small files) and Git Blob API (large files >1MB).
   */
  async loadFile(
    owner: string,
    repo: string,
    path: string,
    ref: string,
    withRateLimitCheck?: boolean
  ): Promise<{ content: string; sha: string }> {
    try {
      const loadContent = () => this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      const { data } = await this.retryHandler.execute(
        () => withRateLimitCheck
          ? this.rateLimitHandler.execute(
            loadContent,
            `loading file content ${path} with rate limit check`
          )
          : loadContent(),
        `loading file content ${path} with retry`
      );

      if ("content" in data && data.type === "file") {
        // Case 1: Small files with inline base64 content
        if (data.content && !data.encoding) {
          return { content: data.content, sha: data.sha };
        }

        // Case 2: Base64 encoded content
        if (data.content && data.encoding === "base64") {
          const content = decodeBase64(data.content);
          return { content, sha: data.sha };
        }

        // Case 3: Large files (>1MB) - use Git Blob API
        if (!data.content && data.sha) {
          const loadBlob = () => this.octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: data.sha,
          });

          const { data: blob } = await this.retryHandler.execute(
            () => withRateLimitCheck
              ? this.rateLimitHandler.execute(
                loadBlob,
                `loading blob for file ${path} with rate limit check`
              )
              : loadBlob(),
            `loading blob for file ${path} with retry`
          );

          if (blob.encoding === "base64") {
            const content = decodeBase64(blob.content);
            return { content, sha: blob.sha };
          } else {
            return { content: blob.content, sha: blob.sha };
          }
        }
      }

      throw new Error(`File not found or is not a file: ${path}`);
    } catch (error: any) {
      // Enhanced error messages for specific status codes
      if (error.status === 404) {
        throw new Error(`File not found: ${path}`);
      } else if (error.status === 403) {
        throw new Error(`Access forbidden to ${path}: ${error.message}`);
      } else if (error.status === 500 || error.status === 502 || error.status === 503) {
        throw new Error(`GitHub server error (${error.status}) for ${path}`);
      }

      throw error;
    }
  }

  /**
   * Stream changed files for a pull request or commit comparison.
   */
  async *getChangedFilesStream(
    owner: string,
    repo: string,
    baseRef: string,
    headRef: string
  ): AsyncGenerator<string> {
    try {
      const { data } = await this.retryHandler.execute(
        () => this.rateLimitHandler.execute(
          () => this.octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: baseRef,
            head: headRef,
          }),
          `comparing commits ${baseRef}...${headRef}`
        ),
        "comparing commits with retry"
      );

      for (const file of data.files || []) {
        yield file.filename;
      }
    } catch (error: any) {
      console.error(`Failed to get changed files: ${error.message}`);
      throw new Error(`Failed to get changed files: ${error.message}`);
    }
  }

  /**
   * Get changed files as array (for backward compatibility).
   */
  async getChangedFiles(
    owner: string,
    repo: string,
    baseRef: string,
    headRef: string
  ): Promise<string[]> {
    const files: string[] = [];
    for await (const file of this.getChangedFilesStream(owner, repo, baseRef, headRef)) {
      files.push(file);
    }
    return files;
  }

  /**
   * Get single file content (for backward compatibility).
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFile> {
    const fileInfo = await this.loadFileInfo(owner, repo, path, ref || "HEAD", true);
    
    if (!fileInfo) {
      throw new Error(`Failed to load file: ${path}`);
    }

    return {
      path: fileInfo.path,
      content: fileInfo.content,
      sha: fileInfo.sha,
    };
  }

  async createCheckRun(
    owner: string,
    repo: string,
    name: string,
    headSha: string,
    status: "queued" | "in_progress" | "completed",
    conclusion?:
      | "success"
      | "failure"
      | "neutral"
      | "cancelled"
      | "skipped"
      | "timed_out"
      | "action_required"
  ): Promise<number> {
    try {
      const { data } = await this.octokit.rest.checks.create({
        owner,
        repo,
        name,
        head_sha: headSha,
        status,
        conclusion,
      });

      return data.id;
    } catch (error) {
      throw new Error(`Failed to create check run: ${error}`);
    }
  }

  async updateCheckRun(
    owner: string,
    repo: string,
    checkRunId: number,
    status: "queued" | "in_progress" | "completed",
    conclusion?:
      | "success"
      | "failure"
      | "neutral"
      | "cancelled"
      | "skipped"
      | "timed_out"
      | "action_required",
    output?: {
      title: string;
      summary: string;
      text?: string;
    }
  ): Promise<void> {
    try {
      await this.octokit.rest.checks.update({
        owner,
        repo,
        check_run_id: checkRunId,
        status,
        conclusion,
        output,
      });
    } catch (error) {
      throw new Error(`Failed to update check run: ${error}`);
    }
  }
}
