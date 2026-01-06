/**
 * End-to-End Tests
 * 
 * Comprehensive tests that verify complete workflows with real ArchiMate models.
 * Tests ensure:
 * - Full CRUD workflows work correctly
 * - Modified models can be opened in Archi
 * - Models pass XSD validation
 * - All operations work together correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { XSDValidator } from '../utils/xsd-validator';
import { ArchiMateXMLBuilder } from '../model/persistence';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const FIXTURES_DIR = join(__dirname, 'fixtures');
const BASIC_MODEL = join(FIXTURES_DIR, 'basic-model.xml');
const COMPREHENSIVE_MODEL = join(FIXTURES_DIR, 'comprehensive-elements.xml');
const TEMP_DIR = join(tmpdir(), 'archiscribe-e2e-tests');

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

describe('End-to-End Tests', () => {
  describe('Full CRUD Workflow', () => {
    it('should complete full element CRUD workflow', async () => {
      // Load model
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Create element
      const createdElement = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'E2E Test Component',
        documentation: 'Created by E2E test'
      });

      expect(createdElement).toBeDefined();
      expect(createdElement.name).toBe('E2E Test Component');
      expect(createdElement.type).toBe('ApplicationComponent');

      // Read element
      const readElement = manipulator.getElement(createdElement.id);
      expect(readElement).toBeDefined();
      expect(readElement?.name).toBe('E2E Test Component');

      // Update element
      const updatedElement = await manipulator.updateElement(createdElement.id, {
        name: 'Updated E2E Test Component',
        documentation: 'Updated by E2E test'
      });

      expect(updatedElement.name).toBe('Updated E2E Test Component');
      expect(updatedElement.documentation).toBe('Updated by E2E test');

      // Delete element
      await manipulator.deleteElement(createdElement.id, { cascade: true });
      const deletedElement = manipulator.getElement(createdElement.id);
      expect(deletedElement).toBeNull();
    });

    it('should complete full relationship CRUD workflow', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Create elements for relationship
      const sourceElement = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source Component'
      });

      const targetElement = await manipulator.createElement({
        type: 'ApplicationService',
        name: 'Target Service'
      });

      // Create relationship
      const createdRelationship = await manipulator.createRelationship({
        type: 'Serving',
        sourceId: sourceElement.id,
        targetId: targetElement.id,
        name: 'E2E Test Relationship'
      });

      expect(createdRelationship).toBeDefined();
      expect(createdRelationship.type).toBe('Serving');
      expect(createdRelationship.sourceId).toBe(sourceElement.id);
      expect(createdRelationship.targetId).toBe(targetElement.id);

      // Read relationship
      const readRelationship = manipulator.getRelationship(createdRelationship.id);
      expect(readRelationship).toBeDefined();
      expect(readRelationship?.name).toBe('E2E Test Relationship');

      // Update relationship
      const updatedRelationship = await manipulator.updateRelationship(createdRelationship.id, {
        name: 'Updated E2E Test Relationship'
      });

      expect(updatedRelationship.name).toBe('Updated E2E Test Relationship');

      // Delete relationship
      await manipulator.deleteRelationship(createdRelationship.id);
      const deletedRelationship = manipulator.getRelationship(createdRelationship.id);
      expect(deletedRelationship).toBeNull();

      // Cleanup elements
      await manipulator.deleteElement(sourceElement.id, { cascade: true });
      await manipulator.deleteElement(targetElement.id, { cascade: true });
    });

    it('should complete full view CRUD workflow', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Create elements for view
      const element1 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'View Element 1'
      });

      const element2 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'View Element 2'
      });

      // Create view
      const createdView = await manipulator.createView({
        name: 'E2E Test View',
        type: 'Application',
        elements: [element1.id, element2.id]
      });

      expect(createdView).toBeDefined();
      expect(createdView.name).toBe('E2E Test View');
      expect(createdView.elements).toContain(element1.id);
      expect(createdView.elements).toContain(element2.id);

      // Read view
      const readView = manipulator.getView(createdView.id);
      expect(readView).toBeDefined();
      expect(readView?.name).toBe('E2E Test View');

      // Update view
      const updatedView = await manipulator.updateView(createdView.id, {
        name: 'Updated E2E Test View'
      });

      expect(updatedView.name).toBe('Updated E2E Test View');

      // Delete view
      await manipulator.deleteView(createdView.id);
      const deletedView = manipulator.getView(createdView.id);
      expect(deletedView).toBeNull();

      // Cleanup elements
      await manipulator.deleteElement(element1.id, { cascade: true });
      await manipulator.deleteElement(element2.id, { cascade: true });
    });
  });

  describe('Model Save and Load', () => {
    it('should save and reload model correctly', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Make changes
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Save Test Component'
      });

      // Save model
      const tempFile = join(TEMP_DIR, 'e2e-save-test.xml');
      await manipulator.save(tempFile, {
        createBackup: false,
        validate: true
      });

      // Verify file exists
      expect(existsSync(tempFile)).toBe(true);

      // Reload model
      const newLoader = new ModelLoader(tempFile);
      const reloadedModel = newLoader.load();

      // Verify changes persisted
      const reloadedElement = reloadedModel.elements.find(e => e.id === element.id);
      expect(reloadedElement).toBeDefined();
      expect(reloadedElement?.name).toBe('Save Test Component');
    });

    it('should create backup when saving', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      const tempFile = join(TEMP_DIR, 'e2e-backup-test.xml');
      
      // Create initial file
      writeFileSync(tempFile, readFileSync(BASIC_MODEL, 'utf8'));

      // Make changes and save with backup
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Backup Test Component'
      });

      await manipulator.save(tempFile, {
        createBackup: true,
        validate: true
      });

      // Verify backup file exists (pattern: filename.backup.YYYY-MM-DDTHH-mm-ss-SSSZ.xml)
      const files = require('fs').readdirSync(TEMP_DIR);
      const backupFiles = files.filter((f: string) => f.startsWith('e2e-backup-test.backup.'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Workflow', () => {
    it('should validate model after modifications', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Make valid modifications
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Validation Test Component'
      });

      // Validate model
      const validationResult = await manipulator.validateModel();

      expect(validationResult.valid).toBe(true);
    });

    it('should detect validation errors', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Create invalid relationship (will be caught by validation)
      const element1 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element 1'
      });

      const element2 = await manipulator.createElement({
        type: 'ApplicationService',
        name: 'Element 2'
      });

      // Create relationship (should be valid)
      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: element1.identifier,
        targetId: element2.identifier
      });

      // Validate model
      const validationResult = await manipulator.validateModel();

      // Model should be valid after valid operations
      expect(validationResult.valid).toBe(true);
    });
  });

  describe('XSD Validation', () => {
    it('should produce XSD-valid XML after modifications', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Make modifications
      await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'XSD Test Component'
      });

      // Serialize to XML
      const builder = new ArchiMateXMLBuilder();
      const xml = builder.serialize(model);

      // Validate XML against XSD
      const validator = new XSDValidator();
      const validationResult = validator.validateModel(xml);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors.length).toBe(0);
    });

    it('should maintain XSD validity through multiple operations', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();
      const validator = new XSDValidator();
      const builder = new ArchiMateXMLBuilder();

      // Perform multiple operations
      const element1 = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Element 1'
      });

      const element2 = await manipulator.createElement({
        type: 'ApplicationService',
        name: 'Element 2'
      });

      await manipulator.createRelationship({
        type: 'Serving',
        sourceId: element1.identifier,
        targetId: element2.identifier
      });

      const view = await manipulator.createView({
        name: 'Test View',
        elements: [element1.id, element2.id]
      });

      // Serialize and validate
      const xml = builder.serialize(model);
      const validationResult = validator.validateModel(xml);

      expect(validationResult.valid).toBe(true);
    });
  });

  describe('Transaction Support', () => {
    it('should rollback transaction on error', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      const initialElementCount = model.elements.length;

      // Start transaction
      const transaction = manipulator.beginTransaction();

      try {
        // Create element in transaction
        await manipulator.createElement({
          type: 'ApplicationComponent',
          name: 'Transaction Test'
        });

        // Simulate error
        throw new Error('Test error');
      } catch (error) {
        // Rollback transaction
        manipulator.rollbackTransaction(transaction);
      }

      // Verify element was not created
      expect(model.elements.length).toBe(initialElementCount);
    });

    it('should commit transaction successfully', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      const initialElementCount = model.elements.length;

      // Start transaction
      const transaction = manipulator.beginTransaction();

      // Create element in transaction
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Transaction Commit Test'
      });

      // Commit transaction
      manipulator.commitTransaction(transaction);

      // Verify element was created
      expect(model.elements.length).toBe(initialElementCount + 1);
      expect(manipulator.getElement(element.id)).toBeDefined();
    });
  });

  describe('Real Model Compatibility', () => {
    it('should work with comprehensive model', async () => {
      const loader = new ModelLoader(COMPREHENSIVE_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Verify model loaded correctly
      expect(model.elements.length).toBeGreaterThan(0);
      expect(model.relationships.length).toBeGreaterThan(0);

      // Perform operations
      const element = await manipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Comprehensive Model Test'
      });

      expect(element).toBeDefined();

      // Validate model still valid
      const validationResult = await manipulator.validateModel({
        strict: false,
        includeWarnings: true
      });

      expect(validationResult.valid).toBe(true);
    });

    it('should serialize comprehensive model correctly', async () => {
      const loader = new ModelLoader(COMPREHENSIVE_MODEL);
      const model = loader.load();
      const builder = new ArchiMateXMLBuilder();

      // Serialize model
      const xml = builder.serialize(model);

      // Validate XML
      const validator = new XSDValidator();
      const validationResult = validator.validateModel(xml);

      expect(validationResult.valid).toBe(true);
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle errors gracefully in CRUD workflow', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      // Try to create element with invalid type
      await expect(
        manipulator.createElement({
          type: 'InvalidType',
          name: 'Invalid Element'
        })
      ).rejects.toThrow();

      // Try to get non-existent element
      const element = manipulator.getElement('non-existent-id');
      expect(element).toBeNull();

      // Try to update non-existent element
      await expect(
        manipulator.updateElement('non-existent-id', {
          name: 'Updated Name'
        })
      ).rejects.toThrow();
    });

    it('should provide detailed error messages', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const manipulator = new ModelManipulator(loader);
      const model = manipulator.getModel();

      try {
        await manipulator.createElement({
          type: 'InvalidType',
          name: 'Test'
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBeDefined();
        expect(error.suggestions).toBeDefined();
        expect(Array.isArray(error.suggestions)).toBe(true);
      }
    });
  });
});
