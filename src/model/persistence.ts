/**
 * XML Builder Utilities for ArchiMate Exchange File Format
 * 
 * Serializes ModelData structures to valid ArchiMate XML format.
 * 
 * @module model/persistence
 */

import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { ModelData, ElementObject, RelationshipObject, ViewObject } from './types';
import { getLogger } from '../utils/logger';

const logger = getLogger();

/**
 * ArchiMate XML namespaces and schema locations
 */
const ARCHIMATE_NS = 'http://www.opengroup.org/xsd/archimate/3.0/';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const SCHEMA_LOCATION = 'http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd';

/**
 * Options for XML serialization
 */
export interface SerializationOptions {
  /** Model identifier (auto-generated if not provided) */
  identifier?: string;
  /** Model name */
  name?: string;
  /** Model version (default: '3.1') */
  version?: string;
  /** Default language for text content (default: 'en') */
  defaultLang?: string;
}

/**
 * XML Builder for ArchiMate models
 */
export class ArchiMateXMLBuilder {
  private defaultLang: string;

  constructor(defaultLang: string = 'en') {
    this.defaultLang = defaultLang;
  }

  /**
   * Serialize ModelData to ArchiMate Exchange File Format XML
   */
  serialize(model: ModelData, options: SerializationOptions = {}): string {
    const identifier = options.identifier || this.generateModelId();
    const modelName = options.name || 'ArchiMate Model';
    const version = options.version || '3.1';
    const lang = options.defaultLang || this.defaultLang;

    // Create root model element with namespaces
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('model', {
        'xmlns': ARCHIMATE_NS,
        'xmlns:xsi': XSI_NS,
        'xsi:schemaLocation': SCHEMA_LOCATION,
        'identifier': identifier
      });

    // Add model name
    this.addLangString(root, 'name', modelName, lang);

    // Add elements
    if (model.elements && model.elements.length > 0) {
      const elementsEl = root.ele('elements');
      for (const element of model.elements) {
        this.serializeElement(elementsEl, element, lang);
      }
    }

    // Add relationships
    if (model.relationships && model.relationships.length > 0) {
      const relationshipsEl = root.ele('relationships');
      for (const relationship of model.relationships) {
        this.serializeRelationship(relationshipsEl, relationship, lang);
      }
    }

    // Add property definitions
    if (model.propertyDefinitions && model.propertyDefinitions.length > 0) {
      const propDefsEl = root.ele('propertyDefinitions');
      for (const propDef of model.propertyDefinitions) {
        const propDefEl = propDefsEl.ele('propertyDefinition', { 
          identifier: propDef.identifier, 
          type: propDef.type || 'string' 
        });
        this.addLangString(propDefEl, 'name', propDef.name, lang);
      }
    }

    // Add views
    if (model.views && model.views.length > 0) {
      const viewsEl = root.ele('views');
      const diagramsEl = viewsEl.ele('diagrams');
      for (const view of model.views) {
        this.serializeView(diagramsEl, view, lang);
      }
    }

    const xml = root.end({ prettyPrint: true, indent: '  ', newline: '\n' });
    logger.log('info', 'xml.serialize.success', { 
      elements: model.elements?.length || 0,
      relationships: model.relationships?.length || 0,
      views: model.views?.length || 0
    });
    
    return xml;
  }

  /**
   * Serialize an element to XML
   */
  private serializeElement(parent: XMLBuilder, element: ElementObject, lang: string = this.defaultLang): void {
    const attrs: Record<string, string> = { identifier: element.id };
    if (element.type) {
      attrs['xsi:type'] = element.type;
    }

    const elementEl = parent.ele('element', attrs);

    // Add name
    if (element.name) {
      this.addLangString(elementEl, 'name', element.name, lang);
    }

    // Add documentation
    if (element.documentation) {
      this.addLangString(elementEl, 'documentation', element.documentation, lang);
    }

    // Add properties
    if (element.properties && Object.keys(element.properties).length > 0) {
      const propsEl = elementEl.ele('properties');
      // Note: Properties need propertyDefinitionRef - this requires property definition mapping
      // For now, we'll store properties but need to handle property definition references
      // This is a simplified version - full implementation needs property definition tracking
      for (const [key, value] of Object.entries(element.properties)) {
        const propEl = propsEl.ele('property', { propertyDefinitionRef: key });
        this.addLangString(propEl, 'value', value, lang);
      }
    }
  }

  /**
   * Serialize a relationship to XML
   */
  private serializeRelationship(parent: XMLBuilder, relationship: RelationshipObject, lang: string = this.defaultLang): void {
    const attrs: Record<string, string> = {
      identifier: relationship.id,
      source: relationship.sourceId,
      target: relationship.targetId
    };
    if (relationship.type) {
      attrs['xsi:type'] = relationship.type;
    }

    const relEl = parent.ele('relationship', attrs);

    // Add name
    if (relationship.name) {
      this.addLangString(relEl, 'name', relationship.name, lang);
    }

    // Add documentation
    if (relationship.documentation) {
      this.addLangString(relEl, 'documentation', relationship.documentation, lang);
    }

    // Add properties
    if (relationship.properties && Object.keys(relationship.properties).length > 0) {
      const propsEl = relEl.ele('properties');
      for (const [key, value] of Object.entries(relationship.properties)) {
        const propEl = propsEl.ele('property', { propertyDefinitionRef: key });
        this.addLangString(propEl, 'value', value, lang);
      }
    }
  }

  /**
   * Serialize a view to XML
   */
  private serializeView(parent: XMLBuilder, view: ViewObject, lang: string = this.defaultLang): void {
    const attrs: Record<string, string> = { identifier: view.id };
    if (view.type) {
      attrs['xsi:type'] = view.type;
    }
    if (view.viewpoint) {
      attrs.viewpoint = view.viewpoint;
    }

    const viewEl = parent.ele('view', attrs);

    // Add name
    if (view.name) {
      this.addLangString(viewEl, 'name', view.name, lang);
    }

    // Add documentation
    if (view.documentation) {
      this.addLangString(viewEl, 'documentation', view.documentation, lang);
    }

    // Add properties
    if (view.properties && Object.keys(view.properties).length > 0) {
      const propsEl = viewEl.ele('properties');
      for (const [key, value] of Object.entries(view.properties)) {
        const propEl = propsEl.ele('property', { propertyDefinitionRef: key });
        this.addLangString(propEl, 'value', value, lang);
      }
    }

    // Add nodes (elements in view)
    if (view.elements && view.elements.length > 0) {
      for (const elementId of view.elements) {
        const nodeEl = viewEl.ele('node', { elementRef: elementId });
        // Note: View nodes can have style, position, etc. - simplified for now
      }
    }

    // Add connections (relationships in view)
    if (view.relationships && view.relationships.length > 0) {
      for (const relId of view.relationships) {
        viewEl.ele('connection', { relationshipRef: relId });
      }
    }

    // Add node hierarchy
    if (view.nodeHierarchy && view.nodeHierarchy.length > 0) {
      // Node hierarchy is represented by nested nodes
      // This is a simplified version - full implementation needs proper nesting
      for (const { parentElement, childElement } of view.nodeHierarchy) {
        // Find parent node and add child as nested node
        const parentNode = viewEl.find(node => 
          node.att('elementRef') === parentElement
        );
        if (parentNode) {
          parentNode.ele('node', { elementRef: childElement });
        }
      }
    }
  }

  /**
   * Add a language string element (supports xml:lang attribute)
   */
  private addLangString(parent: XMLBuilder, tagName: string, value: string, lang: string = this.defaultLang): void {
    const el = parent.ele(tagName);
    el.att('xml:lang', lang);
    el.txt(value);
  }


  /**
   * Generate a model identifier
   */
  private generateModelId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Get default XML builder instance
 */
let defaultBuilder: ArchiMateXMLBuilder | null = null;

export function getXMLBuilder(defaultLang?: string): ArchiMateXMLBuilder {
  if (!defaultBuilder) {
    defaultBuilder = new ArchiMateXMLBuilder(defaultLang);
  }
  return defaultBuilder;
}
