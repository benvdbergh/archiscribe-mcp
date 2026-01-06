/**
 * Performance Tests
 * 
 * Tests to ensure operations meet performance targets:
 * - Read operations < 100ms
 * - Write operations < 500ms
 * - Validation < 1s
 * - Model save < 2s
 */

import { describe, it, expect } from 'vitest';
import { benchmark, PERFORMANCE_TARGETS, formatBenchmarkResult } from '../utils/performance';
import { ModelLoader } from '../model/loader';
import { ModelManipulator } from '../model/manipulator';
import { XSDValidator } from '../utils/xsd-validator';
import { ArchiMateXMLBuilder } from '../model/persistence';
import { readFileSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(__dirname, 'fixtures');
const BASIC_MODEL = join(FIXTURES_DIR, 'basic-model.xml');
const COMPREHENSIVE_MODEL = join(FIXTURES_DIR, 'comprehensive-elements.xml');

describe('Performance Tests', () => {
  describe('Read Operations', () => {
    it('should load basic model in < 100ms', async () => {
      const result = await benchmark(
        'Load Basic Model',
        async () => {
          const loader = new ModelLoader(BASIC_MODEL);
          loader.load();
        },
        10,
        PERFORMANCE_TARGETS.READ_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
      expect(result.avgDurationMs).toBeLessThan(PERFORMANCE_TARGETS.READ_OPERATION);
    });

    it('should load comprehensive model in < 100ms', async () => {
      const result = await benchmark(
        'Load Comprehensive Model',
        async () => {
          const loader = new ModelLoader(COMPREHENSIVE_MODEL);
          loader.load();
        },
        10,
        PERFORMANCE_TARGETS.READ_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
      expect(result.avgDurationMs).toBeLessThan(PERFORMANCE_TARGETS.READ_OPERATION);
    });

    it('should find element by ID in < 100ms', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const manipulator = new ModelManipulator(model);

      const elementId = model.elements[0]?.identifier;
      if (!elementId) {
        throw new Error('No elements in model');
      }

      const result = await benchmark(
        'Find Element by ID',
        async () => {
          manipulator.getElement(elementId);
        },
        10,
        PERFORMANCE_TARGETS.READ_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });

    it('should get element details in < 100ms', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const manipulator = new ModelManipulator(model);

      // Get first element ID
      const elementId = model.elements[0]?.identifier;
      if (!elementId) {
        throw new Error('No elements in model');
      }

      const result = await benchmark(
        'Get Element Details',
        async () => {
          manipulator.getElement(elementId);
        },
        10,
        PERFORMANCE_TARGETS.READ_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });
  });

  describe('Write Operations', () => {
    it('should create element in < 500ms', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const manipulator = new ModelManipulator(model);

      const result = await benchmark(
        'Create Element',
        async () => {
          manipulator.createElement({
            type: 'ApplicationComponent',
            name: 'Test Component'
          });
        },
        10,
        PERFORMANCE_TARGETS.WRITE_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });

    it('should update element in < 500ms', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const manipulator = new ModelManipulator(model);

      const elementId = model.elements[0]?.identifier;
      if (!elementId) {
        throw new Error('No elements in model');
      }

      const result = await benchmark(
        'Update Element',
        async () => {
          manipulator.updateElement(elementId, {
            name: 'Updated Name'
          });
        },
        10,
        PERFORMANCE_TARGETS.WRITE_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });

    it('should create relationship in < 500ms', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const manipulator = new ModelManipulator(model);

      if (model.elements.length < 2) {
        throw new Error('Need at least 2 elements for relationship');
      }

      const result = await benchmark(
        'Create Relationship',
        async () => {
          manipulator.createRelationship({
            type: 'Serving',
            sourceId: model.elements[0].identifier,
            targetId: model.elements[1].identifier
          });
        },
        10,
        PERFORMANCE_TARGETS.WRITE_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });
  });

  describe('Validation Operations', () => {
    it('should validate model in < 1s', async () => {
      const xml = readFileSync(BASIC_MODEL, 'utf8');
      const validator = new XSDValidator();

      const result = await benchmark(
        'Validate Model',
        async () => {
          validator.validateModel(xml);
        },
        5,
        PERFORMANCE_TARGETS.VALIDATION_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });

    it('should validate comprehensive model in < 1s', async () => {
      const xml = readFileSync(COMPREHENSIVE_MODEL, 'utf8');
      const validator = new XSDValidator();

      const result = await benchmark(
        'Validate Comprehensive Model',
        async () => {
          validator.validateModel(xml);
        },
        5,
        PERFORMANCE_TARGETS.VALIDATION_OPERATION
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });
  });

  describe('Model Save Operations', () => {
    it('should serialize model in < 2s', async () => {
      const loader = new ModelLoader(BASIC_MODEL);
      const model = loader.load();
      const builder = new ArchiMateXMLBuilder();

      const result = await benchmark(
        'Serialize Model',
        async () => {
          builder.serialize(model);
        },
        10,
        PERFORMANCE_TARGETS.MODEL_SAVE
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });

    it('should serialize comprehensive model in < 2s', async () => {
      const loader = new ModelLoader(COMPREHENSIVE_MODEL);
      const model = loader.load();
      const builder = new ArchiMateXMLBuilder();

      const result = await benchmark(
        'Serialize Comprehensive Model',
        async () => {
          builder.serialize(model);
        },
        10,
        PERFORMANCE_TARGETS.MODEL_SAVE
      );

      console.log(formatBenchmarkResult(result));
      expect(result.targetMet).toBe(true);
    });
  });
});
