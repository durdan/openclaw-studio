import { NodeType } from './graph';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationRule {
  id: string;
  node_type?: NodeType;
  description: string;
  severity: ValidationSeverity;
}

export interface ValidationIssue {
  rule_id: string;
  node_id?: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
