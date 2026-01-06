/**
 * Model Manipulation API
 * 
 * Provides CRUD operations for ArchiMate models with validation and transaction support.
 * 
 * @module model/manipulator
 */

import { ModelLoader } from './loader';
import { ModelData, ElementObject, RelationshipObject, ViewObject } from './types';
import {
  CreateElementInput,
  UpdateElementInput,
  DeleteOptions,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  CreateViewInput,
  UpdateViewInput,
  CreatePropertyDefinitionInput,
  PropertyDefinition,
  ModelManipulationError,
  ValidationError,
  NotFoundError,
  DuplicateError,
  ReferentialIntegrityError,
  ValidationResult,
  Operation
} from './manipulator-types';
import { XSDValidator } from '../utils/xsd-validator';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * Model Transaction for atomic operations
 */
export class ModelTransaction {
  private operations: Operation[] = [];
  private snapshot: ModelData;

  constructor(snapshot: ModelData) {
    this.snapshot = JSON.parse(JSON.stringify(snapshot)); // Deep clone
  }

  addOperation(operation: Operation): void {
    this.operations.push(operation);
  }

  getSnapshot(): ModelData {
    return this.snapshot;
  }

  getOperations(): Operation[] {
    return [...this.operations];
  }
}

/**
 * Model Manipulator - Main API for CRUD operations
 * 
 * Provides a clean interface for creating, reading, updating, and deleting
 * ArchiMate model components with validation and transaction support.
 */
export class ModelManipulator {
  private loader: ModelLoader;
  private validator?: XSDValidator;
  private model: ModelData;
  private modified: boolean = false;

  constructor(loader: ModelLoader, validator?: XSDValidator) {
    this.loader = loader;
    this.validator = validator;
    this.model = loader.load();
  }

  /**
   * Get current model data
   */
  getModel(): ModelData {
    return this.model;
  }

  /**
   * Check if model has been modified
   */
  isModified(): boolean {
    return this.modified;
  }

  /**
   * Reload model from file (discards unsaved changes)
   */
  reload(): void {
    this.model = this.loader.reload();
    this.modified = false;
  }

  // ============================================================================
  // Element Operations
  // ============================================================================

  /**
   * Create a new element
   */
  async createElement(data: CreateElementInput): Promise<ElementObject> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new ValidationError('Element name is required', { valid: false, errors: [{ message: 'Element name is required' }] });
    }

    if (!data.type || data.type.trim() === '') {
      throw new ValidationError('Element type is required', { valid: false, errors: [{ message: 'Element type is required' }] });
    }

    // Validate element type against ArchiMate 3.1 specification
    const validationResult = await this.validateElementType(data.type);
    if (!validationResult.valid) {
      throw new ValidationError(`Invalid element type: ${data.type}`, validationResult);
    }

    // Generate identifier if not provided
    let identifier = data.identifier;
    if (!identifier || identifier.trim() === '') {
      identifier = this.generateId('elem');
    }

    // Check for duplicate identifier
    if (this.identifierExists(identifier)) {
      throw new DuplicateError('element', identifier);
    }

    // Create element object
    const element: ElementObject = {
      id: identifier,
      name: data.name.trim(),
      type: data.type.trim(),
      documentation: data.documentation?.trim(),
      properties: data.properties ? { ...data.properties } : {},
      inViews: [],
      outgoingRelations: [],
      incomingRelations: []
    };

    // Add to model
    this.model.elements.push(element);
    this.markModified();

    logger.log('info', 'element.created', { id: identifier, type: data.type, name: data.name });
    return element;
  }

  /**
   * Update an existing element
   */
  async updateElement(id: string, data: UpdateElementInput): Promise<ElementObject> {
    // Find element
    const elementIndex = this.model.elements.findIndex(e => e.id === id);
    if (elementIndex === -1) {
      throw new NotFoundError('element', id);
    }

    const element = this.model.elements[elementIndex];
    const previousState = { ...element };

    // Validate element type if being changed
    if (data.type && data.type !== element.type) {
      const validationResult = await this.validateElementType(data.type);
      if (!validationResult.valid) {
        throw new ValidationError(`Invalid element type: ${data.type}`, validationResult);
      }
    }

    // Update fields
    if (data.name !== undefined) {
      if (data.name.trim() === '') {
        throw new ValidationError('Element name cannot be empty', { valid: false, errors: [{ message: 'Element name cannot be empty' }] });
      }
      element.name = data.name.trim();
    }

    if (data.type !== undefined) {
      element.type = data.type.trim();
    }

    if (data.documentation !== undefined) {
      element.documentation = data.documentation?.trim();
    }

    if (data.properties !== undefined) {
      element.properties = { ...data.properties };
    }

    this.markModified();

    logger.log('info', 'element.updated', { id, changes: Object.keys(data) });
    return element;
  }

  /**
   * Delete an element
   */
  async deleteElement(id: string, options?: DeleteOptions): Promise<void> {
    const opts = { cascade: true, validate: true, ...options };

    // Find element
    const elementIndex = this.model.elements.findIndex(e => e.id === id);
    if (elementIndex === -1) {
      throw new NotFoundError('element', id);
    }

    const element = this.model.elements[elementIndex];

    // Validate referential integrity if requested
    if (opts.validate && !opts.cascade) {
      const dependentRelations = [
        ...(element.outgoingRelations || []),
        ...(element.incomingRelations || [])
      ];
      const dependentViews = element.inViews || [];

      if (dependentRelations.length > 0 || dependentViews.length > 0) {
        throw new ReferentialIntegrityError(
          'element',
          id,
          [...dependentRelations, ...dependentViews]
        );
      }
    }

    // Cascade delete relationships if requested
    if (opts.cascade) {
      // Delete outgoing relationships
      const outgoingRelIds = element.outgoingRelations || [];
      for (const relId of outgoingRelIds) {
        const relIndex = this.model.relationships.findIndex(r => r.id === relId);
        if (relIndex !== -1) {
          const rel = this.model.relationships[relIndex];
          // Remove from target element's incoming relations
          const target = this.model.elements.find(e => e.id === rel.targetId);
          if (target && target.incomingRelations) {
            const targetIndex = target.incomingRelations.indexOf(relId);
            if (targetIndex !== -1) {
              target.incomingRelations.splice(targetIndex, 1);
            }
          }
          this.model.relationships.splice(relIndex, 1);
        }
      }

      // Delete incoming relationships
      const incomingRelIds = element.incomingRelations || [];
      for (const relId of incomingRelIds) {
        const relIndex = this.model.relationships.findIndex(r => r.id === relId);
        if (relIndex !== -1) {
          const rel = this.model.relationships[relIndex];
          // Remove from source element's outgoing relations
          const source = this.model.elements.find(e => e.id === rel.sourceId);
          if (source && source.outgoingRelations) {
            const sourceIndex = source.outgoingRelations.indexOf(relId);
            if (sourceIndex !== -1) {
              source.outgoingRelations.splice(sourceIndex, 1);
            }
          }
          this.model.relationships.splice(relIndex, 1);
        }
      }

      // Remove from views
      const viewIds = element.inViews || [];
      for (const viewId of viewIds) {
        const view = this.model.views.find(v => v.id === viewId);
        if (view) {
          // Remove element from view's elements array
          if (view.elements) {
            const elemIndex = view.elements.indexOf(id);
            if (elemIndex !== -1) {
              view.elements.splice(elemIndex, 1);
            }
          }

          // Remove from node hierarchy
          if (view.nodeHierarchy) {
            view.nodeHierarchy = view.nodeHierarchy.filter(
              h => h.parentElement !== id && h.childElement !== id
            );
          }
        }
      }
    }

    // Delete element
    this.model.elements.splice(elementIndex, 1);
    this.markModified();

    logger.log('info', 'element.deleted', { id, cascade: opts.cascade });
  }

  /**
   * Get an element by ID
   */
  getElement(id: string): ElementObject | null {
    return this.model.elements.find(e => e.id === id) || null;
  }

  // ============================================================================
  // Relationship Operations
  // ============================================================================

  /**
   * Create a new relationship
   */
  async createRelationship(data: CreateRelationshipInput): Promise<RelationshipObject> {
    // Validate required fields
    if (!data.type || data.type.trim() === '') {
      throw new ValidationError('Relationship type is required', { valid: false, errors: [{ message: 'Relationship type is required' }] });
    }

    if (!data.sourceId || data.sourceId.trim() === '') {
      throw new ValidationError('Source element ID is required', { valid: false, errors: [{ message: 'Source element ID is required' }] });
    }

    if (!data.targetId || data.targetId.trim() === '') {
      throw new ValidationError('Target element ID is required', { valid: false, errors: [{ message: 'Target element ID is required' }] });
    }

    // Validate relationship type
    const typeValidation = await this.validateRelationshipType(data.type);
    if (!typeValidation.valid) {
      throw new ValidationError(`Invalid relationship type: ${data.type}`, typeValidation);
    }

    // Validate source element exists
    const sourceElement = this.getElement(data.sourceId);
    if (!sourceElement) {
      throw new NotFoundError('element', data.sourceId);
    }

    // Validate target element exists
    const targetElement = this.getElement(data.targetId);
    if (!targetElement) {
      throw new NotFoundError('element', data.targetId);
    }

    // Validate source and target are different
    if (data.sourceId === data.targetId) {
      throw new ValidationError('Source and target elements must be different', { valid: false, errors: [{ message: 'Source and target elements must be different' }] });
    }

    // Generate identifier if not provided
    let identifier = data.identifier;
    if (!identifier || identifier.trim() === '') {
      identifier = this.generateId('rel');
    }

    // Check for duplicate identifier
    if (this.identifierExists(identifier)) {
      throw new DuplicateError('relationship', identifier);
    }

    // Create relationship object
    const relationship: RelationshipObject = {
      id: identifier,
      sourceId: data.sourceId.trim(),
      targetId: data.targetId.trim(),
      type: data.type.trim(),
      name: data.name?.trim(),
      documentation: data.documentation?.trim(),
      properties: data.properties ? { ...data.properties } : {}
    };

    // Add to model
    this.model.relationships.push(relationship);

    // Update element references
    if (!sourceElement.outgoingRelations) {
      sourceElement.outgoingRelations = [];
    }
    sourceElement.outgoingRelations.push(identifier);

    if (!targetElement.incomingRelations) {
      targetElement.incomingRelations = [];
    }
    targetElement.incomingRelations.push(identifier);

    this.markModified();

    logger.log('info', 'relationship.created', { id: identifier, type: data.type, sourceId: data.sourceId, targetId: data.targetId });
    return relationship;
  }

  /**
   * Update an existing relationship
   */
  async updateRelationship(id: string, data: UpdateRelationshipInput): Promise<RelationshipObject> {
    // Find relationship
    const relationshipIndex = this.model.relationships.findIndex(r => r.id === id);
    if (relationshipIndex === -1) {
      throw new NotFoundError('relationship', id);
    }

    const relationship = this.model.relationships[relationshipIndex];
    const previousSourceId = relationship.sourceId;
    const previousTargetId = relationship.targetId;

    // Validate relationship type if being changed
    if (data.type && data.type !== relationship.type) {
      const validationResult = await this.validateRelationshipType(data.type);
      if (!validationResult.valid) {
        throw new ValidationError(`Invalid relationship type: ${data.type}`, validationResult);
      }
    }

    // Validate source element if being changed
    if (data.sourceId && data.sourceId !== relationship.sourceId) {
      const sourceElement = this.getElement(data.sourceId);
      if (!sourceElement) {
        throw new NotFoundError('element', data.sourceId);
      }
    }

    // Validate target element if being changed
    if (data.targetId && data.targetId !== relationship.targetId) {
      const targetElement = this.getElement(data.targetId);
      if (!targetElement) {
        throw new NotFoundError('element', data.targetId);
      }
    }

    // Validate source and target are different if both changed
    const newSourceId = data.sourceId || relationship.sourceId;
    const newTargetId = data.targetId || relationship.targetId;
    if (newSourceId === newTargetId) {
      throw new ValidationError('Source and target elements must be different', { valid: false, errors: [{ message: 'Source and target elements must be different' }] });
    }

    // Update element references if source or target changed
    if (data.sourceId && data.sourceId !== previousSourceId) {
      // Remove from old source
      const oldSource = this.getElement(previousSourceId);
      if (oldSource && oldSource.outgoingRelations) {
        const index = oldSource.outgoingRelations.indexOf(id);
        if (index !== -1) {
          oldSource.outgoingRelations.splice(index, 1);
        }
      }

      // Add to new source
      const newSource = this.getElement(data.sourceId);
      if (newSource) {
        if (!newSource.outgoingRelations) {
          newSource.outgoingRelations = [];
        }
        if (!newSource.outgoingRelations.includes(id)) {
          newSource.outgoingRelations.push(id);
        }
      }
    }

    if (data.targetId && data.targetId !== previousTargetId) {
      // Remove from old target
      const oldTarget = this.getElement(previousTargetId);
      if (oldTarget && oldTarget.incomingRelations) {
        const index = oldTarget.incomingRelations.indexOf(id);
        if (index !== -1) {
          oldTarget.incomingRelations.splice(index, 1);
        }
      }

      // Add to new target
      const newTarget = this.getElement(data.targetId);
      if (newTarget) {
        if (!newTarget.incomingRelations) {
          newTarget.incomingRelations = [];
        }
        if (!newTarget.incomingRelations.includes(id)) {
          newTarget.incomingRelations.push(id);
        }
      }
    }

    // Update fields
    if (data.type !== undefined) {
      relationship.type = data.type.trim();
    }

    if (data.sourceId !== undefined) {
      relationship.sourceId = data.sourceId.trim();
    }

    if (data.targetId !== undefined) {
      relationship.targetId = data.targetId.trim();
    }

    if (data.name !== undefined) {
      relationship.name = data.name?.trim();
    }

    if (data.documentation !== undefined) {
      relationship.documentation = data.documentation?.trim();
    }

    if (data.properties !== undefined) {
      relationship.properties = { ...data.properties };
    }

    this.markModified();

    logger.log('info', 'relationship.updated', { id, changes: Object.keys(data) });
    return relationship;
  }

  /**
   * Delete a relationship
   */
  async deleteRelationship(id: string): Promise<void> {
    // Find relationship
    const relationshipIndex = this.model.relationships.findIndex(r => r.id === id);
    if (relationshipIndex === -1) {
      throw new NotFoundError('relationship', id);
    }

    const relationship = this.model.relationships[relationshipIndex];

    // Remove from source element's outgoing relations
    const sourceElement = this.getElement(relationship.sourceId);
    if (sourceElement && sourceElement.outgoingRelations) {
      const sourceIndex = sourceElement.outgoingRelations.indexOf(id);
      if (sourceIndex !== -1) {
        sourceElement.outgoingRelations.splice(sourceIndex, 1);
      }
    }

    // Remove from target element's incoming relations
    const targetElement = this.getElement(relationship.targetId);
    if (targetElement && targetElement.incomingRelations) {
      const targetIndex = targetElement.incomingRelations.indexOf(id);
      if (targetIndex !== -1) {
        targetElement.incomingRelations.splice(targetIndex, 1);
      }
    }

    // Remove from views
    for (const view of this.model.views) {
      if (view.relationships) {
        const relIndex = view.relationships.indexOf(id);
        if (relIndex !== -1) {
          view.relationships.splice(relIndex, 1);
        }
      }
    }

    // Delete relationship
    this.model.relationships.splice(relationshipIndex, 1);
    this.markModified();

    logger.log('info', 'relationship.deleted', { id });
  }

  /**
   * Get a relationship by ID
   */
  getRelationship(id: string): RelationshipObject | null {
    return this.model.relationships.find(r => r.id === id) || null;
  }

  // ============================================================================
  // View Operations
  // ============================================================================

  /**
   * Create a new view
   */
  async createView(data: CreateViewInput): Promise<ViewObject> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new ValidationError('View name is required', { valid: false, errors: [{ message: 'View name is required' }] });
    }

    // Generate identifier if not provided
    let identifier = data.identifier;
    if (!identifier || identifier.trim() === '') {
      identifier = this.generateId('view');
    }

    // Check for duplicate identifier
    if (this.identifierExists(identifier)) {
      throw new DuplicateError('view', identifier);
    }

    // Validate elements if provided
    if (data.elements) {
      for (const elementId of data.elements) {
        if (!this.getElement(elementId)) {
          throw new NotFoundError('element', elementId);
        }
      }
    }

    // Validate relationships if provided
    if (data.relationships) {
      for (const relId of data.relationships) {
        if (!this.getRelationship(relId)) {
          throw new NotFoundError('relationship', relId);
        }
      }
    }

    // Validate node hierarchy if provided
    if (data.nodeHierarchy) {
      for (const hierarchy of data.nodeHierarchy) {
        if (!this.getElement(hierarchy.parentElement)) {
          throw new NotFoundError('element', hierarchy.parentElement);
        }
        if (!this.getElement(hierarchy.childElement)) {
          throw new NotFoundError('element', hierarchy.childElement);
        }
      }
    }

    // Create view object
    const view: ViewObject = {
      id: identifier,
      name: data.name.trim(),
      type: data.type?.trim(),
      viewpoint: data.viewpoint?.trim(),
      documentation: data.documentation?.trim(),
      properties: data.properties ? { ...data.properties } : {},
      elements: data.elements ? [...data.elements] : [],
      relationships: data.relationships ? [...data.relationships] : [],
      nodeHierarchy: data.nodeHierarchy ? [...data.nodeHierarchy] : []
    };

    // Add to model
    this.model.views.push(view);

    // Update element references (inViews)
    if (view.elements) {
      for (const elementId of view.elements) {
        const element = this.getElement(elementId);
        if (element) {
          if (!element.inViews) {
            element.inViews = [];
          }
          if (!element.inViews.includes(identifier)) {
            element.inViews.push(identifier);
          }
        }
      }
    }

    this.markModified();

    logger.log('info', 'view.created', { id: identifier, name: data.name });
    return view;
  }

  /**
   * Update an existing view
   */
  async updateView(id: string, data: UpdateViewInput): Promise<ViewObject> {
    // Find view
    const viewIndex = this.model.views.findIndex(v => v.id === id);
    if (viewIndex === -1) {
      throw new NotFoundError('view', id);
    }

    const view = this.model.views[viewIndex];
    const previousElements = view.elements ? [...view.elements] : [];
    const previousRelationships = view.relationships ? [...view.relationships] : [];

    // Update name
    if (data.name !== undefined) {
      if (data.name.trim() === '') {
        throw new ValidationError('View name cannot be empty', { valid: false, errors: [{ message: 'View name cannot be empty' }] });
      }
      view.name = data.name.trim();
    }

    // Update type
    if (data.type !== undefined) {
      view.type = data.type.trim();
    }

    // Update viewpoint
    if (data.viewpoint !== undefined) {
      view.viewpoint = data.viewpoint.trim();
    }

    // Update documentation
    if (data.documentation !== undefined) {
      view.documentation = data.documentation?.trim();
    }

    // Update properties
    if (data.properties !== undefined) {
      view.properties = { ...data.properties };
    }

    // Update elements
    if (data.elements !== undefined) {
      // Remove old element references
      for (const elementId of previousElements) {
        const element = this.getElement(elementId);
        if (element && element.inViews) {
          const index = element.inViews.indexOf(id);
          if (index !== -1) {
            element.inViews.splice(index, 1);
          }
        }
      }

      // Validate new elements exist
      for (const elementId of data.elements) {
        if (!this.getElement(elementId)) {
          throw new NotFoundError('element', elementId);
        }
      }

      view.elements = [...data.elements];

      // Add new element references
      for (const elementId of view.elements) {
        const element = this.getElement(elementId);
        if (element) {
          if (!element.inViews) {
            element.inViews = [];
          }
          if (!element.inViews.includes(id)) {
            element.inViews.push(id);
          }
        }
      }
    }

    // Update relationships
    if (data.relationships !== undefined) {
      // Validate relationships exist
      for (const relId of data.relationships) {
        if (!this.getRelationship(relId)) {
          throw new NotFoundError('relationship', relId);
        }
      }

      view.relationships = [...data.relationships];
    }

    // Update node hierarchy
    if (data.nodeHierarchy !== undefined) {
      // Validate hierarchy elements exist
      for (const hierarchy of data.nodeHierarchy) {
        if (!this.getElement(hierarchy.parentElement)) {
          throw new NotFoundError('element', hierarchy.parentElement);
        }
        if (!this.getElement(hierarchy.childElement)) {
          throw new NotFoundError('element', hierarchy.childElement);
        }
      }

      view.nodeHierarchy = [...data.nodeHierarchy];
    }

    this.markModified();

    logger.log('info', 'view.updated', { id, changes: Object.keys(data) });
    return view;
  }

  /**
   * Delete a view
   */
  async deleteView(id: string): Promise<void> {
    // Find view
    const viewIndex = this.model.views.findIndex(v => v.id === id);
    if (viewIndex === -1) {
      throw new NotFoundError('view', id);
    }

    const view = this.model.views[viewIndex];

    // Remove view reference from elements
    if (view.elements) {
      for (const elementId of view.elements) {
        const element = this.getElement(elementId);
        if (element && element.inViews) {
          const index = element.inViews.indexOf(id);
          if (index !== -1) {
            element.inViews.splice(index, 1);
          }
        }
      }
    }

    // Delete view
    this.model.views.splice(viewIndex, 1);
    this.markModified();

    logger.log('info', 'view.deleted', { id });
  }

  /**
   * Get a view by ID
   */
  getView(id: string): ViewObject | null {
    return this.model.views.find(v => v.id === id) || null;
  }

  /**
   * Add an element to a view
   */
  async addElementToView(viewId: string, elementId: string, parentElementId?: string): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new NotFoundError('view', viewId);
    }

    const element = this.getElement(elementId);
    if (!element) {
      throw new NotFoundError('element', elementId);
    }

    // Add element to view's elements array if not already present
    if (!view.elements) {
      view.elements = [];
    }
    if (!view.elements.includes(elementId)) {
      view.elements.push(elementId);
    }

    // Add to element's inViews if not already present
    if (!element.inViews) {
      element.inViews = [];
    }
    if (!element.inViews.includes(viewId)) {
      element.inViews.push(viewId);
    }

    // Add to node hierarchy if parent is specified
    if (parentElementId) {
      const parentElement = this.getElement(parentElementId);
      if (!parentElement) {
        throw new NotFoundError('element', parentElementId);
      }

      // Ensure parent is also in the view
      if (!view.elements.includes(parentElementId)) {
        view.elements.push(parentElementId);
        if (!parentElement.inViews) {
          parentElement.inViews = [];
        }
        if (!parentElement.inViews.includes(viewId)) {
          parentElement.inViews.push(viewId);
        }
      }

      // Add to node hierarchy
      if (!view.nodeHierarchy) {
        view.nodeHierarchy = [];
      }
      const hierarchyEntry = { parentElement: parentElementId, childElement: elementId };
      const exists = view.nodeHierarchy.some(
        h => h.parentElement === parentElementId && h.childElement === elementId
      );
      if (!exists) {
        view.nodeHierarchy.push(hierarchyEntry);
      }
    }

    this.markModified();
    logger.log('info', 'view.element.added', { viewId, elementId, parentElementId });
  }

  /**
   * Remove an element from a view
   */
  async removeElementFromView(viewId: string, elementId: string): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new NotFoundError('view', viewId);
    }

    // Remove from view's elements array
    if (view.elements) {
      const index = view.elements.indexOf(elementId);
      if (index !== -1) {
        view.elements.splice(index, 1);
      }
    }

    // Remove from element's inViews
    const element = this.getElement(elementId);
    if (element && element.inViews) {
      const index = element.inViews.indexOf(viewId);
      if (index !== -1) {
        element.inViews.splice(index, 1);
      }
    }

    // Remove from node hierarchy (both as parent and child)
    if (view.nodeHierarchy) {
      view.nodeHierarchy = view.nodeHierarchy.filter(
        h => h.parentElement !== elementId && h.childElement !== elementId
      );
    }

    // Remove relationships connected to this element in the view
    if (view.relationships) {
      const relationshipsToRemove: string[] = [];
      for (const relId of view.relationships) {
        const rel = this.getRelationship(relId);
        if (rel && (rel.sourceId === elementId || rel.targetId === elementId)) {
          relationshipsToRemove.push(relId);
        }
      }
      for (const relId of relationshipsToRemove) {
        const index = view.relationships.indexOf(relId);
        if (index !== -1) {
          view.relationships.splice(index, 1);
        }
      }
    }

    this.markModified();
    logger.log('info', 'view.element.removed', { viewId, elementId });
  }

  /**
   * Add a relationship to a view
   */
  async addRelationshipToView(viewId: string, relationshipId: string): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new NotFoundError('view', viewId);
    }

    const relationship = this.getRelationship(relationshipId);
    if (!relationship) {
      throw new NotFoundError('relationship', relationshipId);
    }

    // Ensure source and target elements are in the view
    const sourceElement = this.getElement(relationship.sourceId);
    const targetElement = this.getElement(relationship.targetId);

    if (!sourceElement) {
      throw new NotFoundError('element', relationship.sourceId);
    }
    if (!targetElement) {
      throw new NotFoundError('element', relationship.targetId);
    }

    // Add source element to view if not present
    if (!view.elements) {
      view.elements = [];
    }
    if (!view.elements.includes(relationship.sourceId)) {
      view.elements.push(relationship.sourceId);
      if (!sourceElement.inViews) {
        sourceElement.inViews = [];
      }
      if (!sourceElement.inViews.includes(viewId)) {
        sourceElement.inViews.push(viewId);
      }
    }

    // Add target element to view if not present
    if (!view.elements.includes(relationship.targetId)) {
      view.elements.push(relationship.targetId);
      if (!targetElement.inViews) {
        targetElement.inViews = [];
      }
      if (!targetElement.inViews.includes(viewId)) {
        targetElement.inViews.push(viewId);
      }
    }

    // Add relationship to view's relationships array if not already present
    if (!view.relationships) {
      view.relationships = [];
    }
    if (!view.relationships.includes(relationshipId)) {
      view.relationships.push(relationshipId);
    }

    this.markModified();
    logger.log('info', 'view.relationship.added', { viewId, relationshipId });
  }

  /**
   * Remove a relationship from a view
   */
  async removeRelationshipFromView(viewId: string, relationshipId: string): Promise<void> {
    const view = this.getView(viewId);
    if (!view) {
      throw new NotFoundError('view', viewId);
    }

    // Remove from view's relationships array
    if (view.relationships) {
      const index = view.relationships.indexOf(relationshipId);
      if (index !== -1) {
        view.relationships.splice(index, 1);
      }
    }

    this.markModified();
    logger.log('info', 'view.relationship.removed', { viewId, relationshipId });
  }

  // ============================================================================
  // Property Operations
  // ============================================================================

  /**
   * Get property definition by identifier
   */
  private getPropertyDefinition(id: string): PropertyDefinition | null {
    if (!this.model.propertyDefinitions) {
      return null;
    }
    return this.model.propertyDefinitions.find(pd => pd.identifier === id) || null;
  }

  /**
   * Find entity (element, relationship, or view) by ID
   */
  private findEntity(id: string): { type: 'element' | 'relationship' | 'view'; entity: ElementObject | RelationshipObject | ViewObject } | null {
    const element = this.getElement(id);
    if (element) return { type: 'element', entity: element };

    const relationship = this.getRelationship(id);
    if (relationship) return { type: 'relationship', entity: relationship };

    const view = this.getView(id);
    if (view) return { type: 'view', entity: view };

    return null;
  }

  /**
   * Create a property definition
   */
  async createPropertyDefinition(data: CreatePropertyDefinitionInput): Promise<PropertyDefinition> {
    // Validate required fields
    if (!data.identifier || data.identifier.trim() === '') {
      throw new ValidationError('Property definition identifier is required', { valid: false, errors: [{ message: 'Property definition identifier is required' }] });
    }

    if (!data.name || data.name.trim() === '') {
      throw new ValidationError('Property definition name is required', { valid: false, errors: [{ message: 'Property definition name is required' }] });
    }

    // Initialize property definitions array if needed
    if (!this.model.propertyDefinitions) {
      this.model.propertyDefinitions = [];
    }

    // Check for duplicate identifier
    const existing = this.getPropertyDefinition(data.identifier.trim());
    if (existing) {
      throw new DuplicateError('property definition', data.identifier);
    }

    // Create property definition
    const propertyDef: PropertyDefinition = {
      identifier: data.identifier.trim(),
      name: data.name.trim()
    };

    // Add to model
    this.model.propertyDefinitions.push(propertyDef);
    this.markModified();

    logger.log('info', 'property.definition.created', { id: propertyDef.identifier, name: propertyDef.name });
    return propertyDef;
  }

  /**
   * Assign a property to an element, relationship, or view
   */
  async assignProperty(targetId: string, propertyDefId: string, value: string): Promise<void> {
    // Validate property definition exists
    const propertyDef = this.getPropertyDefinition(propertyDefId);
    if (!propertyDef) {
      throw new NotFoundError('property definition', propertyDefId);
    }

    // Find target entity
    const entityResult = this.findEntity(targetId);
    if (!entityResult) {
      throw new NotFoundError('entity', targetId);
    }

    // Initialize properties if needed
    if (!entityResult.entity.properties) {
      entityResult.entity.properties = {};
    }

    // Assign property (using property definition ID as key)
    entityResult.entity.properties[propertyDefId] = value;
    this.markModified();

    logger.log('info', 'property.assigned', { 
      targetId, 
      propertyDefId, 
      entityType: entityResult.type,
      value 
    });
  }

  /**
   * Update a property value
   */
  async updateProperty(targetId: string, propertyDefId: string, value: string): Promise<void> {
    // Validate property definition exists
    const propertyDef = this.getPropertyDefinition(propertyDefId);
    if (!propertyDef) {
      throw new NotFoundError('property definition', propertyDefId);
    }

    // Find target entity
    const entityResult = this.findEntity(targetId);
    if (!entityResult) {
      throw new NotFoundError('entity', targetId);
    }

    // Check if property exists
    if (!entityResult.entity.properties || !(propertyDefId in entityResult.entity.properties)) {
      throw new NotFoundError('property', `${targetId}.${propertyDefId}`);
    }

    // Update property value
    entityResult.entity.properties[propertyDefId] = value;
    this.markModified();

    logger.log('info', 'property.updated', { 
      targetId, 
      propertyDefId, 
      entityType: entityResult.type,
      value 
    });
  }

  /**
   * Delete a property from an element, relationship, or view
   */
  async deleteProperty(targetId: string, propertyDefId: string, options?: { cascade?: boolean }): Promise<void> {
    const opts = { cascade: false, ...options };

    // Find target entity
    const entityResult = this.findEntity(targetId);
    if (!entityResult) {
      throw new NotFoundError('entity', targetId);
    }

    // Check if property exists
    if (!entityResult.entity.properties || !(propertyDefId in entityResult.entity.properties)) {
      throw new NotFoundError('property', `${targetId}.${propertyDefId}`);
    }

    // Delete property from entity
    delete entityResult.entity.properties[propertyDefId];
    this.markModified();

    // If cascade is enabled, check if property definition should be deleted
    if (opts.cascade) {
      // Check if property definition is used elsewhere
      const isUsed = this.isPropertyDefinitionUsed(propertyDefId);
      
      if (!isUsed) {
        // Delete property definition if not used anywhere
        if (this.model.propertyDefinitions) {
          const index = this.model.propertyDefinitions.findIndex(pd => pd.identifier === propertyDefId);
          if (index !== -1) {
            this.model.propertyDefinitions.splice(index, 1);
            logger.log('info', 'property.definition.deleted.cascade', { id: propertyDefId });
          }
        }
      }
    }

    logger.log('info', 'property.deleted', { 
      targetId, 
      propertyDefId, 
      entityType: entityResult.type 
    });
  }

  /**
   * Check if a property definition is used by any entity
   */
  private isPropertyDefinitionUsed(propertyDefId: string): boolean {
    // Check elements
    for (const element of this.model.elements) {
      if (element.properties && propertyDefId in element.properties) {
        return true;
      }
    }

    // Check relationships
    for (const relationship of this.model.relationships) {
      if (relationship.properties && propertyDefId in relationship.properties) {
        return true;
      }
    }

    // Check views
    for (const view of this.model.views) {
      if (view.properties && propertyDefId in view.properties) {
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /**
   * Begin a new transaction
   */
  beginTransaction(): ModelTransaction {
    return new ModelTransaction(this.model);
  }

  /**
   * Commit a transaction (apply all operations)
   */
  async commitTransaction(transaction: ModelTransaction): Promise<void> {
    // TODO: Implement transaction commit logic
    // For now, transactions are not yet implemented
    logger.log('info', 'transaction.commit', { operationCount: transaction.getOperations().length });
    this.modified = true;
  }

  /**
   * Rollback a transaction (discard all operations)
   */
  async rollbackTransaction(transaction: ModelTransaction): Promise<void> {
    // TODO: Implement transaction rollback logic
    // Restore from snapshot
    this.model = transaction.getSnapshot();
    logger.log('info', 'transaction.rollback', { operationCount: transaction.getOperations().length });
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate the entire model
   */
  async validateModel(): Promise<ValidationResult> {
    if (!this.validator) {
      return { valid: true, errors: [] };
    }

    // TODO: Serialize model to XML and validate
    // This will be implemented when XML builder is ready (Story-1-3)
    logger.log('info', 'model.validation', {});
    return { valid: true, errors: [] };
  }

  /**
   * Validate a single element
   */
  async validateElement(element: ElementObject): Promise<ValidationResult> {
    // TODO: Implement element validation
    return { valid: true, errors: [] };
  }

  /**
   * Validate a single relationship
   */
  async validateRelationship(rel: RelationshipObject): Promise<ValidationResult> {
    // TODO: Implement relationship validation
    return { valid: true, errors: [] };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save model to file
   */
  async save(path?: string): Promise<void> {
    // TODO: Implement in Story-2-6 (Model Persistence)
    throw new Error('Not implemented: save');
  }

  /**
   * Save model to a new file
   */
  async saveAs(path: string): Promise<void> {
    // TODO: Implement in Story-2-6 (Model Persistence)
    throw new Error('Not implemented: saveAs');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate a unique identifier
   */
  protected generateId(prefix: string = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if an identifier already exists
   */
  protected identifierExists(id: string): boolean {
    const allIds = [
      ...this.model.elements.map(e => e.id),
      ...this.model.relationships.map(r => r.id),
      ...this.model.views.map(v => v.id)
    ];
    return allIds.includes(id);
  }

  /**
   * Mark model as modified
   */
  protected markModified(): void {
    this.modified = true;
  }

  /**
   * Validate element type against ArchiMate 3.1 specification
   */
  protected async validateElementType(type: string): Promise<ValidationResult> {
    // ArchiMate 3.1 valid element types
    const validTypes = new Set([
      // Business Layer
      'BusinessActor', 'BusinessRole', 'BusinessCollaboration', 'BusinessInterface',
      'BusinessProcess', 'BusinessFunction', 'BusinessInteraction', 'BusinessEvent',
      'BusinessService', 'BusinessObject', 'Contract', 'Representation',
      // Application Layer
      'ApplicationComponent', 'ApplicationCollaboration', 'ApplicationInterface',
      'ApplicationFunction', 'ApplicationInteraction', 'ApplicationProcess',
      'ApplicationEvent', 'ApplicationService', 'DataObject',
      // Technology Layer
      'Node', 'Device', 'SystemSoftware', 'TechnologyCollaboration',
      'TechnologyInterface', 'TechnologyFunction', 'TechnologyProcess',
      'TechnologyInteraction', 'TechnologyEvent', 'TechnologyService',
      'Artifact', 'CommunicationNetwork', 'Path', 'Network',
      // Motivation Layer
      'Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome',
      'Principle', 'Requirement', 'Constraint',
      // Strategy Layer
      'Resource', 'Capability', 'CourseOfAction', 'ValueStream',
      // Physical Layer
      'Equipment', 'Facility', 'DistributionNetwork', 'Material',
      // Implementation & Migration Layer
      'WorkPackage', 'Deliverable', 'ImplementationEvent', 'Plateau', 'Gap'
    ]);

    if (!validTypes.has(type)) {
      return {
        valid: false,
        errors: [{
          message: `Invalid ArchiMate element type: ${type}. Must be one of the valid ArchiMate 3.1 element types.`
        }]
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate relationship type against ArchiMate 3.1 specification
   */
  protected async validateRelationshipType(type: string): Promise<ValidationResult> {
    // ArchiMate 3.1 valid relationship types
    const validTypes = new Set([
      // Structural Relationships
      'Composition', 'Aggregation', 'Assignment', 'Realization', 'Serving',
      'Access', 'Influence', 'Association',
      // Dynamic Relationships
      'Flow', 'Triggering',
      // Other Relationships
      'Specialization', 'Junction'
    ]);

    if (!validTypes.has(type)) {
      return {
        valid: false,
        errors: [{
          message: `Invalid ArchiMate relationship type: ${type}. Must be one of the valid ArchiMate 3.1 relationship types.`
        }]
      };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Get a ModelManipulator instance
 * 
 * @param loader Optional ModelLoader instance (creates new if not provided)
 * @param validator Optional XSDValidator instance
 * @returns ModelManipulator instance
 */
export function getModelManipulator(
  loader?: ModelLoader,
  validator?: XSDValidator
): ModelManipulator {
  if (!loader) {
    throw new Error('ModelLoader is required');
  }
  return new ModelManipulator(loader, validator);
}
