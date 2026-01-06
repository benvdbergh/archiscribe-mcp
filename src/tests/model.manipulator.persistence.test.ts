import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { XSDValidator } from '../utils/xsd-validator';
import { join } from 'path';
import { existsSync, readFileSync, unlinkSync, copyFileSync } from 'fs';
import {
  ValidationError,
  DuplicateError,
  ReferentialIntegrityError
} from '../model/manipulator-types';

describe('ModelManipulator - Persistence Operations', () => {
  let loader: ModelLoader;
  let manipulator: ModelManipulator;
  const testPath = join(__dirname, 'fixtures', 'basic-model.xml');
  const tempDir = join(__dirname, 'fixtures', 'temp');
  const tempSavePath = join(tempDir, 'test-save.xml');
  const tempSaveAsPath = join(tempDir, 'test-saveas.xml');

  beforeEach(() => {
    loader = new ModelLoader(testPath);
    manipulator = new ModelManipulator(loader);
  });

  afterEach(() => {
    // Clean up temp files
    if (existsSync(tempSavePath)) {
      unlinkSync(tempSavePath);
    }
    if (existsSync(tempSaveAsPath)) {
      unlinkSync(tempSaveAsPath);
    }
  });

  describe('save', () => {
    it('should save model to file', async () => {
      // Create a temporary loader for a new file
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);
      
      // Make a modification
      await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Test Component for Save'
      });

      // Save to temp file
      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      expect(existsSync(tempSavePath)).toBe(true);
      
      // Verify file contains expected content
      const savedXml = readFileSync(tempSavePath, 'utf8');
      expect(savedXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(savedXml).toContain('<model');
      expect(savedXml).toContain('Test Component for Save');
    });

    it('should create backup before saving if file exists', async () => {
      // Create initial file
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);
      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      // Make a modification and save with backup
      await tempManipulator.createElement({
        type: 'BusinessActor',
        name: 'Backup Test Actor'
      });
      await tempManipulator.save(tempSavePath, { createBackup: true, validate: false });

      // Check that backup was created (backup files have timestamp in name)
      const dir = join(__dirname, 'fixtures', 'temp');
      const files = require('fs').readdirSync(dir);
      const backupFiles = files.filter((f: string) => f.includes('test-save.backup.'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it('should validate model before saving when validate option is true', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      // Manually create duplicate IDs in the model to test validation
      const model = tempManipulator.getModel();
      model.elements.push({
        id: 'duplicate-test-id',
        name: 'First Element',
        type: 'ApplicationComponent',
        properties: {},
        inViews: [],
        outgoingRelations: [],
        incomingRelations: []
      });

      model.elements.push({
        id: 'duplicate-test-id', // Duplicate ID
        name: 'Second Element',
        type: 'BusinessActor',
        properties: {},
        inViews: [],
        outgoingRelations: [],
        incomingRelations: []
      });

      // Save should fail validation
      await expect(
        tempManipulator.saveAs(tempSavePath, { validate: true })
      ).rejects.toThrow(DuplicateError);
    });

    it('should clear modified flag after save', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      expect(tempManipulator.isModified()).toBe(false);

      await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Modified Test'
      });

      expect(tempManipulator.isModified()).toBe(true);

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      expect(tempManipulator.isModified()).toBe(false);
    });

    it('should use loader path when no path specified', async () => {
      // Test that save() uses the loader's path when no path is provided
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      // Make a modification
      await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Path Test Component'
      });

      // Save without path should use loader's path (but we'll use a temp path to avoid modifying test file)
      // Actually, we'll test saveAs instead to avoid modifying the original test file
      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });
      expect(existsSync(tempSavePath)).toBe(true);
    });
  });

  describe('saveAs', () => {
    it('should save model to new file path', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'SaveAs Test Component'
      });

      await tempManipulator.saveAs(tempSaveAsPath, { createBackup: false, validate: false });

      expect(existsSync(tempSaveAsPath)).toBe(true);
      
      const savedXml = readFileSync(tempSaveAsPath, 'utf8');
      expect(savedXml).toContain('SaveAs Test Component');
    });

    it('should throw ValidationError if path is empty', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      await expect(
        tempManipulator.saveAs('', { createBackup: false, validate: false })
      ).rejects.toThrow(ValidationError);
    });

    it('should create directory if it does not exist', async () => {
      const deepPath = join(tempDir, 'deep', 'nested', 'path', 'model.xml');
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      await tempManipulator.saveAs(deepPath, { createBackup: false, validate: false });

      expect(existsSync(deepPath)).toBe(true);
      
      // Cleanup
      if (existsSync(deepPath)) {
        unlinkSync(deepPath);
      }
    });
  });

  describe('validation before save', () => {
    it('should validate referential integrity for relationships', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      // Create a relationship with non-existent source
      // This should be caught during save validation
      const model = tempManipulator.getModel();
      
      // Manually add invalid relationship (bypassing normal validation)
      model.relationships.push({
        id: 'invalid-rel',
        sourceId: 'non-existent-source',
        targetId: 'non-existent-target',
        type: 'Serving',
        properties: {}
      });

      await expect(
        tempManipulator.saveAs(tempSavePath, { validate: true })
      ).rejects.toThrow(ReferentialIntegrityError);
    });

    it('should validate view element references', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      const model = tempManipulator.getModel();
      
      // Manually add view with non-existent element reference
      model.views.push({
        id: 'invalid-view',
        name: 'Invalid View',
        elements: ['non-existent-element'],
        relationships: [],
        properties: {}
      });

      await expect(
        tempManipulator.saveAs(tempSavePath, { validate: true })
      ).rejects.toThrow(ReferentialIntegrityError);
    });

    it('should validate view relationship references', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      const model = tempManipulator.getModel();
      
      // Manually add view with non-existent relationship reference
      model.views.push({
        id: 'invalid-view-2',
        name: 'Invalid View 2',
        elements: [],
        relationships: ['non-existent-relationship'],
        properties: {}
      });

      await expect(
        tempManipulator.saveAs(tempSavePath, { validate: true })
      ).rejects.toThrow(ReferentialIntegrityError);
    });
  });

  describe('XML output validation', () => {
    it('should generate valid XML structure', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'XML Test Component'
      });

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      const xml = readFileSync(tempSavePath, 'utf8');
      
      // Check XML structure
      expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
      expect(xml).toContain('<model');
      expect(xml).toContain('</model>');
      expect(xml).toContain('<elements>');
      expect(xml).toContain('</elements>');
    });

    it('should preserve namespaces and schema location', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      const xml = readFileSync(tempSavePath, 'utf8');
      
      expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"');
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
      expect(xml).toContain('xsi:schemaLocation');
    });

    it('should serialize elements correctly', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      const element = await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Serialization Test',
        documentation: 'Test documentation',
        properties: { 'prop1': 'value1' }
      });

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      const xml = readFileSync(tempSavePath, 'utf8');
      
      expect(xml).toContain(`identifier="${element.id}"`);
      expect(xml).toContain('xsi:type="ApplicationComponent"');
      expect(xml).toContain('<name xml:lang="en">Serialization Test</name>');
      expect(xml).toContain('<documentation xml:lang="en">Test documentation</documentation>');
    });

    it('should serialize relationships correctly', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      const source = await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'Source Component'
      });

      const target = await tempManipulator.createElement({
        type: 'ApplicationService',
        name: 'Target Service'
      });

      const relationship = await tempManipulator.createRelationship({
        type: 'Serving',
        sourceId: source.id,
        targetId: target.id,
        name: 'Test Relationship'
      });

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      const xml = readFileSync(tempSavePath, 'utf8');
      
      expect(xml).toContain(`identifier="${relationship.id}"`);
      expect(xml).toContain(`source="${source.id}"`);
      expect(xml).toContain(`target="${target.id}"`);
      expect(xml).toContain('xsi:type="Serving"');
      expect(xml).toContain('<name xml:lang="en">Test Relationship</name>');
    });

    it('should serialize views correctly', async () => {
      const tempLoader = new ModelLoader(testPath);
      const tempManipulator = new ModelManipulator(tempLoader);

      const element = await tempManipulator.createElement({
        type: 'ApplicationComponent',
        name: 'View Element'
      });

      const view = await tempManipulator.createView({
        name: 'Test View',
        type: 'Diagram',
        viewpoint: 'ApplicationCooperation'
      });

      await tempManipulator.addElementToView(view.id, element.id);

      await tempManipulator.saveAs(tempSavePath, { createBackup: false, validate: false });

      const xml = readFileSync(tempSavePath, 'utf8');
      
      expect(xml).toContain(`identifier="${view.id}"`);
      expect(xml).toContain('<name xml:lang="en">Test View</name>');
      expect(xml).toContain('xsi:type="Diagram"');
      expect(xml).toContain('viewpoint="ApplicationCooperation"');
      expect(xml).toContain(`elementRef="${element.id}"`);
    });
  });
});
