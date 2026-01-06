import { describe, it, expect, beforeEach } from 'vitest';
import { ArchiMateXMLBuilder, SerializationOptions } from '../model/persistence';
import { ModelData, ElementObject, RelationshipObject, ViewObject } from '../model/types';

describe('ArchiMateXMLBuilder', () => {
  let builder: ArchiMateXMLBuilder;

  beforeEach(() => {
    builder = new ArchiMateXMLBuilder('en');
  });

  describe('serialize', () => {
    it('should serialize a minimal model', () => {
      const model: ModelData = {
        elements: [],
        relationships: [],
        views: []
      };

      const xml = builder.serialize(model, { identifier: 'test-id', name: 'Test Model' });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<model');
      expect(xml).toContain('xmlns="http://www.opengroup.org/xsd/archimate/3.0/"');
      expect(xml).toContain('identifier="test-id"');
      expect(xml).toContain('<name xml:lang="en">Test Model</name>');
    });

    it('should serialize elements', () => {
      const model: ModelData = {
        elements: [
          {
            id: 'elem-1',
            name: 'Test Element',
            type: 'ApplicationComponent',
            documentation: 'Test documentation',
            properties: {},
            inViews: [],
            outgoingRelations: [],
            incomingRelations: []
          }
        ],
        relationships: [],
        views: []
      };

      const xml = builder.serialize(model);

      expect(xml).toContain('<elements>');
      expect(xml).toContain('<element identifier="elem-1" xsi:type="ApplicationComponent">');
      expect(xml).toContain('<name xml:lang="en">Test Element</name>');
      expect(xml).toContain('<documentation xml:lang="en">Test documentation</documentation>');
    });

    it('should serialize relationships', () => {
      const model: ModelData = {
        elements: [],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'elem-1',
            targetId: 'elem-2',
            type: 'Serving',
            name: 'Test Relationship',
            documentation: 'Relationship documentation',
            properties: {}
          }
        ],
        views: []
      };

      const xml = builder.serialize(model);

      expect(xml).toContain('<relationships>');
      expect(xml).toContain('<relationship identifier="rel-1" source="elem-1" target="elem-2" xsi:type="Serving">');
      expect(xml).toContain('<name xml:lang="en">Test Relationship</name>');
    });

    it('should serialize views', () => {
      const model: ModelData = {
        elements: [],
        relationships: [],
        views: [
          {
            id: 'view-1',
            name: 'Test View',
            type: 'Diagram',
            viewpoint: 'ApplicationCooperation',
            documentation: 'View documentation',
            properties: {},
            elements: ['elem-1'],
            relationships: ['rel-1'],
            nodeHierarchy: []
          }
        ]
      };

      const xml = builder.serialize(model);

      expect(xml).toContain('<views>');
      expect(xml).toContain('<view identifier="view-1" xsi:type="Diagram" viewpoint="ApplicationCooperation">');
      expect(xml).toContain('<name xml:lang="en">Test View</name>');
      expect(xml).toContain('<node elementRef="elem-1"');
      expect(xml).toContain('<connection relationshipRef="rel-1"');
    });

    it('should serialize properties', () => {
      const model: ModelData = {
        elements: [
          {
            id: 'elem-1',
            name: 'Test Element',
            type: 'ApplicationComponent',
            properties: {
              'prop-1': 'value-1',
              'prop-2': 'value-2'
            },
            inViews: [],
            outgoingRelations: [],
            incomingRelations: []
          }
        ],
        relationships: [],
        views: []
      };

      const xml = builder.serialize(model);

      expect(xml).toContain('<properties>');
      expect(xml).toContain('propertyDefinitionRef="prop-1"');
      expect(xml).toContain('<value xml:lang="en">value-1</value>');
    });

    it('should include schema location', () => {
      const model: ModelData = {
        elements: [],
        relationships: [],
        views: []
      };

      const xml = builder.serialize(model);

      expect(xml).toContain('xsi:schemaLocation');
      expect(xml).toContain('http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd');
    });

    it('should handle custom options', () => {
      const model: ModelData = {
        elements: [],
        relationships: [],
        views: []
      };

      const options: SerializationOptions = {
        identifier: 'custom-id',
        name: 'Custom Model',
        version: '3.0',
        defaultLang: 'fr'
      };

      const xml = builder.serialize(model, options);

      expect(xml).toContain('identifier="custom-id"');
      expect(xml).toContain('<name xml:lang="fr">Custom Model</name>');
    });

    it('should generate valid XML structure', () => {
      const model: ModelData = {
        elements: [
          {
            id: 'elem-1',
            name: 'Element 1',
            type: 'ApplicationComponent',
            properties: {},
            inViews: [],
            outgoingRelations: [],
            incomingRelations: []
          }
        ],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'elem-1',
            targetId: 'elem-2',
            type: 'Serving',
            properties: {}
          }
        ],
        views: []
      };

      const xml = builder.serialize(model);

      // Check XML is well-formed (basic checks)
      expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
      expect(xml).toContain('</model>');
      expect(xml.split('<elements>').length).toBe(2); // Opening and closing
    });
  });

  describe('language support', () => {
    it('should use default language for text content', () => {
      const builderFr = new ArchiMateXMLBuilder('fr');
      const model: ModelData = {
        elements: [
          {
            id: 'elem-1',
            name: 'Élément Test',
            type: 'ApplicationComponent',
            properties: {},
            inViews: [],
            outgoingRelations: [],
            incomingRelations: []
          }
        ],
        relationships: [],
        views: []
      };

      const xml = builderFr.serialize(model);

      expect(xml).toContain('xml:lang="fr"');
    });
  });
});
