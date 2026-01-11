import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createTools } from '../../src/mcp/tools';
import { join } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

describe('MCP tools', () => {
  it('searchViewsHandler returns markdown', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const result = await tools.searchViewsHandler({ query: 'dataflow' });
    expect(result.markdown).toContain('Dataflow');
    expect(result.markdown).toContain('Views');
  });

  it('getViewDetailsHandler returns view markdown', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const result = await tools.getViewDetailsHandler({ viewname: 'Dataflow View' });
    expect(result.markdown).toContain('ArchiMate View name: Dataflow View');
    expect(result.markdown).toContain('Elements');
    expect(result.id).toBeTypeOf('string');
    expect(result.id && result.id.length).toBeGreaterThan(0);
  });

  it('searchElementsHandler returns markdown', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    
    // Test searching by name
    const nameResult = await tools.searchElementsHandler({ query: 'core' });
    expect(nameResult.markdown).toContain('Elements');
    expect(nameResult.markdown).toContain('Core');
    
    // Test searching by type
    const typeResult = await tools.searchElementsHandler({ type: 'ApplicationComponent' });
    expect(typeResult.markdown).toContain('ApplicationComponent');
  });

  it('getElementDetailsHandler returns element markdown', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    
    const result = await tools.getElementDetailsHandler({ elementname: 'RDBMS' });
    expect(result.markdown).toContain('ArchiMate Element:');
    expect(result.markdown).toContain('RDBMS');
    expect(result.id).toBeTypeOf('string');
    expect(result.id && result.id.length).toBeGreaterThan(0);
  });
});

describe('CreateModel tool', () => {
  const TEMP_DIR = join(tmpdir(), 'archiscribe-createmodel-tests');
  
  beforeAll(() => {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    try {
      const testFiles = [
        join(TEMP_DIR, 'test-model.archimate'),
        join(TEMP_DIR, 'test-model-custom.archimate'),
        join(TEMP_DIR, 'test-model-with-id.archimate'),
        join(TEMP_DIR, 'subdir', 'nested-model.archimate')
      ];
      for (const file of testFiles) {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it('createModelHandler creates a new empty model', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model.archimate');

    const result = await tools.createModelHandler({ path: newModelPath });
    
    expect(result.success).toBe(true);
    expect(result.modelPath).toBe(newModelPath);
    expect(result.elementCount).toBe(0);
    expect(result.viewCount).toBe(0);
    expect(result.relationshipCount).toBe(0);
    expect(result.hasUnsavedChanges).toBe(false);
    expect(result.message).toBe('New model created successfully');
    expect(result.markdown).toContain('New Model Created Successfully');
    expect(result.markdown).toContain(newModelPath);
    expect(existsSync(newModelPath)).toBe(true);
  });

  it('createModelHandler creates model with custom name', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model-custom.archimate');

    const result = await tools.createModelHandler({ 
      path: newModelPath,
      name: 'Custom Model Name'
    });
    
    expect(result.success).toBe(true);
    expect(result.modelPath).toBe(newModelPath);
    expect(result.markdown).toContain('Custom Model Name');
    expect(existsSync(newModelPath)).toBe(true);
  });

  it('createModelHandler creates model with custom identifier', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model-with-id.archimate');
    const customId = 'custom-model-identifier-123';

    const result = await tools.createModelHandler({ 
      path: newModelPath,
      identifier: customId
    });
    
    expect(result.success).toBe(true);
    expect(result.modelPath).toBe(newModelPath);
    expect(existsSync(newModelPath)).toBe(true);
    
    // Verify the identifier is in the file
    const { readFileSync } = await import('fs');
    const fileContent = readFileSync(newModelPath, 'utf8');
    expect(fileContent).toContain(`identifier="${customId}"`);
  });

  it('createModelHandler creates parent directories if needed', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'subdir', 'nested-model.archimate');

    const result = await tools.createModelHandler({ path: newModelPath });
    
    expect(result.success).toBe(true);
    expect(existsSync(newModelPath)).toBe(true);
  });

  it('createModelHandler fails if file already exists', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model.archimate');

    // Create the file first
    await tools.createModelHandler({ path: newModelPath });
    
    // Try to create again - should fail
    await expect(
      tools.createModelHandler({ path: newModelPath })
    ).rejects.toThrow('File already exists');
  });

  it('createModelHandler fails if current model has unsaved changes', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model.archimate');

    // Modify the current model
    await tools.createElementHandler({
      type: 'ApplicationComponent',
      name: 'Test Component'
    });

    // Try to create new model - should fail
    await expect(
      tools.createModelHandler({ path: newModelPath })
    ).rejects.toThrow('unsaved changes');
  });

  it('createModelHandler loads the newly created model', async () => {
    const modelPath = join(__dirname, '..', '..', 'data', 'archimate-scribe-demo-model.xml');
    const tools = createTools(modelPath);
    const newModelPath = join(TEMP_DIR, 'test-model.archimate');

    await tools.createModelHandler({ path: newModelPath });
    
    // Verify we can get the model path
    const pathResult = await tools.getModelPathHandler({});
    expect(pathResult.path).toBe(newModelPath);
    expect(pathResult.modified).toBe(false);
  });
});
