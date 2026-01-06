import { readFileSync } from 'fs';
import { join } from 'path';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  path?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * XSD Validator for ArchiMate models
 * 
 * Validates XML against ArchiMate 3.1 XSD schemas.
 * Supports both ArchiMate 3.0 and 3.1 models.
 */
export class XSDValidator {
  private schemaCache: Map<string, any> = new Map();
  private schemaBasePath: string;

  constructor(schemaBasePath?: string) {
    // Default to research directory if not provided
    this.schemaBasePath = schemaBasePath || 
      join(process.env.HOME || '', 'Knowledge/Projects/ArchiScribe-MCP-Extension/research/Examples/XML/XSD3.1');
  }

  /**
   * Validate XML string against ArchiMate 3.1 Model XSD schema
   */
  validateModel(xmlString: string): ValidationResult {
    return this.validate(xmlString, 'archimate3_Model.xsd');
  }

  /**
   * Validate XML string against ArchiMate 3.1 View XSD schema
   */
  validateView(xmlString: string): ValidationResult {
    return this.validate(xmlString, 'archimate3_View.xsd');
  }

  /**
   * Validate XML string against ArchiMate 3.1 Diagram XSD schema
   */
  validateDiagram(xmlString: string): ValidationResult {
    return this.validate(xmlString, 'archimate3_Diagram.xsd');
  }

  /**
   * Validate XML string against a specific XSD schema file
   */
  validate(xmlString: string, schemaFileName: string): ValidationResult {
    try {
      const schemaPath = join(this.schemaBasePath, schemaFileName);
      
      // Try to use xsdlibrary for validation
      // Note: xsdlibrary is a pure JS solution that may have limitations
      // For production, consider using native bindings if compilation issues are resolved
      const xsdlibrary = require('xsdlibrary');
      
      // Load XSD schema
      let xsdString: string;
      if (!this.schemaCache.has(schemaPath)) {
        xsdString = readFileSync(schemaPath, 'utf8');
        this.schemaCache.set(schemaPath, xsdString);
      } else {
        xsdString = this.schemaCache.get(schemaPath)!;
      }

      // Validate XML against XSD
      const result = xsdlibrary.validateXml(xmlString, xsdString);
      
      if (result === true) {
        logger.log('info', 'xsd.validation.success', { schema: schemaFileName });
        return { valid: true, errors: [] };
      } else {
        // xsdlibrary returns error object on failure
        const errors: ValidationError[] = [];
        
        if (typeof result === 'object' && result.errors) {
          for (const err of result.errors) {
            errors.push({
              line: err.line,
              column: err.column,
              message: err.message || String(err),
              path: err.path
            });
          }
        } else {
          // Fallback: treat result as error message
          errors.push({
            message: typeof result === 'string' ? result : JSON.stringify(result)
          });
        }

        logger.log('warn', 'xsd.validation.failed', { 
          schema: schemaFileName, 
          errorCount: errors.length 
        });
        
        return { valid: false, errors };
      }
    } catch (error) {
      const err = error as Error;
      logger.log('error', 'xsd.validation.error', { 
        schema: schemaFileName, 
        error: err.message 
      });
      
      return {
        valid: false,
        errors: [{
          message: `Validation error: ${err.message}`
        }]
      };
    }
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Set custom schema base path
   */
  setSchemaBasePath(path: string): void {
    this.schemaBasePath = path;
    this.clearCache();
  }
}

/**
 * Get default XSD validator instance
 */
let defaultValidator: XSDValidator | null = null;

export function getXSDValidator(schemaBasePath?: string): XSDValidator {
  if (!defaultValidator) {
    defaultValidator = new XSDValidator(schemaBasePath);
  }
  return defaultValidator;
}
