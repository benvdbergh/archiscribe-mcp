/**
 * Validation Reporting System
 * 
 * Provides comprehensive validation reports with:
 * - Errors (blocking issues)
 * - Warnings (non-blocking issues)
 * - Suggestions (improvements)
 * - Multiple output formats (JSON, Markdown, structured text)
 * 
 * @module utils/validation-reporter
 */

import { ValidationError, ValidationResult } from './xsd-validator';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  SUGGESTION = 'suggestion'
}

/**
 * Enhanced validation error with severity and suggestions
 */
export interface EnhancedValidationError extends ValidationError {
  severity: ValidationSeverity;
  suggestions?: string[];
  category?: string; // e.g., 'xsd', 'business-rule', 'referential-integrity'
}

/**
 * Comprehensive validation report
 */
export interface ValidationReport {
  valid: boolean;
  timestamp: string;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalSuggestions: number;
    errorsByCategory: Record<string, number>;
  };
  errors: EnhancedValidationError[];
  warnings: EnhancedValidationError[];
  suggestions: EnhancedValidationError[];
}

/**
 * Validation Reporter
 */
export class ValidationReporter {
  /**
   * Create a comprehensive validation report from validation results
   */
  createReport(
    xsdResult?: ValidationResult,
    businessRulesResult?: ValidationResult,
    referentialIntegrityResult?: ValidationResult
  ): ValidationReport {
    const errors: EnhancedValidationError[] = [];
    const warnings: EnhancedValidationError[] = [];
    const suggestions: EnhancedValidationError[] = [];

    // Process XSD validation results
    if (xsdResult && !xsdResult.valid) {
      for (const error of xsdResult.errors) {
        errors.push({
          ...error,
          severity: ValidationSeverity.ERROR,
          category: 'xsd',
          suggestions: this.generateXSDSuggestions(error)
        });
      }
    }

    // Process business rules validation results
    if (businessRulesResult && !businessRulesResult.valid) {
      for (const error of businessRulesResult.errors) {
        errors.push({
          ...error,
          severity: ValidationSeverity.ERROR,
          category: 'business-rule',
          suggestions: this.generateBusinessRuleSuggestions(error)
        });
      }
    }

    // Process referential integrity validation results
    if (referentialIntegrityResult && !referentialIntegrityResult.valid) {
      for (const error of referentialIntegrityResult.errors) {
        errors.push({
          ...error,
          severity: ValidationSeverity.ERROR,
          category: 'referential-integrity',
          suggestions: this.generateReferentialIntegritySuggestions(error)
        });
      }
    }

    // Categorize errors
    const errorsByCategory: Record<string, number> = {};
    for (const error of errors) {
      const category = error.category || 'unknown';
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
    }

    return {
      valid: errors.length === 0,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        totalSuggestions: suggestions.length,
        errorsByCategory
      },
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Generate suggestions for XSD validation errors
   */
  private generateXSDSuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('element')) {
      suggestions.push('Check that the element structure matches ArchiMate 3.1 XSD schema');
      suggestions.push('Verify element type is a valid ArchiMate 3.1 element type');
    }

    if (error.message.includes('relationship')) {
      suggestions.push('Check that the relationship structure matches ArchiMate 3.1 XSD schema');
      suggestions.push('Verify relationship type is a valid ArchiMate 3.1 relationship type');
    }

    if (error.message.includes('namespace')) {
      suggestions.push('Verify XML namespaces are correctly declared');
      suggestions.push('Check that schema location attributes are correct');
    }

    if (error.path) {
      suggestions.push(`Review the element at path: ${error.path}`);
    }

    return suggestions;
  }

  /**
   * Generate suggestions for business rule validation errors
   */
  private generateBusinessRuleSuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('compatible')) {
      suggestions.push('Review ArchiMate 3.1 specification for allowed relationship types between these element types');
      suggestions.push('Consider using a different relationship type that is compatible with both source and target elements');
    }

    if (error.message.includes('cardinality')) {
      suggestions.push('Check if this relationship type allows multiple relationships between the same source and target');
      suggestions.push('Consider removing duplicate relationships or using a different relationship type');
    }

    if (error.message.includes('element type')) {
      suggestions.push('Verify the element type is a valid ArchiMate 3.1 element type');
      suggestions.push('Check the ArchiMate 3.1 specification for valid element types');
    }

    return suggestions;
  }

  /**
   * Generate suggestions for referential integrity validation errors
   */
  private generateReferentialIntegritySuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('not found')) {
      const match = error.message.match(/not found: (.+)/);
      if (match) {
        const missingId = match[1];
        suggestions.push(`Create the missing element/relationship with identifier: ${missingId}`);
        suggestions.push(`Or update the reference to point to an existing element/relationship`);
      }
    }

    if (error.message.includes('Duplicate')) {
      suggestions.push('Ensure all identifiers are unique across elements, relationships, and views');
      suggestions.push('Use the generateId() method to create unique identifiers');
    }

    if (error.message.includes('property definition')) {
      suggestions.push('Create the missing property definition before assigning properties');
      suggestions.push('Or remove the property assignment if the property definition is not needed');
    }

    return suggestions;
  }

  /**
   * Format report as JSON
   */
  toJSON(report: ValidationReport, pretty: boolean = true): string {
    return JSON.stringify(report, null, pretty ? 2 : 0);
  }

  /**
   * Format report as Markdown
   */
  toMarkdown(report: ValidationReport): string {
    const lines: string[] = [];

    lines.push('# Validation Report');
    lines.push('');
    lines.push(`**Timestamp:** ${report.timestamp}`);
    lines.push(`**Status:** ${report.valid ? '✅ Valid' : '❌ Invalid'}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Errors:** ${report.summary.totalErrors}`);
    lines.push(`- **Total Warnings:** ${report.summary.totalWarnings}`);
    lines.push(`- **Total Suggestions:** ${report.summary.totalSuggestions}`);
    lines.push('');

    if (Object.keys(report.summary.errorsByCategory).length > 0) {
      lines.push('### Errors by Category');
      lines.push('');
      for (const [category, count] of Object.entries(report.summary.errorsByCategory)) {
        lines.push(`- **${category}:** ${count}`);
      }
      lines.push('');
    }

    // Errors
    if (report.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of report.errors) {
        lines.push(`### ${error.message}`);
        lines.push('');
        if (error.path) {
          lines.push(`**Path:** \`${error.path}\``);
        }
        if (error.line) {
          lines.push(`**Line:** ${error.line}`);
        }
        if (error.column) {
          lines.push(`**Column:** ${error.column}`);
        }
        if (error.suggestions && error.suggestions.length > 0) {
          lines.push('');
          lines.push('**Suggestions:**');
          for (const suggestion of error.suggestions) {
            lines.push(`- ${suggestion}`);
          }
        }
        lines.push('');
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');
      for (const warning of report.warnings) {
        lines.push(`### ${warning.message}`);
        lines.push('');
        if (warning.path) {
          lines.push(`**Path:** \`${warning.path}\``);
        }
        if (warning.suggestions && warning.suggestions.length > 0) {
          lines.push('');
          lines.push('**Suggestions:**');
          for (const suggestion of warning.suggestions) {
            lines.push(`- ${suggestion}`);
          }
        }
        lines.push('');
      }
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      lines.push('## Suggestions');
      lines.push('');
      for (const suggestion of report.suggestions) {
        lines.push(`- ${suggestion.message}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format report as structured text
   */
  toText(report: ValidationReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push(`Status: ${report.valid ? 'VALID' : 'INVALID'}`);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`Total Errors: ${report.summary.totalErrors}`);
    lines.push(`Total Warnings: ${report.summary.totalWarnings}`);
    lines.push(`Total Suggestions: ${report.summary.totalSuggestions}`);
    lines.push('');

    if (Object.keys(report.summary.errorsByCategory).length > 0) {
      lines.push('Errors by Category:');
      for (const [category, count] of Object.entries(report.summary.errorsByCategory)) {
        lines.push(`  ${category}: ${count}`);
      }
      lines.push('');
    }

    // Errors
    if (report.errors.length > 0) {
      lines.push('ERRORS');
      lines.push('-'.repeat(80));
      for (let i = 0; i < report.errors.length; i++) {
        const error = report.errors[i];
        lines.push(`${i + 1}. ${error.message}`);
        if (error.path) {
          lines.push(`   Path: ${error.path}`);
        }
        if (error.line) {
          lines.push(`   Line: ${error.line}`);
        }
        if (error.column) {
          lines.push(`   Column: ${error.column}`);
        }
        if (error.suggestions && error.suggestions.length > 0) {
          lines.push('   Suggestions:');
          for (const suggestion of error.suggestions) {
            lines.push(`     - ${suggestion}`);
          }
        }
        lines.push('');
      }
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push('WARNINGS');
      lines.push('-'.repeat(80));
      for (let i = 0; i < report.warnings.length; i++) {
        const warning = report.warnings[i];
        lines.push(`${i + 1}. ${warning.message}`);
        if (warning.path) {
          lines.push(`   Path: ${warning.path}`);
        }
        if (warning.suggestions && warning.suggestions.length > 0) {
          lines.push('   Suggestions:');
          for (const suggestion of warning.suggestions) {
            lines.push(`     - ${suggestion}`);
          }
        }
        lines.push('');
      }
    }

    // Suggestions
    if (report.suggestions.length > 0) {
      lines.push('SUGGESTIONS');
      lines.push('-'.repeat(80));
      for (let i = 0; i < report.suggestions.length; i++) {
        const suggestion = report.suggestions[i];
        lines.push(`${i + 1}. ${suggestion.message}`);
        lines.push('');
      }
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

/**
 * Get default validation reporter instance
 */
let defaultReporter: ValidationReporter | null = null;

export function getValidationReporter(): ValidationReporter {
  if (!defaultReporter) {
    defaultReporter = new ValidationReporter();
  }
  return defaultReporter;
}
