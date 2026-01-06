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

  constructor(message: string, code: string, entityId?: string, details?: any) {
    super(message);
    this.name = 'ModelManipulationError';
    this.code = code;
    this.entityId = entityId;
    this.details = details;
  }
}

export class ValidationError extends ModelManipulationError {
  validationResult: any;

  constructor(message: string, validationResult: any, entityId?: string) {
    super(message, 'VALIDATION_ERROR', entityId, validationResult);
    this.name = 'ValidationError';
    this.validationResult = validationResult;
  }
}

export class NotFoundError extends ModelManipulationError {
  entityType: string;

  constructor(entityType: string, entityId: string) {
    super(`${entityType} not found: ${entityId}`, 'NOT_FOUND', entityId);
    this.name = 'NotFoundError';
    this.entityType = entityType;
  }
}

export class DuplicateError extends ModelManipulationError {
  entityType: string;

  constructor(entityType: string, entityId: string) {
    super(`Duplicate ${entityType}: ${entityId}`, 'DUPLICATE', entityId);
    this.name = 'DuplicateError';
    this.entityType = entityType;
  }
}

export class ReferentialIntegrityError extends ModelManipulationError {
  entityType: string;
  dependentEntities: string[];

  constructor(entityType: string, entityId: string, dependentEntities: string[]) {
    super(
      `Cannot delete ${entityType} ${entityId}: has dependent entities`,
      'REFERENTIAL_INTEGRITY',
      entityId,
      { dependentEntities }
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
