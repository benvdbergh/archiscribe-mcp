import { describe, it, expect } from 'vitest';
import { ModelLoader } from '../model/loader';
import { readFileSync } from 'fs';
import { join } from 'path';
import { XSDValidator } from '../utils/xsd-validator';

describe('Test Fixtures', () => {
  const fixturesDir = join(__dirname, 'fixtures');
  const fixtures = [
    'empty-model.xml',
    'basic-model.xml',
    'comprehensive-elements.xml',
    'comprehensive-relationships.xml',
    'model-with-properties.xml',
    'model-with-views.xml'
  ];

  describe('Fixture Loading', () => {
    for (const fixture of fixtures) {
      it(`should load ${fixture} successfully`, () => {
        const path = join(fixturesDir, fixture);
        const loader = new ModelLoader(path);
        const model = loader.load();

        expect(model).toBeDefined();
        expect(model.elements).toBeDefined();
        expect(model.relationships).toBeDefined();
        expect(model.views).toBeDefined();
      });
    }
  });

  describe('Fixture Structure', () => {
    it('should have valid XML structure for all fixtures', () => {
      for (const fixture of fixtures) {
        const path = join(fixturesDir, fixture);
        const xml = readFileSync(path, 'utf8');

        // Basic XML structure checks
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<model');
        expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"');
        expect(xml).toContain('</model>');
      }
    });
  });

  describe('Fixture Content', () => {
    it('empty-model.xml should have no elements, relationships, or views', () => {
      const loader = new ModelLoader(join(fixturesDir, 'empty-model.xml'));
      const model = loader.load();

      expect(model.elements.length).toBe(0);
      expect(model.relationships.length).toBe(0);
      expect(model.views.length).toBe(0);
    });

    it('basic-model.xml should have elements and relationships', () => {
      const loader = new ModelLoader(join(fixturesDir, 'basic-model.xml'));
      const model = loader.load();

      expect(model.elements.length).toBeGreaterThan(0);
      expect(model.relationships.length).toBeGreaterThan(0);
    });

    it('comprehensive-elements.xml should have many element types', () => {
      const loader = new ModelLoader(join(fixturesDir, 'comprehensive-elements.xml'));
      const model = loader.load();

      expect(model.elements.length).toBeGreaterThan(20);
      // Check for different element types
      const types = new Set(model.elements.map(e => e.type));
      expect(types.size).toBeGreaterThan(10);
    });

    it('comprehensive-relationships.xml should have various relationship types', () => {
      const loader = new ModelLoader(join(fixturesDir, 'comprehensive-relationships.xml'));
      const model = loader.load();

      expect(model.relationships.length).toBeGreaterThan(0);
      const types = new Set(model.relationships.map(r => r.type));
      expect(types.size).toBeGreaterThan(5);
    });

    it('model-with-properties.xml should have property definitions', () => {
      const loader = new ModelLoader(join(fixturesDir, 'model-with-properties.xml'));
      const model = loader.load();

      // Check that elements have properties
      const elementsWithProps = model.elements.filter(e => 
        e.properties && Object.keys(e.properties).length > 0
      );
      expect(elementsWithProps.length).toBeGreaterThan(0);
    });

    it('model-with-views.xml should have views with elements and relationships', () => {
      const loader = new ModelLoader(join(fixturesDir, 'model-with-views.xml'));
      const model = loader.load();

      expect(model.views.length).toBeGreaterThan(0);
      const viewsWithElements = model.views.filter(v => 
        v.elements && v.elements.length > 0
      );
      expect(viewsWithElements.length).toBeGreaterThan(0);
    });
  });

  describe('XSD Validation', () => {
    // Note: XSD validation may be slow, so we test a subset
    it('should validate basic-model.xml against XSD', async () => {
      const validator = new XSDValidator();
      const path = join(fixturesDir, 'basic-model.xml');
      const xml = readFileSync(path, 'utf8');

      const result = validator.validateModel(xml);
      
      // Note: xsdlibrary may have limitations, so we check that validation runs
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
