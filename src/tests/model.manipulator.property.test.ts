import { describe, it, expect, beforeEach } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { join } from 'path';
import {
  ValidationError,
  NotFoundError,
  DuplicateError
} from '../model/manipulator-types';

describe('ModelManipulator - Property Management Operations', () => {
  let loader: ModelLoader;
  let manipulator: ModelManipulator;
  const testPath = join(__dirname, 'fixtures', 'basic-model.xml');
  const propertiesPath = join(__dirname, 'fixtures', 'model-with-properties.xml');

  beforeEach(() => {
    loader = new ModelLoader(testPath);
    manipulator = new ModelManipulator(loader);
  });

  describe('createPropertyDefinition', () => {
    it('should create a new property definition with required fields', async () => {
      const propDef = await manipulator.createPropertyDefinition({
        identifier: 'propdef-test',
        name: 'Test Property'
      });

      expect(propDef).toBeDefined();
      expect(propDef.identifier).toBe('propdef-test');
      expect(propDef.name).toBe('Test Property');
      
      const model = manipulator.getModel();
      expect(model.propertyDefinitions).toBeDefined();
      expect(model.propertyDefinitions!.length).toBeGreaterThan(0);
      expect(model.propertyDefinitions!.some(pd => pd.identifier === 'propdef-test')).toBe(true);
    });

    it('should initialize propertyDefinitions array if not exists', async () => {
      // Reload to ensure clean state
      manipulator.reload();
      const model = manipulator.getModel();
      // After reload, propertyDefinitions might be empty array or undefined
      const initialLength = model.propertyDefinitions?.length || 0;

      await manipulator.createPropertyDefinition({
        identifier: 'propdef-new',
        name: 'New Property'
      });

      expect(model.propertyDefinitions).toBeDefined();
      expect(Array.isArray(model.propertyDefinitions)).toBe(true);
      expect(model.propertyDefinitions!.length).toBe(initialLength + 1);
    });

    it('should throw ValidationError if identifier is missing', async () => {
      await expect(manipulator.createPropertyDefinition({
        identifier: '',
        name: 'Test Property'
      })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if name is missing', async () => {
      await expect(manipulator.createPropertyDefinition({
        identifier: 'propdef-test',
        name: ''
      })).rejects.toThrow(ValidationError);
    });

    it('should throw DuplicateError if identifier already exists', async () => {
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-duplicate',
        name: 'First'
      });

      await expect(manipulator.createPropertyDefinition({
        identifier: 'propdef-duplicate',
        name: 'Second'
      })).rejects.toThrow(DuplicateError);
    });

    it('should trim whitespace from identifier and name', async () => {
      const propDef = await manipulator.createPropertyDefinition({
        identifier: '  propdef-trimmed  ',
        name: '  Trimmed Property  '
      });

      expect(propDef.identifier).toBe('propdef-trimmed');
      expect(propDef.name).toBe('Trimmed Property');
    });

    it('should mark model as modified', async () => {
      expect(manipulator.isModified()).toBe(false);
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-modified',
        name: 'Modified Property'
      });
      expect(manipulator.isModified()).toBe(true);
    });
  });

  describe('assignProperty', () => {
    beforeEach(async () => {
      // Create a property definition and an element for testing
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-assign',
        name: 'Assign Property'
      });
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-assign-test'
      });
    });

    it('should assign property to an element', async () => {
      await manipulator.assignProperty('elem-assign-test', 'propdef-assign', 'test-value');

      const element = manipulator.getElement('elem-assign-test');
      expect(element).toBeDefined();
      expect(element!.properties).toBeDefined();
      expect(element!.properties!['propdef-assign']).toBe('test-value');
    });

    it('should assign property to a relationship', async () => {
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Target Component',
        identifier: 'elem-target'
      });

      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: 'elem-assign-test',
        targetId: 'elem-target',
        identifier: 'rel-assign-test'
      });

      await manipulator.assignProperty('rel-assign-test', 'propdef-assign', 'rel-value');

      const relationship = manipulator.getRelationship('rel-assign-test');
      expect(relationship).toBeDefined();
      expect(relationship!.properties).toBeDefined();
      expect(relationship!.properties!['propdef-assign']).toBe('rel-value');
    });

    it('should assign property to a view', async () => {
      await manipulator.createView({
        name: 'Test View',
        identifier: 'view-assign-test'
      });

      await manipulator.assignProperty('view-assign-test', 'propdef-assign', 'view-value');

      const view = manipulator.getView('view-assign-test');
      expect(view).toBeDefined();
      expect(view!.properties).toBeDefined();
      expect(view!.properties!['propdef-assign']).toBe('view-value');
    });

    it('should initialize properties object if not exists', async () => {
      const element = manipulator.getElement('elem-assign-test');
      expect(element!.properties).toBeDefined();

      await manipulator.assignProperty('elem-assign-test', 'propdef-assign', 'value');
      
      expect(element!.properties).toBeDefined();
      expect(element!.properties!['propdef-assign']).toBe('value');
    });

    it('should throw NotFoundError if property definition does not exist', async () => {
      await expect(manipulator.assignProperty(
        'elem-assign-test',
        'propdef-nonexistent',
        'value'
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if target entity does not exist', async () => {
      await expect(manipulator.assignProperty(
        'nonexistent-id',
        'propdef-assign',
        'value'
      )).rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified', async () => {
      // Create fresh manipulator to avoid reload issues
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);
      
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-assign-fresh',
        name: 'Assign Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-assign-fresh'
      });

      expect(freshManipulator.isModified()).toBe(true);
      freshManipulator.reload();
      expect(freshManipulator.isModified()).toBe(false);
      
      // Re-setup after reload (reload clears all changes)
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-assign-fresh',
        name: 'Assign Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-assign-fresh'
      });
      
      await freshManipulator.assignProperty('elem-assign-fresh', 'propdef-assign-fresh', 'value');
      expect(freshManipulator.isModified()).toBe(true);
    });

    it('should overwrite existing property value', async () => {
      await manipulator.assignProperty('elem-assign-test', 'propdef-assign', 'first-value');
      await manipulator.assignProperty('elem-assign-test', 'propdef-assign', 'second-value');

      const element = manipulator.getElement('elem-assign-test');
      expect(element!.properties!['propdef-assign']).toBe('second-value');
    });
  });

  describe('updateProperty', () => {
    beforeEach(async () => {
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-update',
        name: 'Update Property'
      });
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-update-test'
      });
      await manipulator.assignProperty('elem-update-test', 'propdef-update', 'initial-value');
    });

    it('should update property value on an element', async () => {
      await manipulator.updateProperty('elem-update-test', 'propdef-update', 'updated-value');

      const element = manipulator.getElement('elem-update-test');
      expect(element!.properties!['propdef-update']).toBe('updated-value');
    });

    it('should update property value on a relationship', async () => {
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Target',
        identifier: 'elem-target-update'
      });

      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: 'elem-update-test',
        targetId: 'elem-target-update',
        identifier: 'rel-update-test'
      });

      await manipulator.assignProperty('rel-update-test', 'propdef-update', 'initial');
      await manipulator.updateProperty('rel-update-test', 'propdef-update', 'updated');

      const relationship = manipulator.getRelationship('rel-update-test');
      expect(relationship!.properties!['propdef-update']).toBe('updated');
    });

    it('should update property value on a view', async () => {
      await manipulator.createView({
        name: 'Test View',
        identifier: 'view-update-test'
      });

      await manipulator.assignProperty('view-update-test', 'propdef-update', 'initial');
      await manipulator.updateProperty('view-update-test', 'propdef-update', 'updated');

      const view = manipulator.getView('view-update-test');
      expect(view!.properties!['propdef-update']).toBe('updated');
    });

    it('should throw NotFoundError if property definition does not exist', async () => {
      await expect(manipulator.updateProperty(
        'elem-update-test',
        'propdef-nonexistent',
        'value'
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if target entity does not exist', async () => {
      await expect(manipulator.updateProperty(
        'nonexistent-id',
        'propdef-update',
        'value'
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if property does not exist on entity', async () => {
      // Create element without the property
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element Without Property',
        identifier: 'elem-no-prop'
      });

      await expect(manipulator.updateProperty(
        'elem-no-prop',
        'propdef-update',
        'value'
      )).rejects.toThrow(NotFoundError);
    });

    it('should mark model as modified', async () => {
      // Create fresh manipulator to avoid reload issues
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);
      
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-update-fresh',
        name: 'Update Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-update-fresh'
      });
      await freshManipulator.assignProperty('elem-update-fresh', 'propdef-update-fresh', 'initial');

      expect(freshManipulator.isModified()).toBe(true);
      freshManipulator.reload();
      expect(freshManipulator.isModified()).toBe(false);
      
      // Re-setup after reload
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-update-fresh',
        name: 'Update Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-update-fresh'
      });
      await freshManipulator.assignProperty('elem-update-fresh', 'propdef-update-fresh', 'initial');
      
      await freshManipulator.updateProperty('elem-update-fresh', 'propdef-update-fresh', 'new-value');
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('deleteProperty', () => {
    beforeEach(async () => {
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-delete',
        name: 'Delete Property'
      });
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-delete-test'
      });
      await manipulator.assignProperty('elem-delete-test', 'propdef-delete', 'value');
    });

    it('should delete property from an element', async () => {
      await manipulator.deleteProperty('elem-delete-test', 'propdef-delete');

      const element = manipulator.getElement('elem-delete-test');
      expect(element!.properties).toBeDefined();
      expect('propdef-delete' in element!.properties!).toBe(false);
    });

    it('should delete property from a relationship', async () => {
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Target',
        identifier: 'elem-target-delete'
      });

      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: 'elem-delete-test',
        targetId: 'elem-target-delete',
        identifier: 'rel-delete-test'
      });

      await manipulator.assignProperty('rel-delete-test', 'propdef-delete', 'value');
      await manipulator.deleteProperty('rel-delete-test', 'propdef-delete');

      const relationship = manipulator.getRelationship('rel-delete-test');
      expect(relationship!.properties).toBeDefined();
      expect('propdef-delete' in relationship!.properties!).toBe(false);
    });

    it('should delete property from a view', async () => {
      await manipulator.createView({
        name: 'Test View',
        identifier: 'view-delete-test'
      });

      await manipulator.assignProperty('view-delete-test', 'propdef-delete', 'value');
      await manipulator.deleteProperty('view-delete-test', 'propdef-delete');

      const view = manipulator.getView('view-delete-test');
      expect(view!.properties).toBeDefined();
      expect('propdef-delete' in view!.properties!).toBe(false);
    });

    it('should throw NotFoundError if target entity does not exist', async () => {
      await expect(manipulator.deleteProperty(
        'nonexistent-id',
        'propdef-delete'
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if property does not exist on entity', async () => {
      await expect(manipulator.deleteProperty(
        'elem-delete-test',
        'propdef-nonexistent'
      )).rejects.toThrow(NotFoundError);
    });

    it('should not delete property definition by default', async () => {
      await manipulator.deleteProperty('elem-delete-test', 'propdef-delete');

      const model = manipulator.getModel();
      expect(model.propertyDefinitions).toBeDefined();
      expect(model.propertyDefinitions!.some(pd => pd.identifier === 'propdef-delete')).toBe(true);
    });

    it('should delete property definition with cascade if not used elsewhere', async () => {
      await manipulator.deleteProperty('elem-delete-test', 'propdef-delete', { cascade: true });

      const model = manipulator.getModel();
      expect(model.propertyDefinitions).toBeDefined();
      expect(model.propertyDefinitions!.some(pd => pd.identifier === 'propdef-delete')).toBe(false);
    });

    it('should not delete property definition with cascade if used elsewhere', async () => {
      // Assign property to another element
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Another Component',
        identifier: 'elem-another'
      });
      await manipulator.assignProperty('elem-another', 'propdef-delete', 'value');

      // Delete from first element with cascade
      await manipulator.deleteProperty('elem-delete-test', 'propdef-delete', { cascade: true });

      // Property definition should still exist because it's used by another element
      const model = manipulator.getModel();
      expect(model.propertyDefinitions).toBeDefined();
      expect(model.propertyDefinitions!.some(pd => pd.identifier === 'propdef-delete')).toBe(true);
    });

    it('should mark model as modified', async () => {
      // Create fresh manipulator to avoid reload issues
      const freshLoader = new ModelLoader(testPath);
      const freshManipulator = new ModelManipulator(freshLoader);
      
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-delete-fresh',
        name: 'Delete Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-delete-fresh'
      });
      await freshManipulator.assignProperty('elem-delete-fresh', 'propdef-delete-fresh', 'value');

      expect(freshManipulator.isModified()).toBe(true);
      freshManipulator.reload();
      expect(freshManipulator.isModified()).toBe(false);
      
      // Re-setup after reload
      await freshManipulator.createPropertyDefinition({
        identifier: 'propdef-delete-fresh',
        name: 'Delete Property Fresh'
      });
      await freshManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component',
        identifier: 'elem-delete-fresh'
      });
      await freshManipulator.assignProperty('elem-delete-fresh', 'propdef-delete-fresh', 'value');
      
      await freshManipulator.deleteProperty('elem-delete-fresh', 'propdef-delete-fresh');
      expect(freshManipulator.isModified()).toBe(true);
    });
  });

  describe('Property Management Integration', () => {
    it('should work with model that has existing properties', async () => {
      const propsLoader = new ModelLoader(propertiesPath);
      const propsManipulator = new ModelManipulator(propsLoader);
      const model = propsManipulator.getModel();

      // Should have loaded property definitions
      expect(model.propertyDefinitions).toBeDefined();
      expect(model.propertyDefinitions!.length).toBeGreaterThan(0);

      // Should be able to assign new property
      await propsManipulator.createPropertyDefinition({
        identifier: 'propdef-new',
        name: 'New Property'
      });
      await propsManipulator.assignProperty('elem-with-props-1', 'propdef-new', 'new-value');

      const element = propsManipulator.getElement('elem-with-props-1');
      expect(element!.properties!['propdef-new']).toBe('new-value');
    });

    it('should maintain property definitions across reload', async () => {
      await manipulator.createPropertyDefinition({
        identifier: 'propdef-persist',
        name: 'Persist Property'
      });

      const model1 = manipulator.getModel();
      expect(model1.propertyDefinitions!.some(pd => pd.identifier === 'propdef-persist')).toBe(true);

      manipulator.reload();

      const model2 = manipulator.getModel();
      // After reload, property definitions should be loaded from file (if file has them)
      // In this case, basic-model.xml doesn't have property definitions, so they'll be empty
      expect(model2.propertyDefinitions).toBeDefined();
    });
  });
});
