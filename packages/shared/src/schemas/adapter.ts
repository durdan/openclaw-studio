import { ExportBundle } from './export-bundle';
import { ValidationResult } from './validation';

export interface AdapterConfig {
  target_type: string;
  config: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  target_type: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IExportAdapter {
  name: string;
  target_type: string;
  validate(bundle: ExportBundle, config: AdapterConfig): ValidationResult;
  translate(bundle: ExportBundle, config: AdapterConfig): unknown;
  publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult>;
}

export type { ExportBundle } from './export-bundle';
