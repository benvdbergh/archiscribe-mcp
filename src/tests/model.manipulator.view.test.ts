import { describe, it, expect, beforeEach } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { join } from 'path';
import {
  ValidationError,
  NotFoundError,
  DuplicateError
} from '../model/manipulator-types';

describe('ModelManipulator - View CRUD Operations', () => {
  let loader: ModelLoader;
  let manipulator: ModelManipulator;
  const testPath = join(__dirname, 'fixtures', 'basic-model.xml');

  beforeEach(() => {
    loader = new ModelLoader(testPath);
    manipulator = new ModelManipulator(loader);
  });

  describe('createView', () => {
    it('should create a new view with required fields', async () => {
      const view = await manipulator.createView({
        name: 'Test View'
      });

      expect(view).toBeDefined();
      expect(view.id).toBeDefined();
      expect(view.name).toBe('Test View');
      expect(view.elements).toEqual([]);
      expect(view.relationships).toEqual([]);
      expect(view.properties).toBeDefined();
    });

    it('should create view with custom identifier', async () => {
      const view = await manipulator.createView({
        name: 'Custom View',
        identifier: 'custom-view-id'
      });

      expect(view.id).toBe('custom-view-id');
    });

    it('should auto-generate identifier if not provided', async () => {
      const view = await manipulator.createView({
        name: 'Test View'
      });

      expect(view.id).toBeDefined();
      expect(view.id).toMatch(/^view-/);
    });

    it('should create view with optional fields', async () => {
      const view = await manipulator.createView({
        name: 'Test View',
        type: 'Diagram',
        viewpoint: 'ApplicationCooperation',
        documentation: 'Test documentation',
        properties: { 'prop1': 'value1' }
      });

      expect(view.type).toBe('Diagram');
      expect(view.viewpoint).toBe('ApplicationCooperation');
      expect(view.documentation).toBe('Test documentation');
      expect(view.properties).toEqual({ 'prop1': 'value1' });
    });

    it('should create view with elements', async () => {
      const element1 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element 1',
        identifier: 'view-elem-1'
      });

      const element2 = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Element 2',
        identifier: 'view-elem-2'
      });

      const view = await manipulator.createView({
        name: 'View with Elements',
        elements: [element1.id, element2.id]
      });

      expect(view.elements).toContain(element1.id);
      expect(view.elements).toContain(element2.id);
      expect(manipulator.getElement(element1.id)?.inViews).toContain(view.id);
      expect(manipulator.getElement(element2.id)?.inViews).toContain(view.id);
    });

    it('should create view with relationships', async () => {
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'view-rel-source'
      });

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'view-rel-target'
      });

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'view-rel-1'
      });

      const view = await manipulator.createView({
        name: 'View with Relationships',
        relationships: [relationship.id]
      });

      expect(view.relationships).toContain(relationship.id);
    });

    it('should create view with node hierarchy', async () => {
      const parent = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Parent',
        identifier: 'view-parent-1'
      });

      const child = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Child',
        identifier: 'view-child-1'
      });

      const view = await manipulator.createView({
        name: 'View with Hierarchy',
        nodeHierarchy: [{ parentElement: parent.id, childElement: child.id }]
      });

      expect(view.nodeHierarchy).toHaveLength(1);
      expect(view.nodeHierarchy![0].parentElement).toBe(parent.id);
      expect(view.nodeHierarchy![0].childElement).toBe(child.id);
    });

    it('should throw ValidationError if name is missing', async () => {
      await expect(manipulator.createView({
        name: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if element in elements array does not exist', async () => {
      await expect(manipulator.createView({
        name: 'Test View',
        elements: ['nonexistent-element']
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if relationship in relationships array does not exist', async () => {
      await expect(manipulator.createView({
        name: 'Test View',
        relationships: ['nonexistent-relationship']
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if element in node hierarchy does not exist', async () => {
      await expect(manipulator.createView({
        name: 'Test View',
        nodeHierarchy: [{ parentElement: 'nonexistent-parent', childElement: 'nonexistent-child' }]
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw DuplicateError if identifier already exists', async () => {
      await manipulator.createView({
        name: 'First View',
        identifier: 'duplicate-view-id'
      });

      await expect(manipulator.createView({
        name: 'Second View',
        identifier: 'duplicate-view-id'
      })).rejects.toThrow(DuplicateError);
    });

    it('should mark model as modified after creation', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      await freshManipulator.createView({
        name: 'Test View'
      });

      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('updateView', () => {
    let viewId: string;

    beforeEach(async () => {
      const view = await manipulator.createView({
        name: 'Original Name',
        identifier: 'update-test-view'
      });
      viewId = view.id;
    });

    it('should update view name', async () => {
      const updated = await manipulator.updateView(viewId, {
        name: 'Updated Name'
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should update view type', async () => {
      const updated = await manipulator.updateView(viewId, {
        type: 'Diagram'
      });

      expect(updated.type).toBe('Diagram');
    });

    it('should update view viewpoint', async () => {
      const updated = await manipulator.updateView(viewId, {
        viewpoint: 'ApplicationCooperation'
      });

      expect(updated.viewpoint).toBe('ApplicationCooperation');
    });

    it('should update view documentation', async () => {
      const updated = await manipulator.updateView(viewId, {
        documentation: 'Updated documentation'
      });

      expect(updated.documentation).toBe('Updated documentation');
    });

    it('should update view properties', async () => {
      const updated = await manipulator.updateView(viewId, {
        properties: { 'newProp': 'newValue' }
      });

      expect(updated.properties).toEqual({ 'newProp': 'newValue' });
    });

    it('should update view elements', async () => {
      const element1 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element 1',
        identifier: 'update-view-elem-1'
      });

      const element2 = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Element 2',
        identifier: 'update-view-elem-2'
      });

      const updated = await manipulator.updateView(viewId, {
        elements: [element1.id, element2.id]
      });

      expect(updated.elements).toContain(element1.id);
      expect(updated.elements).toContain(element2.id);
      expect(manipulator.getElement(element1.id)?.inViews).toContain(viewId);
      expect(manipulator.getElement(element2.id)?.inViews).toContain(viewId);
    });

    it('should update view relationships', async () => {
      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'update-view-rel-source'
      });

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'update-view-rel-target'
      });

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'update-view-rel-1'
      });

      const updated = await manipulator.updateView(viewId, {
        relationships: [relationship.id]
      });

      expect(updated.relationships).toContain(relationship.id);
    });

    it('should update view node hierarchy', async () => {
      const parent = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Parent',
        identifier: 'update-view-parent-1'
      });

      const child = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Child',
        identifier: 'update-view-child-1'
      });

      const updated = await manipulator.updateView(viewId, {
        nodeHierarchy: [{ parentElement: parent.id, childElement: child.id }]
      });

      expect(updated.nodeHierarchy).toHaveLength(1);
      expect(updated.nodeHierarchy![0].parentElement).toBe(parent.id);
      expect(updated.nodeHierarchy![0].childElement).toBe(child.id);
    });

    it('should remove element references when elements are updated', async () => {
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element',
        identifier: 'update-view-remove-elem'
      });

      // Add element to view
      await manipulator.updateView(viewId, {
        elements: [element.id]
      });

      expect(manipulator.getElement(element.id)?.inViews).toContain(viewId);

      // Remove element from view
      await manipulator.updateView(viewId, {
        elements: []
      });

      expect(manipulator.getElement(element.id)?.inViews).not.toContain(viewId);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.updateView('nonexistent-id', {
        name: 'Test'
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if name is set to empty', async () => {
      await expect(manipulator.updateView(viewId, {
        name: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if element in elements array does not exist', async () => {
      await expect(manipulator.updateView(viewId, {
        elements: ['nonexistent-element']
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if relationship in relationships array does not exist', async () => {
      await expect(manipulator.updateView(viewId, {
        relationships: ['nonexistent-relationship']
      })).rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified after update', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      const view = await freshManipulator.createView({
        name: 'Test View',
        identifier: 'mod-update-view'
      });

      await freshManipulator.updateView(view.id, { name: 'Updated' });
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('deleteView', () => {
    let viewId: string;
    let elementId: string;

    beforeEach(async () => {
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element',
        identifier: 'delete-view-elem'
      });
      elementId = element.id;

      const view = await manipulator.createView({
        name: 'To Delete',
        identifier: 'delete-test-view',
        elements: [elementId]
      });
      viewId = view.id;
    });

    it('should delete view', async () => {
      await manipulator.deleteView(viewId);

      const deleted = manipulator.getView(viewId);
      expect(deleted).toBeNull();
    });

    it('should remove view reference from elements', async () => {
      await manipulator.deleteView(viewId);

      const element = manipulator.getElement(elementId);
      expect(element?.inViews).not.toContain(viewId);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.deleteView('nonexistent-id'))
        .rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified after deletion', async () => {
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);

      const view = await freshManipulator.createView({
        name: 'Test View',
        identifier: 'mod-delete-view'
      });

      await freshManipulator.deleteView(view.id);
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('addElementToView', () => {
    let viewId: string;
    let elementId: string;

    beforeEach(async () => {
      const view = await manipulator.createView({
        name: 'Test View',
        identifier: 'add-elem-view'
      });
      viewId = view.id;

      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element',
        identifier: 'add-elem-test'
      });
      elementId = element.id;
    });

    it('should add element to view', async () => {
      await manipulator.addElementToView(viewId, elementId);

      const view = manipulator.getView(viewId);
      expect(view?.elements).toContain(elementId);

      const element = manipulator.getElement(elementId);
      expect(element?.inViews).toContain(viewId);
    });

    it('should add element with parent to view hierarchy', async () => {
      const parent = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Parent',
        identifier: 'add-elem-parent'
      });

      await manipulator.addElementToView(viewId, elementId, parent.id);

      const view = manipulator.getView(viewId);
      expect(view?.elements).toContain(elementId);
      expect(view?.elements).toContain(parent.id);
      expect(view?.nodeHierarchy).toContainEqual({ parentElement: parent.id, childElement: elementId });
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.addElementToView('nonexistent-view', elementId))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if element does not exist', async () => {
      await expect(manipulator.addElementToView(viewId, 'nonexistent-element'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if parent element does not exist', async () => {
      await expect(manipulator.addElementToView(viewId, elementId, 'nonexistent-parent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('removeElementFromView', () => {
    let viewId: string;
    let elementId: string;
    let relationshipId: string;

    beforeEach(async () => {
      const view = await manipulator.createView({
        name: 'Test View',
        identifier: 'remove-elem-view'
      });
      viewId = view.id;

      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'remove-elem-source'
      });

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'remove-elem-target'
      });
      elementId = target.id;

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'remove-elem-rel'
      });
      relationshipId = relationship.id;

      await manipulator.addElementToView(viewId, source.id);
      await manipulator.addElementToView(viewId, target.id);
      await manipulator.addRelationshipToView(viewId, relationshipId);
    });

    it('should remove element from view', async () => {
      await manipulator.removeElementFromView(viewId, elementId);

      const view = manipulator.getView(viewId);
      expect(view?.elements).not.toContain(elementId);

      const element = manipulator.getElement(elementId);
      expect(element?.inViews).not.toContain(viewId);
    });

    it('should remove relationships connected to element', async () => {
      await manipulator.removeElementFromView(viewId, elementId);

      const view = manipulator.getView(viewId);
      expect(view?.relationships).not.toContain(relationshipId);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.removeElementFromView('nonexistent-view', elementId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('addRelationshipToView', () => {
    let viewId: string;
    let sourceId: string;
    let targetId: string;
    let relationshipId: string;

    beforeEach(async () => {
      const view = await manipulator.createView({
        name: 'Test View',
        identifier: 'add-rel-view'
      });
      viewId = view.id;

      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'add-rel-source'
      });
      sourceId = source.id;

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'add-rel-target'
      });
      targetId = target.id;

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceId,
        targetId: targetId,
        identifier: 'add-rel-test'
      });
      relationshipId = relationship.id;
    });

    it('should add relationship to view', async () => {
      await manipulator.addRelationshipToView(viewId, relationshipId);

      const view = manipulator.getView(viewId);
      expect(view?.relationships).toContain(relationshipId);
    });

    it('should add source and target elements to view', async () => {
      await manipulator.addRelationshipToView(viewId, relationshipId);

      const view = manipulator.getView(viewId);
      expect(view?.elements).toContain(sourceId);
      expect(view?.elements).toContain(targetId);

      const source = manipulator.getElement(sourceId);
      const target = manipulator.getElement(targetId);
      expect(source?.inViews).toContain(viewId);
      expect(target?.inViews).toContain(viewId);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.addRelationshipToView('nonexistent-view', relationshipId))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if relationship does not exist', async () => {
      await expect(manipulator.addRelationshipToView(viewId, 'nonexistent-relationship'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('removeRelationshipFromView', () => {
    let viewId: string;
    let relationshipId: string;

    beforeEach(async () => {
      const view = await manipulator.createView({
        name: 'Test View',
        identifier: 'remove-rel-view'
      });
      viewId = view.id;

      const source = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source',
        identifier: 'remove-rel-source'
      });

      const target = await manipulator.createElement({
        type: 'BusinessActor',
        name: 'Target',
        identifier: 'remove-rel-target'
      });

      const relationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        identifier: 'remove-rel-test'
      });
      relationshipId = relationship.id;

      await manipulator.addRelationshipToView(viewId, relationshipId);
    });

    it('should remove relationship from view', async () => {
      await manipulator.removeRelationshipFromView(viewId, relationshipId);

      const view = manipulator.getView(viewId);
      expect(view?.relationships).not.toContain(relationshipId);
    });

    it('should throw NotFoundError if view does not exist', async () => {
      await expect(manipulator.removeRelationshipFromView('nonexistent-view', relationshipId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getView', () => {
    it('should return view by ID', async () => {
      const created = await manipulator.createView({
        name: 'Test View',
        identifier: 'get-test-view'
      });

      const retrieved = manipulator.getView('get-test-view');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('get-test-view');
      expect(retrieved?.name).toBe('Test View');
    });

    it('should return null if view does not exist', () => {
      const retrieved = manipulator.getView('nonexistent-id');
      expect(retrieved).toBeNull();
    });
  });
});
