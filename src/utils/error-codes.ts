/**
 * Error Code Constants
 * 
 * Centralized error codes for consistent error handling across the application.
 * Each error code maps to a specific error scenario with a user-friendly message
 * and actionable suggestions.
 * 
 * @module utils/error-codes
 */

export interface ErrorCodeDefinition {
  /** Error code identifier */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Suggested actions to resolve the error */
  suggestions: string[];
  /** HTTP status code (if applicable) */
  httpStatus?: number;
}

/**
 * Error code definitions
 */
export const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
  // Element Errors
  ELEMENT_NOT_FOUND: {
    code: 'ELEMENT_NOT_FOUND',
    message: 'Element not found',
    suggestions: [
      'Verify the element identifier is correct',
      'Check if the element was deleted',
      'Ensure the model was loaded correctly'
    ],
    httpStatus: 404
  },
  ELEMENT_DUPLICATE: {
    code: 'ELEMENT_DUPLICATE',
    message: 'Element with this identifier already exists',
    suggestions: [
      'Use a different identifier',
      'Update the existing element instead',
      'Delete the existing element first if you want to replace it'
    ],
    httpStatus: 409
  },
  ELEMENT_TYPE_INVALID: {
    code: 'ELEMENT_TYPE_INVALID',
    message: 'Invalid element type',
    suggestions: [
      'Check the ArchiMate specification for valid element types',
      'Verify the element type spelling',
      'Ensure the element type matches the ArchiMate 3.1 specification'
    ],
    httpStatus: 400
  },
  ELEMENT_NAME_REQUIRED: {
    code: 'ELEMENT_NAME_REQUIRED',
    message: 'Element name is required',
    suggestions: [
      'Provide a name for the element',
      'Ensure the name field is not empty'
    ],
    httpStatus: 400
  },

  // Relationship Errors
  RELATIONSHIP_NOT_FOUND: {
    code: 'RELATIONSHIP_NOT_FOUND',
    message: 'Relationship not found',
    suggestions: [
      'Verify the relationship identifier is correct',
      'Check if the relationship was deleted',
      'Ensure the model was loaded correctly'
    ],
    httpStatus: 404
  },
  RELATIONSHIP_DUPLICATE: {
    code: 'RELATIONSHIP_DUPLICATE',
    message: 'Relationship with this identifier already exists',
    suggestions: [
      'Use a different identifier',
      'Update the existing relationship instead',
      'Delete the existing relationship first if you want to replace it'
    ],
    httpStatus: 409
  },
  RELATIONSHIP_TYPE_INVALID: {
    code: 'RELATIONSHIP_TYPE_INVALID',
    message: 'Invalid relationship type',
    suggestions: [
      'Check the ArchiMate specification for valid relationship types',
      'Verify the relationship type spelling',
      'Ensure the relationship type matches the ArchiMate 3.1 specification'
    ],
    httpStatus: 400
  },
  RELATIONSHIP_SOURCE_NOT_FOUND: {
    code: 'RELATIONSHIP_SOURCE_NOT_FOUND',
    message: 'Source element not found for relationship',
    suggestions: [
      'Verify the source element identifier is correct',
      'Create the source element first',
      'Check if the source element was deleted'
    ],
    httpStatus: 404
  },
  RELATIONSHIP_TARGET_NOT_FOUND: {
    code: 'RELATIONSHIP_TARGET_NOT_FOUND',
    message: 'Target element not found for relationship',
    suggestions: [
      'Verify the target element identifier is correct',
      'Create the target element first',
      'Check if the target element was deleted'
    ],
    httpStatus: 404
  },
  RELATIONSHIP_INCOMPATIBLE: {
    code: 'RELATIONSHIP_INCOMPATIBLE',
    message: 'Relationship type is incompatible with source and target element types',
    suggestions: [
      'Check the ArchiMate specification for valid relationship combinations',
      'Verify the source and target element types are correct',
      'Use a different relationship type that is compatible with these element types'
    ],
    httpStatus: 400
  },
  RELATIONSHIP_CARDINALITY_INVALID: {
    code: 'RELATIONSHIP_CARDINALITY_INVALID',
    message: 'Relationship cardinality is invalid',
    suggestions: [
      'Check the ArchiMate specification for valid cardinality rules',
      'Verify the relationship type supports the requested cardinality',
      'Adjust the relationship type or cardinality'
    ],
    httpStatus: 400
  },

  // View Errors
  VIEW_NOT_FOUND: {
    code: 'VIEW_NOT_FOUND',
    message: 'View not found',
    suggestions: [
      'Verify the view identifier is correct',
      'Check if the view was deleted',
      'Ensure the model was loaded correctly'
    ],
    httpStatus: 404
  },
  VIEW_DUPLICATE: {
    code: 'VIEW_DUPLICATE',
    message: 'View with this identifier already exists',
    suggestions: [
      'Use a different identifier',
      'Update the existing view instead',
      'Delete the existing view first if you want to replace it'
    ],
    httpStatus: 409
  },
  VIEW_ELEMENT_NOT_FOUND: {
    code: 'VIEW_ELEMENT_NOT_FOUND',
    message: 'Element not found in view',
    suggestions: [
      'Verify the element identifier is correct',
      'Add the element to the view first',
      'Check if the element exists in the model'
    ],
    httpStatus: 404
  },
  VIEW_RELATIONSHIP_NOT_FOUND: {
    code: 'VIEW_RELATIONSHIP_NOT_FOUND',
    message: 'Relationship not found in view',
    suggestions: [
      'Verify the relationship identifier is correct',
      'Add the relationship to the view first',
      'Check if the relationship exists in the model'
    ],
    httpStatus: 404
  },

  // Validation Errors
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: 'Validation failed',
    suggestions: [
      'Review the validation errors',
      'Fix the reported issues',
      'Check the ArchiMate specification for requirements'
    ],
    httpStatus: 400
  },
  XSD_VALIDATION_FAILED: {
    code: 'XSD_VALIDATION_FAILED',
    message: 'XSD schema validation failed',
    suggestions: [
      'Review the XSD validation errors',
      'Check the XML structure matches the ArchiMate schema',
      'Verify all required fields are present',
      'Ensure the model version matches the schema version'
    ],
    httpStatus: 400
  },
  BUSINESS_RULE_VIOLATION: {
    code: 'BUSINESS_RULE_VIOLATION',
    message: 'Business rule validation failed',
    suggestions: [
      'Review the business rule violations',
      'Check the ArchiMate specification for business rules',
      'Fix the reported violations'
    ],
    httpStatus: 400
  },
  REFERENTIAL_INTEGRITY_VIOLATION: {
    code: 'REFERENTIAL_INTEGRITY_VIOLATION',
    message: 'Referential integrity violation',
    suggestions: [
      'Check for orphaned relationships or references',
      'Ensure all referenced elements exist',
      'Use cascade delete if you want to delete dependent entities'
    ],
    httpStatus: 400
  },

  // Model Errors
  MODEL_NOT_LOADED: {
    code: 'MODEL_NOT_LOADED',
    message: 'Model not loaded',
    suggestions: [
      'Load the model before performing operations',
      'Check if the model file exists',
      'Verify the model file path is correct'
    ],
    httpStatus: 400
  },
  MODEL_SAVE_FAILED: {
    code: 'MODEL_SAVE_FAILED',
    message: 'Failed to save model',
    suggestions: [
      'Check file system permissions',
      'Verify the save path is valid',
      'Ensure sufficient disk space',
      'Check if the file is locked by another process'
    ],
    httpStatus: 500
  },
  MODEL_LOAD_FAILED: {
    code: 'MODEL_LOAD_FAILED',
    message: 'Failed to load model',
    suggestions: [
      'Check if the file exists',
      'Verify the file is valid XML',
      'Check file system permissions',
      'Ensure the file is not corrupted'
    ],
    httpStatus: 500
  },
  MODEL_PARSE_ERROR: {
    code: 'MODEL_PARSE_ERROR',
    message: 'Failed to parse model XML',
    suggestions: [
      'Verify the XML is well-formed',
      'Check for syntax errors in the XML',
      'Ensure the XML matches the ArchiMate format',
      'Validate the XML against the ArchiMate schema'
    ],
    httpStatus: 400
  },

  // General Errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    suggestions: [
      'Check the server logs for details',
      'Report this error if it persists',
      'Try the operation again'
    ],
    httpStatus: 500
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid input provided',
    suggestions: [
      'Review the input parameters',
      'Check required fields are provided',
      'Verify input format and types'
    ],
    httpStatus: 400
  },
  OPERATION_NOT_SUPPORTED: {
    code: 'OPERATION_NOT_SUPPORTED',
    message: 'Operation not supported',
    suggestions: [
      'Check if the operation is available for this entity type',
      'Verify the operation is supported in the current version',
      'Review the API documentation'
    ],
    httpStatus: 501
  }
};

/**
 * Get error code definition
 */
export function getErrorCode(code: string): ErrorCodeDefinition | undefined {
  return ERROR_CODES[code];
}

/**
 * Format error message with suggestions
 */
export function formatErrorMessage(
  code: string,
  context?: Record<string, any>
): string {
  const errorDef = getErrorCode(code);
  if (!errorDef) {
    return `Error: ${code}${context ? ` (${JSON.stringify(context)})` : ''}`;
  }

  let message = errorDef.message;
  if (context) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    message += ` (${contextStr})`;
  }

  return message;
}

/**
 * Create detailed error response
 */
export function createDetailedError(
  code: string,
  context?: Record<string, any>,
  additionalDetails?: Record<string, any>
): {
  code: string;
  message: string;
  suggestions: string[];
  context?: Record<string, any>;
  details?: Record<string, any>;
} {
  const errorDef = getErrorCode(code) || {
    code,
    message: 'Unknown error',
    suggestions: ['Check the error code and context']
  };

  return {
    code: errorDef.code,
    message: formatErrorMessage(code, context),
    suggestions: errorDef.suggestions,
    ...(context && { context }),
    ...(additionalDetails && { details: additionalDetails })
  };
}
