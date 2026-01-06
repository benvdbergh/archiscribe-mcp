/**
 * Type definitions for Model Manipulation API
 * 
 * These types define the input/output interfaces for CRUD operations
 * on ArchiMate models.
 */

import { ElementObject, RelationshipObject, ViewObject, ModelData } from './types';

// ============================================================================
// Element Operations
// ============================================================================

export interface CreateElementInput {
  /** ArchiMate element type (e.g., 'ApplicationComponent', 'BusinessProcess') */
  type: string;
  /** Element name */
  name: string;
  /** Optional: Element identifier (auto-generated if not provided) */
  identifier?: string;
  /** Optional: Element documentation */
  documentation?: string;
  /** Optional: Custom properties */
  properties?: Record<string, string>;
}

export interface UpdateElementInput {
  /** Updated element name */
  name?: string;
  /** Updated element type */
  type?: string;
  /** Updated element documentation */
  documentation?: string;
  /** Updated custom properties */
  properties?: Record<string, string>;
}

export interface DeleteOptions {
  /** If true, delete dependent relationships and remove from views */
  cascade?: boolean;
  /** If true, validate before delete */
  validate?: boolean;
}

// ============================================================================
// Relationship Operations
// ============================================================================

export interface CreateRelationshipInput {
  /** ArchiMate relationship type (e.g., 'Serving', 'Access', 'Composition') */
  type: string;
  /** Source element identifier */
  sourceId: string;
  /** Target element identifier */
  targetId: string;
  /** Optional: Relationship identifier (auto-generated if not provided) */
  identifier?: string;
  /** Optional: Relationship name */
  name?: string;
  /** Optional: Relationship documentation */
  documentation?: string;
  /** Optional: Custom properties */
  properties?: Record<string, string>;
}

export interface UpdateRelationshipInput {
  /** Updated relationship type */
  type?: string;
  /** Updated source element identifier */
  sourceId?: string;
  /** Updated target element identifier */
  targetId?: string;
  /** Updated relationship name */
  name?: string;
  /** Updated relationship documentation */
  documentation?: string;
  /** Updated custom properties */
  properties?: Record<string, string>;
}

// ============================================================================
// View Operations
// ============================================================================

export interface CreateViewInput {
  /** View name */
  name: string;
  /** Optional: View identifier (auto-generated if not provided) */
  identifier?: string;
  /** Optional: View type */
  type?: string;
  /** Optional: Viewpoint identifier */
  viewpoint?: string;
  /** Optional: View documentation */
  documentation?: string;
  /** Optional: Custom properties */
  properties?: Record<string, string>;
  /** Optional: Element IDs in view */
  elements?: string[];
  /** Optional: Relationship IDs in view */
  relationships?: string[];
  /** Optional: Node hierarchy (parent-child relationships) */
  nodeHierarchy?: Array<{ parentElement: string; childElement: string }>;
}

export interface UpdateViewInput {
  /** Updated view name */
  name?: string;
  /** Updated view type */
  type?: string;
  /** Updated viewpoint identifier */
  viewpoint?: string;
  /** Updated view documentation */
  documentation?: string;
  /** Updated custom properties */
  properties?: Record<string, string>;
  /** Updated element IDs in view */
  elements?: string[];
  /** Updated relationship IDs in view */
  relationships?: string[];
  /** Updated node hierarchy (parent-child relationships) */
  nodeHierarchy?: Array<{ parentElement: string; childElement: string }>;
}

// ============================================================================
// Property Operations
// ============================================================================

export interface CreatePropertyDefinitionInput {
  /** Property definition identifier */
  identifier: string;
  /** Property name */
  name: string;
}

export interface PropertyDefinition {
  /** Property definition identifier */
  identifier: string;
  /** Property name */
  name: string;
}

// ============================================================================
// Transaction Support
// ============================================================================

export interface Operation {
  /** Operation type */
  type: 'create' | 'update' | 'delete';
  /** Entity type */
  entityType: 'element' | 'relationship' | 'view' | 'property';
  /** Entity identifier */
  entityId: string;
  /** Operation data (for create/update) */
  data?: any;
  /** Previous state (for rollback) */
  previousState?: any;
}

// ============================================================================
// Error Types
// ============================================================================

export class ModelManipulationError extends Error {
  code: string;
  entityId?: string;
  details?: any;
  suggestions?: string[];
  context?: Record<string, any>;

  constructor(message: string, code: string, entityId?: string, details?: any, suggestions?: string[], context?: Record<string, any>) {
    super(message);
    this.name = 'ModelManipulationError';
    this.code = code;
    this.entityId = entityId;
    this.details = details;
    this.suggestions = suggestions;
    this.context = context;
  }

  /**
   * Get detailed error information
   */
  toDetailedError() {
    return {
      code: this.code,
      message: this.message,
      entityId: this.entityId,
      suggestions: this.suggestions || [],
      context: this.context,
      details: this.details
    };
  }
}

export class ValidationError extends ModelManipulationError {
  validationResult: any;

  constructor(message: string, validationResult: any, entityId?: string, suggestions?: string[], context?: Record<string, any>) {
    super(message, 'VALIDATION_FAILED', entityId, validationResult, suggestions, context);
    this.name = 'ValidationError';
    this.validationResult = validationResult;
  }
}

export class NotFoundError extends ModelManipulationError {
  entityType: string;

  constructor(entityType: string, entityId: string, suggestions?: string[], context?: Record<string, any>) {
    const code = entityType.toUpperCase() === 'ELEMENT' ? 'ELEMENT_NOT_FOUND' :
                 entityType.toUpperCase() === 'RELATIONSHIP' ? 'RELATIONSHIP_NOT_FOUND' :
                 entityType.toUpperCase() === 'VIEW' ? 'VIEW_NOT_FOUND' : 'NOT_FOUND';
    super(`${entityType} not found: ${entityId}`, code, entityId, undefined, suggestions, { ...context, entityType });
    this.name = 'NotFoundError';
    this.entityType = entityType;
  }
}

export class DuplicateError extends ModelManipulationError {
  entityType: string;

  constructor(entityType: string, entityId: string, suggestions?: string[], context?: Record<string, any>) {
    const code = entityType.toUpperCase() === 'ELEMENT' ? 'ELEMENT_DUPLICATE' :
                 entityType.toUpperCase() === 'RELATIONSHIP' ? 'RELATIONSHIP_DUPLICATE' :
                 entityType.toUpperCase() === 'VIEW' ? 'VIEW_DUPLICATE' : 'DUPLICATE';
    super(`Duplicate ${entityType}: ${entityId}`, code, entityId, undefined, suggestions, { ...context, entityType });
    this.name = 'DuplicateError';
    this.entityType = entityType;
  }
}

export class ReferentialIntegrityError extends ModelManipulationError {
  entityType: string;
  dependentEntities: string[];

  constructor(entityType: string, entityId: string, dependentEntities: string[], suggestions?: string[], context?: Record<string, any>) {
    super(
      `Cannot delete ${entityType} ${entityId}: has dependent entities`,
      'REFERENTIAL_INTEGRITY_VIOLATION',
      entityId,
      { dependentEntities },
      suggestions,
      { ...context, entityType, dependentEntities }
    );
    this.name = 'ReferentialIntegrityError';
    this.entityType = entityType;
    this.dependentEntities = dependentEntities;
  }
}

// ============================================================================
// Validation Result (re-export from xsd-validator)
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line?: number;
    column?: number;
    message: string;
    path?: string;
  }>;
}
