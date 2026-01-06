/**
 * Business Rules Validator for ArchiMate Models
 * 
 * Implements ArchiMate-specific business rule validation including:
 * - Relationship type compatibility with element types
 * - Relationship cardinality constraints
 * - Element type validation
 * - View integrity validation
 * 
 * @module utils/business-rules-validator
 */

import { ElementObject, RelationshipObject, ViewObject } from '../model/types';
import { ValidationError, ValidationResult } from './xsd-validator';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * Relationship compatibility matrix
 * Maps relationship types to allowed source and target element types
 * Based on ArchiMate 3.1 specification
 */
const RELATIONSHIP_COMPATIBILITY: Record<string, {
  allowedSourceTypes?: string[];
  allowedTargetTypes?: string[];
  cardinality?: 'one-to-one' | 'one-to-many' | 'many-to-many';
  notes?: string;
}> = {
  // Structural Relationships
  'Composition': {
    cardinality: 'one-to-many',
    notes: 'Source must be a composite element type'
  },
  'Aggregation': {
    cardinality: 'one-to-many',
    notes: 'Source must be an aggregate element type'
  },
  'Assignment': {
    cardinality: 'one-to-one',
    notes: 'Used to assign elements to other elements (e.g., BusinessActor to BusinessRole)'
  },
  'Realization': {
    notes: 'Used to realize elements (e.g., ApplicationService realizes BusinessService)'
  },
  'Serving': {
    notes: 'Used to indicate that one element serves another'
  },
  'Access': {
    notes: 'Used to indicate access to data or information'
  },
  'Influence': {
    notes: 'Used to indicate influence between elements'
  },
  'Association': {
    notes: 'General-purpose relationship, can connect most element types'
  },
  // Dynamic Relationships
  'Flow': {
    notes: 'Used to indicate flow of information, material, or value'
  },
  'Triggering': {
    notes: 'Used to indicate that one element triggers another'
  },
  // Other Relationships
  'Specialization': {
    cardinality: 'one-to-one',
    notes: 'Used to indicate specialization/generalization'
  },
  'Junction': {
    notes: 'Used in junction relationships (AND, OR, XOR)'
  }
};

/**
 * Element type categories for compatibility checking
 */
const ELEMENT_TYPE_CATEGORIES: Record<string, string[]> = {
  'BusinessLayer': [
    'BusinessActor', 'BusinessRole', 'BusinessCollaboration', 'BusinessInterface',
    'BusinessProcess', 'BusinessFunction', 'BusinessInteraction', 'BusinessEvent',
    'BusinessService', 'BusinessObject', 'Contract', 'Representation'
  ],
  'ApplicationLayer': [
    'ApplicationComponent', 'ApplicationCollaboration', 'ApplicationInterface',
    'ApplicationFunction', 'ApplicationInteraction', 'ApplicationProcess',
    'ApplicationEvent', 'ApplicationService', 'DataObject'
  ],
  'TechnologyLayer': [
    'Node', 'Device', 'SystemSoftware', 'TechnologyCollaboration',
    'TechnologyInterface', 'TechnologyFunction', 'TechnologyProcess',
    'TechnologyInteraction', 'TechnologyEvent', 'TechnologyService',
    'Artifact', 'CommunicationNetwork', 'Path', 'Network'
  ],
  'MotivationLayer': [
    'Stakeholder', 'Driver', 'Assessment', 'Goal', 'Outcome',
    'Principle', 'Requirement', 'Constraint'
  ],
  'StrategyLayer': [
    'Resource', 'Capability', 'CourseOfAction', 'ValueStream'
  ],
  'PhysicalLayer': [
    'Equipment', 'Facility', 'DistributionNetwork', 'Material'
  ],
  'ImplementationMigrationLayer': [
    'WorkPackage', 'Deliverable', 'ImplementationEvent', 'Plateau', 'Gap'
  ]
};

/**
 * Business Rules Validator
 */
export class BusinessRulesValidator {
  /**
   * Validate relationship type compatibility with source and target element types
   */
  validateRelationshipCompatibility(
    relationship: RelationshipObject,
    sourceElement: ElementObject,
    targetElement: ElementObject
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!relationship.type) {
      return { valid: true, errors: [] };
    }

    const compatibility = RELATIONSHIP_COMPATIBILITY[relationship.type];
    if (!compatibility) {
      // Unknown relationship type - will be caught by type validation
      return { valid: true, errors: [] };
    }

    // Check source type compatibility
    if (compatibility.allowedSourceTypes && sourceElement.type) {
      if (!compatibility.allowedSourceTypes.includes(sourceElement.type)) {
        errors.push({
          message: `Relationship type '${relationship.type}' is not compatible with source element type '${sourceElement.type}'`,
          path: `relationship[${relationship.id}].sourceId`,
          line: undefined,
          column: undefined
        });
      }
    }

    // Check target type compatibility
    if (compatibility.allowedTargetTypes && targetElement.type) {
      if (!compatibility.allowedTargetTypes.includes(targetElement.type)) {
        errors.push({
          message: `Relationship type '${relationship.type}' is not compatible with target element type '${targetElement.type}'`,
          path: `relationship[${relationship.id}].targetId`,
          line: undefined,
          column: undefined
        });
      }
    }

    // Note: Full compatibility matrix would require extensive ArchiMate specification knowledge
    // This is a simplified version that can be extended

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate relationship cardinality
   */
  validateRelationshipCardinality(
    relationship: RelationshipObject,
    allRelationships: RelationshipObject[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!relationship.type) {
      return { valid: true, errors: [] };
    }

    const compatibility = RELATIONSHIP_COMPATIBILITY[relationship.type];
    if (!compatibility || !compatibility.cardinality) {
      return { valid: true, errors: [] };
    }

    // Check cardinality constraints
    if (compatibility.cardinality === 'one-to-one') {
      // Check if source already has this relationship type to target
      const existing = allRelationships.find(r =>
        r.id !== relationship.id &&
        r.type === relationship.type &&
        r.sourceId === relationship.sourceId &&
        r.targetId === relationship.targetId
      );

      if (existing) {
        errors.push({
          message: `Relationship type '${relationship.type}' has one-to-one cardinality. Another relationship of this type already exists between the same source and target.`,
          path: `relationship[${relationship.id}]`,
          line: undefined,
          column: undefined
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate element type against ArchiMate specification
   */
  validateElementType(elementType: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if type is in any category
    const isValid = Object.values(ELEMENT_TYPE_CATEGORIES).some(category =>
      category.includes(elementType)
    );

    if (!isValid) {
      errors.push({
        message: `Invalid ArchiMate element type: ${elementType}. Must be one of the valid ArchiMate 3.1 element types.`,
        path: `element.type`,
        line: undefined,
        column: undefined
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate view integrity
   */
  validateViewIntegrity(
    view: ViewObject,
    elements: ElementObject[],
    relationships: RelationshipObject[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate view elements exist
    if (view.elements) {
      for (const elementId of view.elements) {
        const elementExists = elements.some(e => e.id === elementId);
        if (!elementExists) {
          errors.push({
            message: `View element reference not found: ${elementId}`,
            path: `view[${view.id}].elements[${elementId}]`,
            line: undefined,
            column: undefined
          });
        }
      }
    }

    // Validate view relationships exist
    if (view.relationships) {
      for (const relId of view.relationships) {
        const relExists = relationships.some(r => r.id === relId);
        if (!relExists) {
          errors.push({
            message: `View relationship reference not found: ${relId}`,
            path: `view[${view.id}].relationships[${relId}]`,
            line: undefined,
            column: undefined
          });
        }
      }
    }

    // Validate node hierarchy
    if (view.nodeHierarchy) {
      for (const { parentElement, childElement } of view.nodeHierarchy) {
        // Check parent exists in view
        if (view.elements && !view.elements.includes(parentElement)) {
          errors.push({
            message: `Node hierarchy parent element not in view: ${parentElement}`,
            path: `view[${view.id}].nodeHierarchy.parentElement[${parentElement}]`,
            line: undefined,
            column: undefined
          });
        }

        // Check child exists in view
        if (view.elements && !view.elements.includes(childElement)) {
          errors.push({
            message: `Node hierarchy child element not in view: ${childElement}`,
            path: `view[${view.id}].nodeHierarchy.childElement[${childElement}]`,
            line: undefined,
            column: undefined
          });
        }

        // Check parent element exists in model
        const parentExists = elements.some(e => e.id === parentElement);
        if (!parentExists) {
          errors.push({
            message: `Node hierarchy parent element not found: ${parentElement}`,
            path: `view[${view.id}].nodeHierarchy.parentElement[${parentElement}]`,
            line: undefined,
            column: undefined
          });
        }

        // Check child element exists in model
        const childExists = elements.some(e => e.id === childElement);
        if (!childExists) {
          errors.push({
            message: `Node hierarchy child element not found: ${childElement}`,
            path: `view[${view.id}].nodeHierarchy.childElement[${childElement}]`,
            line: undefined,
            column: undefined
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all business rules for a relationship
   */
  validateRelationship(
    relationship: RelationshipObject,
    sourceElement: ElementObject,
    targetElement: ElementObject,
    allRelationships: RelationshipObject[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate compatibility
    const compatibilityResult = this.validateRelationshipCompatibility(
      relationship,
      sourceElement,
      targetElement
    );
    errors.push(...compatibilityResult.errors);

    // Validate cardinality
    const cardinalityResult = this.validateRelationshipCardinality(
      relationship,
      allRelationships
    );
    errors.push(...cardinalityResult.errors);

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Get default business rules validator instance
 */
let defaultValidator: BusinessRulesValidator | null = null;

export function getBusinessRulesValidator(): BusinessRulesValidator {
  if (!defaultValidator) {
    defaultValidator = new BusinessRulesValidator();
  }
  return defaultValidator;
}
