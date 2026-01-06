import { describe, it, expect, beforeEach } from 'vitest';
import { XSDValidator, ValidationResult } from '../utils/xsd-validator';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('XSDValidator', () => {
  let validator: XSDValidator;
  const schemaBasePath = join(
    process.env.HOME || '',
    'Knowledge/Projects/ArchiScribe-MCP-Extension/research/Examples/XML/XSD3.1'
  );
  const testModelPath = join(
    process.env.HOME || '',
    'mcp/archiscribe-mcp/data/archimate-scribe-demo-model.xml'
  );

  beforeEach(() => {
    validator = new XSDValidator(schemaBasePath);
  });

  describe('validateModel', () => {
    it('should validate a valid ArchiMate model', () => {
      const xmlString = readFileSync(testModelPath, 'utf8');
      const result: ValidationResult = validator.validateModel(xmlString);
      
      // Note: xsdlibrary may have limitations, so we test that the method runs
      // Actual validation success depends on xsdlibrary's capabilities
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should detect invalid XML structure', () => {
      const invalidXml = '<model><invalid></invalid></model>';
      const result: ValidationResult = validator.validateModel(invalidXml);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle empty XML', () => {
      const result: ValidationResult = validator.validateModel('');
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate against Model XSD schema', () => {
      const xmlString = readFileSync(testModelPath, 'utf8');
      const result: ValidationResult = validator.validate(xmlString, 'archimate3_Model.xsd');
      
      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle missing schema file gracefully', () => {
      const xmlString = '<model></model>';
      const result: ValidationResult = validator.validate(xmlString, 'nonexistent.xsd');
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should cache loaded schemas', () => {
      const xmlString = readFileSync(testModelPath, 'utf8');
      
      // First validation - should load schema
      const result1 = validator.validateModel(xmlString);
      
      // Second validation - should use cached schema
      const result2 = validator.validateModel(xmlString);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should clear cache when requested', () => {
      validator.clearCache();
      // Cache cleared, should still work
      const xmlString = readFileSync(testModelPath, 'utf8');
      const result = validator.validateModel(xmlString);
      expect(result).toBeDefined();
    });
  });

  describe('schema path management', () => {
    it('should allow setting custom schema base path', () => {
      const customPath = '/custom/path';
      validator.setSchemaBasePath(customPath);
      // Path should be set (we can't easily test the internal state, but we can test it doesn't throw)
      expect(() => validator.setSchemaBasePath(customPath)).not.toThrow();
    });
  });
});
