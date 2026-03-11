import * as fs from 'fs';
import * as path from 'path';
import type { ExportBundle, AdapterConfig, PublishResult } from '@openclaw-studio/shared';
import { BaseAdapter } from './base.adapter';
import { OpenClawBundleAdapter } from './openclaw-bundle.adapter';

export class FilesystemAdapter extends BaseAdapter {
  name = 'Filesystem Adapter';
  target_type = 'filesystem';

  private bundleAdapter = new OpenClawBundleAdapter();

  translate(bundle: ExportBundle, config: AdapterConfig): Record<string, string> {
    // Use the OpenClaw bundle adapter to get the correct workspace file structure
    const workspaceBundle = this.bundleAdapter.translate(bundle, config);
    return workspaceBundle.files;
  }

  async publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult> {
    // Default to ~/.openclaw/ so files land in the right place
    const outputDir = (config.config.output_dir as string) || path.join(process.env.HOME || '~', '.openclaw');
    const files = this.translate(bundle, config);

    try {
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(outputDir, filePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf-8');
      }

      this.log(`Wrote ${Object.keys(files).length} files to ${outputDir}`);

      return {
        success: true,
        target_type: this.target_type,
        message: `Exported ${Object.keys(files).length} files to ${outputDir}`,
        details: {
          output_dir: outputDir,
          file_count: Object.keys(files).length,
          files: Object.keys(files),
        },
      };
    } catch (error) {
      return {
        success: false,
        target_type: this.target_type,
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const filesystemAdapter = new FilesystemAdapter();
