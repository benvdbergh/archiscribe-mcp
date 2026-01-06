import { describe, it, expect, beforeEach } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { join } from 'path';
import {
  ValidationError,
  NotFoundError,
  DuplicateError
} from '../model/manipulator-types';

describe('ModelManipulator - Relationship CRUD Operations', () => {
  let loader: ModelLoader;
  let manipulator: ModelManipulator;
  const testPath = join(__dirname, 'fixtures', 'basic-model.xml');

  beforeEach(() => {
    loader = new ModelLoader(testPath);
    manipulator = new ModelManipulator(loader);
  });

  describe('createRelationship', () => {
    let sourceElementId: string;
    let targetElementId: string;

    beforeEach(async () => {
      // Create source and target elements for testing
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source Component',
        identifier: 'rel-test-source'
      });
      sourceElementId = source.id;

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target Actor',
        identifier: 'rel-test-target'
      });
      targetElementId = target.id;
    });

    it('should create a new relationship with required fields', async () => {
      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId
      });

      expect(relationship).toBeDefined();
      expect(relationship.id).toBeDefined();
      expect(relationship.type).toBe('Serving');
      expect(relationship.sourceId).toBe(sourceElementId);
      expect(relationship.targetId).toBe(targetElementId);
      expect(relationship.properties).toBeDefined();
    });

    it('should create relationship with custom identifier', async () => {
      const relationship = await manipulator.createRelationship({
        type: 'Access',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'custom-rel-id'
      });

      expect(relationship.id).toBe('custom-rel-id');
    });

    it('should auto-generate identifier if not provided', async () => {
      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId
      });

      expect(relationship.id).toBeDefined();
      expect(relationship.id).toMatch(/^rel-/);
    });

    it('should create relationship with optional fields', async () => {
      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId,
        name: 'Test Relationship',
        documentation: 'Test documentation',
        properties: { 'prop1': 'value1' }
      });

      expect(relationship.name).toBe('Test Relationship');
      expect(relationship.documentation).toBe('Test documentation');
      expect(relationship.properties).toEqual({ 'prop1': 'value1' });
    });

    it('should update element references when creating relationship', async () => {
      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'ref-test-rel'
      });

      const source = manipulator.getElement(sourceElementId);
      const target = manipulator.getElement(targetElementId);

      expect(source?.outgoingRelations).toContain('ref-test-rel');
      expect(target?.incomingRelations).toContain('ref-test-rel');
    });

    it('should throw ValidationError if type is missing', async () => {
      await expect(manipulator.createRelationship({
        type: '',
        sourceId: sourceElementId,
        targetId: targetElementId
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if sourceId is missing', async () => {
      await expect(manipulator.createRelationship({
        type: 'Serving',
        sourceId: '',
        targetId: targetElementId
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if targetId is missing', async () => {
      await expect(manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid relationship type', async () => {
      await expect(manipulator.createRelationship({
        type: 'InvalidType',
        sourceId: sourceElementId,
        targetId: targetElementId
      })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if source element does not exist', async () => {
      await expect(manipulator.createRelationship({
        type: 'Serving',
        sourceId: 'nonexistent-source',
        targetId: targetElementId
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if target element does not exist', async () => {
      await expect(manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: 'nonexistent-target'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if source and target are the same', async () => {
      await expect(manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: sourceElementId
      })).rejects.toThrow(ValidationError);
    });

    it('should throw DuplicateError if identifier already exists', async () => {
      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'duplicate-rel-id'
      });

      await expect(manipulator.createRelationship({
        type: 'Access',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'duplicate-rel-id'
      })).rejects.toThrow(DuplicateError);
    });

    it('should support all ArchiMate 3.1 relationship types', async () => {
      const validTypes = [
        'Composition', 'Aggregation', 'Assignment', 'Realization', 'Serving',
        'Access', 'Influence', 'Association', 'Flow', 'Triggering',
        'Specialization', 'Junction'
      ];

      for (const type of validTypes) {
        const relationship = await manipulator.createRelationship({
          type,
          sourceId: sourceElementId,
          targetId: targetElementId,
          identifier: `test-${type.toLowerCase()}-rel`
        });
        expect(relationship.type).toBe(type);
      }
    });

    it('should mark model as modified after creation', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      const source = await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'mod-test-source'
      });

      const target = await freshManipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'mod-test-target'
      });

      await freshManipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id
      });

      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('updateRelationship', () => {
    let relationshipId: string;
    let sourceElementId: string;
    let targetElementId: string;
    let newTargetElementId: string;

    beforeEach(async () => {
      // Create elements and relationship
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'update-rel-source'
      });
      sourceElementId = source.id;

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'update-rel-target'
      });
      targetElementId = target.id;

      const newTarget = await manipulator.createElement({
        type: 'BusinessRole',
        name: 'New Target',
        identifier: 'update-rel-new-target'
      });
      newTargetElementId = newTarget.id;

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'update-test-rel'
      });
      relationshipId = relationship.id;
    });

    it('should update relationship name', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('Serving');
    });

    it('should update relationship type', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        type: 'Access'
      });

      expect(updated.type).toBe('Access');
    });

    it('should update relationship documentation', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        documentation: 'Updated documentation'
      });

      expect(updated.documentation).toBe('Updated documentation');
    });

    it('should update relationship properties', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        properties: { 'newProp': 'newValue' }
      });

      expect(updated.properties).toEqual({ 'newProp': 'newValue' });
    });

    it('should update relationship source', async () => {
      const newSource = await manipulator.createElement({
        type: 'ApplicationService',
        name: 'New Source',
        identifier: 'update-rel-new-source'
      });

      const updated = await manipulator.updateRelationship(relationshipId, {
        sourceId: newSource.id
      });

      expect(updated.sourceId).toBe(newSource.id);

      // Check element references updated
      const oldSource = manipulator.getElement(sourceElementId);
      const newSourceElem = manipulator.getElement(newSource.id);
      const target = manipulator.getElement(targetElementId);

      expect(oldSource?.outgoingRelations).not.toContain(relationshipId);
      expect(newSourceElem?.outgoingRelations).toContain(relationshipId);
      expect(target?.incomingRelations).toContain(relationshipId);
    });

    it('should update relationship target', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        targetId: newTargetElementId
      });

      expect(updated.targetId).toBe(newTargetElementId);

      // Check element references updated
      const source = manipulator.getElement(sourceElementId);
      const oldTarget = manipulator.getElement(targetElementId);
      const newTarget = manipulator.getElement(newTargetElementId);

      expect(source?.outgoingRelations).toContain(relationshipId);
      expect(oldTarget?.incomingRelations).not.toContain(relationshipId);
      expect(newTarget?.incomingRelations).toContain(relationshipId);
    });

    it('should update multiple fields at once', async () => {
      const updated = await manipulator.updateRelationship(relationshipId, {
        name: 'Updated Name',
        type: 'Access',
        documentation: 'Updated docs',
        properties: { 'prop': 'value' }
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe('Access');
      expect(updated.documentation).toBe('Updated docs');
      expect(updated.properties).toEqual({ 'prop': 'value' });
    });

    it('should throw NotFoundError if relationship does not exist', async () => {
      await expect(manipulator.updateRelationship('nonexistent-id', {
        name: 'Test'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid relationship type', async () => {
      await expect(manipulator.updateRelationship(relationshipId, {
        type: 'InvalidType'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if new source element does not exist', async () => {
      await expect(manipulator.updateRelationship(relationshipId, {
        sourceId: 'nonexistent-source'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if new target element does not exist', async () => {
      await expect(manipulator.updateRelationship(relationshipId, {
        targetId: 'nonexistent-target'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if source and target are set to the same', async () => {
      await expect(manipulator.updateRelationship(relationshipId, {
        sourceId: sourceElementId,
        targetId: sourceElementId
      })).rejects.toThrow(ValidationError);
    });

    it('should mark model as modified after update', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      const source = await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'mod-update-source'
      });

      const target = await freshManipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'mod-update-target'
      });

      const rel = await freshManipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'mod-update-rel'
      });

      await freshManipulator.updateRelationship(rel.id, { name: 'Updated' });
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('deleteRelationship', () => {
    let relationshipId: string;
    let sourceElementId: string;
    let targetElementId: string;

    beforeEach(async () => {
      // Create elements and relationship
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'delete-rel-source'
      });
      sourceElementId = source.id;

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'delete-rel-target'
      });
      targetElementId = target.id;

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElementId,
        targetId: targetElementId,
        identifier: 'delete-test-rel'
      });
      relationshipId = relationship.id;
    });

    it('should delete relationship', async () => {
      await manipulator.deleteRelationship(relationshipId);

      const deleted = manipulator.getRelationship(relationshipId);
      expect(deleted).toBeNull();
    });

    it('should remove relationship from element references', async () => {
      await manipulator.deleteRelationship(relationshipId);

      const source = manipulator.getElement(sourceElementId);
      const target = manipulator.getElement(targetElementId);

      expect(source?.outgoingRelations).not.toContain(relationshipId);
      expect(target?.incomingRelations).not.toContain(relationshipId);
    });

    it('should throw NotFoundError if relationship does not exist', async () => {
      await expect(manipulator.deleteRelationship('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified after deletion', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      const source = await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'mod-delete-source'
      });

      const target = await freshManipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'mod-delete-target'
      });

      const rel = await freshManipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'mod-delete-rel'
      });

      await freshManipulator.deleteRelationship(rel.id);
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('getRelationship', () => {
    it('should return relationship by ID', async () => {
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'get-rel-source'
      });

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'get-rel-target'
      });

      const created = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'get-test-rel'
      });

      const retrieved = manipulator.getRelationship('get-test-rel');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('get-test-rel');
      expect(retrieved?.type).toBe('Serving');
    });

    it('should return null if relationship does not exist', () => {
      const retrieved = manipulator.getRelationship('nonexistent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Relationship Type Validation', () => {
    let sourceElementId: string;
    let targetElementId: string;

    beforeEach(async () => {
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'type-val-source'
      });
      sourceElementId = source.id;

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'type-val-target'
      });
      targetElementId = target.id;
    });

    it('should accept all valid ArchiMate 3.1 relationship types', async () => {
      const validTypes = [
        'Composition', 'Aggregation', 'Assignment', 'Realization', 'Serving',
        'Access', 'Influence', 'Association', 'Flow', 'Triggering',
        'Specialization', 'Junction'
      ];

      for (const type of validTypes) {
        const relationship = await manipulator.createRelationship({
          type,
          sourceId: sourceElementId,
          targetId: targetElementId,
          identifier: `test-${type.toLowerCase()}-rel`
        });
        expect(relationship.type).toBe(type);
      }
    });

    it('should reject invalid relationship types', async () => {
      const invalidTypes = ['InvalidType', 'NotARelationship', 'RandomString', ''];

      for (const type of invalidTypes) {
        if (type === '') {
          // Empty type is handled by required field validation
          continue;
        }
        await expect(manipulator.createRelationship({
          type,
          sourceId: sourceElementId,
          targetId: targetElementId
        })).rejects.toThrow(ValidationError);
      }
    });
  });
});
