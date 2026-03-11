import type {
  IExportAdapter,
  ExportBundle,
  AdapterConfig,
  PublishResult,
  ValidationResult,
} from '@openclaw-studio/shared';

export abstract class BaseAdapter implements IExportAdapter {
  abstract name: string;
  abstract target_type: string;

  validate(bundle: ExportBundle, _config: AdapterConfig): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    if (!bundle.graph.nodes.length) {
      warnings.push({
        rule_id: 'empty-graph',
        message: 'Export bundle contains an empty graph',
        severity: 'warning',
      });
    }

    if (!bundle.agent_definitions.length) {
      warnings.push({
        rule_id: 'no-agents',
        message: 'Export bundle contains no agent definitions',
        severity: 'warning',
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  abstract translate(bundle: ExportBundle, config: AdapterConfig): unknown;
  abstract publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult>;

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
