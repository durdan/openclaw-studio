import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { ExportBundle, AdapterConfig, PublishResult } from '@openclaw-studio/shared';
import { BaseAdapter } from './base.adapter';
import { FilesystemAdapter } from './filesystem.adapter';

const execAsync = promisify(exec);

interface GitFileStructure {
  files: Record<string, string>;
}

export class GitAdapter extends BaseAdapter {
  name = 'Git Adapter';
  target_type = 'git';

  private filesystemAdapter = new FilesystemAdapter();

  translate(bundle: ExportBundle, config: AdapterConfig): GitFileStructure {
    const files = this.filesystemAdapter.translate(bundle, config) as Record<string, string>;
    return { files };
  }

  private async isGitAvailable(): Promise<boolean> {
    try {
      await execAsync('git --version');
      return true;
    } catch {
      return false;
    }
  }

  private async runGit(cwd: string, args: string): Promise<string> {
    const { stdout } = await execAsync(`git ${args}`, {
      cwd,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'OpenClaw Studio',
        GIT_AUTHOR_EMAIL: 'studio@openclaw.dev',
        GIT_COMMITTER_NAME: 'OpenClaw Studio',
        GIT_COMMITTER_EMAIL: 'studio@openclaw.dev',
      },
    });
    return stdout.trim();
  }

  async publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult> {
    const gitAvailable = await this.isGitAvailable();
    if (!gitAvailable) {
      return {
        success: false,
        target_type: this.target_type,
        message: 'Git is not installed or not available in PATH. Please install git to use the Git adapter.',
      };
    }

    const repoUrl = config.config.repo_url as string | undefined;
    const branch = (config.config.branch as string) || 'openclaw-studio-export';
    const commitMessage = (config.config.commit_message as string) ||
      `OpenClaw Studio: Export design ${bundle.graph.metadata.name || 'Untitled'}`;

    const tempDir = path.join(os.tmpdir(), `openclaw-studio-git-${Date.now()}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      this.log(`Created temp directory: ${tempDir}`);

      if (repoUrl) {
        this.log(`Cloning repository: ${repoUrl}`);
        try {
          await this.runGit(tempDir, `clone "${repoUrl}" .`);
        } catch (cloneError) {
          return {
            success: false,
            target_type: this.target_type,
            message: `Failed to clone repository: ${cloneError instanceof Error ? cloneError.message : 'Unknown error'}`,
          };
        }

        try {
          await this.runGit(tempDir, `checkout -b "${branch}"`);
        } catch {
          try {
            await this.runGit(tempDir, `checkout "${branch}"`);
          } catch {
            // Branch doesn't exist remotely, create it fresh
            await this.runGit(tempDir, `checkout -b "${branch}"`);
          }
        }
      } else {
        this.log('Initializing new git repository');
        await this.runGit(tempDir, 'init');
        await this.runGit(tempDir, `checkout -b "${branch}"`);
      }

      // Write all files from translate()
      const { files } = this.translate(bundle, config);
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf-8');
      }

      this.log(`Wrote ${Object.keys(files).length} files`);

      // Git add and commit
      await this.runGit(tempDir, 'add -A');

      let commitHash: string;
      try {
        commitHash = await this.runGit(tempDir, `commit -m "${commitMessage}"`);
        // Extract the commit hash from the output
        const hashMatch = commitHash.match(/\[[\w-]+ ([a-f0-9]+)\]/);
        commitHash = hashMatch ? hashMatch[1] : 'unknown';
      } catch (commitError) {
        // No changes to commit
        return {
          success: true,
          target_type: this.target_type,
          message: 'No changes detected - files already match the current design.',
          details: { temp_dir: tempDir, branch },
        };
      }

      // Push if repo_url is configured
      if (repoUrl) {
        try {
          await this.runGit(tempDir, `push origin "${branch}"`);
          this.log(`Pushed to ${repoUrl} branch ${branch}`);
        } catch (pushError) {
          return {
            success: false,
            target_type: this.target_type,
            message: `Commit succeeded but push failed: ${pushError instanceof Error ? pushError.message : 'Unknown error'}`,
            details: { commit_hash: commitHash, branch, temp_dir: tempDir },
          };
        }
      }

      return {
        success: true,
        target_type: this.target_type,
        message: repoUrl
          ? `Successfully committed and pushed to ${branch}`
          : `Successfully committed to local repository at ${tempDir}`,
        details: {
          commit_hash: commitHash,
          branch,
          file_count: Object.keys(files).length,
          temp_dir: repoUrl ? undefined : tempDir,
        },
      };
    } catch (error) {
      return {
        success: false,
        target_type: this.target_type,
        message: `Git export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    } finally {
      // Clean up temp dir only if we pushed to a remote
      if (repoUrl) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}

export const gitAdapter = new GitAdapter();
