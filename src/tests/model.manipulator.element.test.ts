import { describe, it, expect, beforeEach } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { XSDValidator } from '../utils/xsd-validator';
import { join } from 'path';
import {
  ValidationError,
  NotFoundError,
  DuplicateError,
  ReferentialIntegrityError
} from '../model/manipulator-types';

describe('ModelManipulator - Element CRUD Operations', () => {
  let loader: ModelLoader;
  let manipulator: ModelManipulator;
  const testPath = join(__dirname, 'fixtures', 'basic-model.xml');

  beforeEach(() => {
    loader = new ModelLoader(testPath);
    manipulator = new ModelManipulator(loader);
  });

  describe('createElement', () => {
    it('should create a new element with required fields', async () => {
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component'
      });

      expect(element).toBeDefined();
      expect(element.id).toBeDefined();
      expect(element.name).toBe('Test Component');
      expect(element.type).toBe('ApplicationComponent');
      expect(element.properties).toBeDefined();
      expect(element.inViews).toEqual([]);
      expect(element.outgoingRelations).toEqual([]);
      expect(element.incomingRelations).toEqual([]);
    });

    it('should create element with custom identifier', async () => {
      const element = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Custom Actor',
        identifier: 'custom-id-123'
      });

      expect(element.id).toBe('custom-id-123');
    });

    it('should auto-generate identifier if not provided', async () => {
      const element = await manipulator.createElement({
        type: 'Device',
        name: 'Test Device'
      });

      expect(element.id).toBeDefined();
      expect(element.id).toMatch(/^elem-/);
    });

    it('should create element with optional fields', async () => {
      const element = await manipulator.createElement({
        type: 'ApplicationService',
        name: 'Test Service',
        documentation: 'Test documentation',
        properties: { 'prop1': 'value1', 'prop2': 'value2' }
      });

      expect(element.documentation).toBe('Test documentation');
      expect(element.properties).toEqual({ 'prop1': 'value1', 'prop2': 'value2' });
    });

    it('should throw ValidationError if name is missing', async () => {
      await expect(manipulator.createElement({
        type: 'ApplicationComponent',
        name: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if type is missing', async () => {
      await expect(manipulator.createElement({
        type: '',
        name: 'Test'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid element type', async () => {
      await expect(manipulator.createElement({
        type: 'InvalidType',
        name: 'Test'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw DuplicateError if identifier already exists', async () => {
      // First create an element
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'First',
        identifier: 'duplicate-id'
      });

      // Try to create another with same ID
      await expect(manipulator.createElement({
        type: 'BusinessActor',
        name: 'Second',
        identifier: 'duplicate-id'
      })).rejects.toThrow(DuplicateError);
    });

    it('should support all ArchiMate 3.1 element types', async () => {
      const validTypes = [
        'BusinessActor', 'ApplicationComponent', 'Device',
        'Stakeholder', 'Resource', 'Equipment', 'WorkPackage'
      ];

      for (const type of validTypes) {
        const element = await manipulator.createElement({
          type,
          name: `Test ${type}`
        });
        expect(element.type).toBe(type);
      }
    });

    it('should mark model as modified after creation', () => {
      expect(manipulator.isModified()).toBe(false);
      manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test'
      }).then(() => {
        expect(manipulator.isModified()).toBe(true);
      });
    });
  });

  describe('updateElement', () => {
    let elementId: string;

    beforeEach(async () => {
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Original Name',
        identifier: 'update-test-id'
      });
      elementId = element.id;
    });

    it('should update element name', async () => {
      const updated = await manipulator.updateElement(elementId, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('ApplicationComponent');
    });

    it('should update element type', async () => {
      const updated = await manipulator.updateElement(elementId, {
        type: 'BusinessActor'
      });

      expect(updated.type).toBe('BusinessActor');
    });

    it('should update element documentation', async () => {
      const updated = await manipulator.updateElement(elementId, {
        documentation: 'Updated documentation'
      });

      expect(updated.documentation).toBe('Updated documentation');
    });

    it('should update element properties', async () => {
      const updated = await manipulator.updateElement(elementId, {
        properties: { 'newProp': 'newValue' }
      });

      expect(updated.properties).toEqual({ 'newProp': 'newValue' });
    });

    it('should update multiple fields at once', async () => {
      const updated = await manipulator.updateElement(elementId, {
        name: 'Updated Name',
        type: 'BusinessActor',
        documentation: 'Updated docs',
        properties: { 'prop': 'value' }
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('BusinessActor');
      expect(updated.documentation).toBe('Updated docs');
      expect(updated.properties).toEqual({ 'prop': 'value' });
    });

    it('should throw NotFoundError if element does not exist', async () => {
      await expect(manipulator.updateElement('nonexistent-id', {
        name: 'Test'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if name is set to empty', async () => {
      await expect(manipulator.updateElement(elementId, {
        name: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid element type', async () => {
      await expect(manipulator.updateElement(elementId, {
        type: 'InvalidType'
      })).rejects.toThrow(ValidationError);
    });

    it('should mark model as modified after update', async () => {
      // Create a fresh manipulator instance to start with unmodified state
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);
      
      // Create element
      const element = await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Original',
        identifier: 'update-modified-test-id'
      });
      
      // Update the element
      await freshManipulator.updateElement(element.id, { name: 'Updated' });
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('deleteElement', () => {
    let elementId: string;
    let relatedElementId: string;
    let relationshipId: string;

    beforeEach(async () => {
      // Create an element to delete
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'To Delete',
        identifier: 'delete-test-id'
      });
      elementId = element.id;

      // Create a related element and relationship
      const related = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Related',
        identifier: 'related-id'
      });
      relatedElementId = related.id;

      // Note: We'll need to create relationships in Story-2-2, but for now
      // we'll test the cascade logic with the model structure
    });

    it('should delete element without cascade', async () => {
      await manipulator.deleteElement(elementId, { cascade: false });

      const deleted = manipulator.getElement(elementId);
      expect(deleted).toBeNull();
    });

    it('should throw NotFoundError if element does not exist', async () => {
      await expect(manipulator.deleteElement('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified after deletion', async () => {
      // Create a fresh manipulator instance
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);
      
      // Create element
      const element = await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'To Delete',
        identifier: 'delete-modified-test-id'
      });
      
      // Delete the element
      await freshManipulator.deleteElement(element.id);
      expect(freshManipulator.isModified()).toBe(true);
    });

    // Note: Cascade deletion tests will be more comprehensive once
    // relationship CRUD is implemented in Story-2-2
  });

  describe('getElement', () => {
    it('should return element by ID', async () => {
      const created = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test',
        identifier: 'get-test-id'
      });

      const retrieved = manipulator.getElement('get-test-id');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('get-test-id');
      expect(retrieved?.name).toBe('Test');
    });

    it('should return null if element does not exist', () => {
      const retrieved = manipulator.getElement('nonexistent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Element Type Validation', () => {
    const validTypes = [
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
    ];

    it('should accept all valid ArchiMate 3.1 element types', async () => {
      for (const type of validTypes) {
        const element = await manipulator.createElement({
          type,
          name: `Test ${type}`
        });
        expect(element.type).toBe(type);
      }
    });

    it('should reject invalid element types', async () => {
      const invalidTypes = ['InvalidType', 'NotAnElement', 'RandomString', ''];

      for (const type of invalidTypes) {
        if (type === '') {
          // Empty type is handled by required field validation
          continue;
        }
        await expect(manipulator.createElement({
          type,
          name: 'Test'
        })).rejects.toThrow(ValidationError);
      }
    });
  });
});
