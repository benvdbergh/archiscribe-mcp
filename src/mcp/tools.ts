import { ModelLoader } from '../model/loader';
import { renderViewListMarkdown, renderViewDetailsMarkdownFromModel, renderElementListMarkdown, renderElementDetailsMarkdownFromModel } from '../renderer';
import { loadConfig } from '../config';
import { getLogger } from '../utils/logger';
import { ModelManipulator, getModelManipulator } from '../model/manipulator';
import { XSDValidator } from '../utils/xsd-validator';
import {
  CreateElementInput,
  UpdateElementInput,
  DeleteOptions,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  CreateViewInput,
  UpdateViewInput,
  ValidationResult
} from '../model/manipulator-types';
import { ValidationReporter } from '../utils/validation-reporter';
import { validateModelPath, validatePath } from '../utils/path-validator';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface SearchViewsInput {
  query?: string;
}

export interface SearchViewsOutput {
  markdown: string;
  [key: string]: unknown; // MCP compatibility
}

export interface GetViewDetailsInput {
  viewname: string;
}

export interface GetViewDetailsOutput {
  id?: string;
  markdown: string;
  [key: string]: unknown; // MCP compatibility
}

export interface SearchElementsInput {
  query?: string;
  type?: string;
}

export interface SearchElementsOutput {
  markdown: string;
  [key: string]: unknown; // MCP compatibility
}

export interface GetElementDetailsInput {
  elementname: string;
}

export interface GetElementDetailsOutput {
  id?: string;
  markdown: string;
  [key: string]: unknown; // MCP compatibility
}

// ============================================================================
// Element Management MCP Tools
// ============================================================================

export interface CreateElementInput {
  type: string;
  name: string;
  identifier?: string;
  documentation?: string;
  properties?: Record<string, string>;
  autoSave?: boolean;
}

export interface CreateElementOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface UpdateElementInput {
  identifier: string;
  name?: string;
  type?: string;
  documentation?: string;
  properties?: Record<string, string>;
  autoSave?: boolean;
}

export interface UpdateElementOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteElementInput {
  identifier: string;
  cascade?: boolean;
  autoSave?: boolean;
}

export interface DeleteElementOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

// ============================================================================
// Relationship Management MCP Tools
// ============================================================================

export interface CreateRelationshipInput {
  type: string;
  sourceId: string;
  targetId: string;
  identifier?: string;
  name?: string;
  documentation?: string;
  properties?: Record<string, string>;
  autoSave?: boolean;
}

export interface CreateRelationshipOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface UpdateRelationshipInput {
  identifier: string;
  type?: string;
  sourceId?: string;
  targetId?: string;
  name?: string;
  documentation?: string;
  properties?: Record<string, string>;
  autoSave?: boolean;
}

export interface UpdateRelationshipOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteRelationshipInput {
  identifier: string;
  autoSave?: boolean;
}

export interface DeleteRelationshipOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

// ============================================================================
// View Management MCP Tools
// ============================================================================

export interface CreateViewInput {
  name: string;
  identifier?: string;
  type?: string;
  viewpoint?: string;
  documentation?: string;
  properties?: Record<string, string>;
  elements?: string[];
  relationships?: string[];
  nodeHierarchy?: Array<{ parentElement: string; childElement: string }>;
  autoSave?: boolean;
}

export interface CreateViewOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface UpdateViewInput {
  identifier: string;
  name?: string;
  type?: string;
  viewpoint?: string;
  documentation?: string;
  properties?: Record<string, string>;
  elements?: string[];
  relationships?: string[];
  nodeHierarchy?: Array<{ parentElement: string; childElement: string }>;
  autoSave?: boolean;
}

export interface UpdateViewOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface AddElementToViewInput {
  viewId: string;
  elementId: string;
  parentElementId?: string;
  autoSave?: boolean;
}

export interface AddElementToViewOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

export interface RemoveElementFromViewInput {
  viewId: string;
  elementId: string;
  autoSave?: boolean;
}

export interface RemoveElementFromViewOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteViewInput {
  identifier: string;
  autoSave?: boolean;
}

export interface DeleteViewOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

// ============================================================================
// Validation MCP Tools
// ============================================================================

export interface ValidateModelInput {
  strict?: boolean;
  includeWarnings?: boolean;
}

export interface ValidateModelOutput {
  valid: boolean;
  markdown: string;
  report?: any;
  [key: string]: unknown;
}

export interface ValidateElementInput {
  identifier: string;
}

export interface ValidateElementOutput {
  valid: boolean;
  markdown: string;
  report?: any;
  [key: string]: unknown;
}

export interface ValidateRelationshipInput {
  identifier: string;
}

export interface ValidateRelationshipOutput {
  valid: boolean;
  markdown: string;
  report?: any;
  [key: string]: unknown;
}

// ============================================================================
// Model Persistence MCP Tools
// ============================================================================

export interface SaveModelInput {
  path?: string;
  createBackup?: boolean;
  validate?: boolean;
}

export interface SaveModelOutput {
  success: boolean;
  path: string;
  markdown: string;
  [key: string]: unknown;
}

export interface GetModelPathInput {
  // No input needed
}

export interface GetModelPathOutput {
  path: string;
  modified: boolean;
  markdown: string;
  [key: string]: unknown;
}

export interface SetModelPathInput {
  path: string;
}

export interface SetModelPathOutput {
  success: boolean;
  modelPath: string;
  elementCount: number;
  viewCount: number;
  hasUnsavedChanges: boolean;
  warning?: string;
  markdown: string;
  [key: string]: unknown;
}

export interface CreateModelInput {
  path: string;
  name?: string;
  identifier?: string;
}

export interface CreateModelOutput {
  success: boolean;
  modelPath: string;
  elementCount: number;
  viewCount: number;
  relationshipCount: number;
  hasUnsavedChanges: boolean;
  message: string;
  markdown: string;
  [key: string]: unknown;
}

// Helper functions to ensure type safety while maintaining MCP compatibility
function createSearchViewsOutput(markdown: string): SearchViewsOutput {
  return { markdown };
}

function createGetViewDetailsOutput(markdown: string, id?: string): GetViewDetailsOutput {
  return { markdown, id };
}

function createSearchElementsOutput(markdown: string): SearchElementsOutput {
  return { markdown };
}

function createGetElementDetailsOutput(markdown: string, id?: string): GetElementDetailsOutput {
  return { markdown, id };
}

function createElementOutput(id: string, markdown: string): CreateElementOutput {
  return { id, markdown };
}

function createUpdateElementOutput(id: string, markdown: string): UpdateElementOutput {
  return { id, markdown };
}

function createDeleteElementOutput(success: boolean, markdown: string): DeleteElementOutput {
  return { success, markdown };
}

function createRelationshipOutput(id: string, markdown: string): CreateRelationshipOutput {
  return { id, markdown };
}

function createUpdateRelationshipOutput(id: string, markdown: string): UpdateRelationshipOutput {
  return { id, markdown };
}

function createDeleteRelationshipOutput(success: boolean, markdown: string): DeleteRelationshipOutput {
  return { success, markdown };
}

function createViewOutput(id: string, markdown: string): CreateViewOutput {
  return { id, markdown };
}

function createUpdateViewOutput(id: string, markdown: string): UpdateViewOutput {
  return { id, markdown };
}

function createAddElementToViewOutput(success: boolean, markdown: string): AddElementToViewOutput {
  return { success, markdown };
}

function createRemoveElementFromViewOutput(success: boolean, markdown: string): RemoveElementFromViewOutput {
  return { success, markdown };
}

function createDeleteViewOutput(success: boolean, markdown: string): DeleteViewOutput {
  return { success, markdown };
}

function createValidateModelOutput(valid: boolean, markdown: string, report?: any): ValidateModelOutput {
  return { valid, markdown, report };
}

function createValidateElementOutput(valid: boolean, markdown: string, report?: any): ValidateElementOutput {
  return { valid, markdown, report };
}

function createValidateRelationshipOutput(valid: boolean, markdown: string, report?: any): ValidateRelationshipOutput {
  return { valid, markdown, report };
}

function createSaveModelOutput(success: boolean, path: string, markdown: string): SaveModelOutput {
  return { success, path, markdown };
}

function createGetModelPathOutput(path: string, modified: boolean, markdown: string): GetModelPathOutput {
  return { path, modified, markdown };
}

function createSetModelPathOutput(
  success: boolean,
  modelPath: string,
  elementCount: number,
  viewCount: number,
  hasUnsavedChanges: boolean,
  markdown: string,
  warning?: string
): SetModelPathOutput {
  return { success, modelPath, elementCount, viewCount, hasUnsavedChanges, markdown, warning };
}

function createCreateModelOutput(
  success: boolean,
  modelPath: string,
  elementCount: number,
  viewCount: number,
  relationshipCount: number,
  hasUnsavedChanges: boolean,
  message: string,
  markdown: string
): CreateModelOutput {
  return { success, modelPath, elementCount, viewCount, relationshipCount, hasUnsavedChanges, message, markdown };
}

export function createTools(modelPath?: string) {
  const cfg = loadConfig();
  const loader = new ModelLoader(modelPath || cfg.modelPath);
  const logger = getLogger();
  const DISCLAIMER_PREFIX = cfg.disclaimerPrefix || '';
  
  // Initialize ModelManipulator with optional XSD validator
  let validator: XSDValidator | undefined;
  try {
    validator = new XSDValidator();
  } catch (error) {
    logger.log('warn', 'xsd.validator.init.failed', { message: 'XSD validator not available, validation will be limited' });
  }
  const manipulator = getModelManipulator(loader, validator);

  // Add disclaimer at the start of the markdown, to reduce risk of prompt injection
  function withDisclaimer(md: string): string {
    if (!md) return DISCLAIMER_PREFIX;
    return md.startsWith(DISCLAIMER_PREFIX) ? md : DISCLAIMER_PREFIX + md;
  }

  // Helper function to handle auto-save after CRUD operations
  async function handleAutoSave(autoSave: boolean | undefined, operationResult: any): Promise<{ saveResult?: SaveModelOutput; warning?: string }> {
    if (!autoSave) {
      return {};
    }

    try {
      // Auto-save with no backup and validation enabled
      const saveResult = await saveModelHandler({
        createBackup: false,
        validate: true
      });

      const warning = '⚠️ Auto-save performed without backup. Ensure backups are managed externally.';
      logger.log('info', 'model.autosave.success', { path: saveResult.path });
      
      return { saveResult, warning };
    } catch (err) {
      logger.log('error', 'model.autosave.failed', { error: (err as Error)?.message || String(err) });
      throw new Error(`Operation succeeded but auto-save failed: ${(err as Error)?.message || String(err)}`);
    }
  }

  async function searchViewsHandler(input: SearchViewsInput): Promise<SearchViewsOutput> {
    return logger.auditToolInvocation('SearchViews', input, async () => {
      const q = input?.query ? String(input.query).toLowerCase() : '';
      const model = loader.load();
      let views = model.views || [];
      if (q) views = views.filter(v => (v.name || '').toLowerCase().includes(q));
      if (cfg.viewsFilterByProperty) {
        const pname = cfg.viewsFilterPropertyName;
        views = views.filter(v => v.properties && Object.prototype.hasOwnProperty.call(v.properties, pname));
      }
      const markdown = withDisclaimer(renderViewListMarkdown(views));
      const out = createSearchViewsOutput(markdown);
      (out as any).__audit = {
        resultCount: views.length
      };
      return out;
    });
  }

  async function getViewDetailsHandler(input: GetViewDetailsInput): Promise<GetViewDetailsOutput> {
    return logger.auditToolInvocation('GetViewDetails', input, async () => {
      if (!input || !input.viewname) throw new Error('viewname required');
      const model = loader.load();
      // find by exact name or contains
      const searchName = String(input.viewname || '').toLowerCase();
      const v = model.views.find(x => String(x.name || '').toLowerCase() === searchName)
        || model.views.find(x => String(x.name || '').toLowerCase().includes(searchName));
      let out: GetViewDetailsOutput;
      if (!v) {
        out = createGetViewDetailsOutput(`# View not found: ${input.viewname}`);
        (out as any).__audit = { found: false };
        return out;
      }
      const markdown = withDisclaimer(renderViewDetailsMarkdownFromModel(model, v));
      out = createGetViewDetailsOutput(markdown, v.id);
      (out as any).__audit = { found: true, viewId: v.id };
      return out;
    });
  }

  async function searchElementsHandler(input: SearchElementsInput): Promise<SearchElementsOutput> {
    return logger.auditToolInvocation('SearchElements', input, async () => {
      const q = input?.query ? String(input.query).toLowerCase() : '';
      const t = input?.type ? String(input.type).toLowerCase() : '';
      const model = loader.load();
      let elements = model.elements || [];

      // Filter by query (name or documentation)
      if (q) {
        elements = elements.filter(e => 
          (e.name || '').toLowerCase().includes(q) || 
          (e.documentation || '').toLowerCase().includes(q) ||
          Object.entries(e.properties || {}).some(([key, value]) => 
            String(key || '').toLowerCase().includes(q) || String(value || '').toLowerCase().includes(q)
          )
        );
      }

      // Filter by type if specified
      if (t) {
        elements = elements.filter(e => (e.type || '').toLowerCase().includes(t));
      }

      const markdown = withDisclaimer(renderElementListMarkdown(elements));
      const out = createSearchElementsOutput(markdown);
      (out as any).__audit = {
        resultCount: elements.length
      };
      return out;
    });
  }

  async function getElementDetailsHandler(input: GetElementDetailsInput): Promise<GetElementDetailsOutput> {
    return logger.auditToolInvocation('GetElementDetails', input, async () => {
      if (!input || !input.elementname) throw new Error('elementname required');
      const model = loader.load();

      // Find element by exact name or contains
      const element = model.elements.find(x => (x.name || '').toLowerCase() === input.elementname.toLowerCase())
        || model.elements.find(x => (x.name || '').toLowerCase().includes(input.elementname.toLowerCase()));

      let out: GetElementDetailsOutput;
      if (!element) {
        out = createGetElementDetailsOutput(`# Element not found: ${input.elementname}`);
        (out as any).__audit = { found: false };
        return out;
      }

      const markdown = withDisclaimer(renderElementDetailsMarkdownFromModel(model, element));
      out = createGetElementDetailsOutput(markdown, element.id);
      (out as any).__audit = { found: true, elementId: element.id };
      return out;
    });
  }

  // ============================================================================
  // Element Management Handlers
  // ============================================================================

  async function createElementHandler(input: CreateElementInput): Promise<CreateElementOutput> {
    return logger.auditToolInvocation('CreateElement', input, async () => {
      if (!input || !input.type || !input.name) {
        throw new Error('type and name are required');
      }

      const element = await manipulator.createElement({
        type: input.type,
        name: input.name,
        identifier: input.identifier,
        documentation: input.documentation,
        properties: input.properties
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, element);

      const model = manipulator.getModel();
      let markdown = renderElementDetailsMarkdownFromModel(model, element);
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createElementOutput(element.id, markdown);
      (out as any).__audit = { elementId: element.id, type: element.type, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function updateElementHandler(input: UpdateElementInput): Promise<UpdateElementOutput> {
    return logger.auditToolInvocation('UpdateElement', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      const element = await manipulator.updateElement(input.identifier, {
        name: input.name,
        type: input.type,
        documentation: input.documentation,
        properties: input.properties
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, element);

      const model = manipulator.getModel();
      let markdown = renderElementDetailsMarkdownFromModel(model, element);
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createUpdateElementOutput(element.id, markdown);
      (out as any).__audit = { elementId: element.id, changes: Object.keys(input).filter(k => k !== 'identifier' && k !== 'autoSave'), autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function deleteElementHandler(input: DeleteElementInput): Promise<DeleteElementOutput> {
    return logger.auditToolInvocation('DeleteElement', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      await manipulator.deleteElement(input.identifier, {
        cascade: input.cascade !== false, // Default to true
        validate: true
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, { identifier: input.identifier });

      let markdown = `# Element Deleted\n\nElement with identifier "${input.identifier}" has been successfully deleted.`;
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createDeleteElementOutput(true, markdown);
      (out as any).__audit = { elementId: input.identifier, cascade: input.cascade !== false, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  // ============================================================================
  // Relationship Management Handlers
  // ============================================================================

  async function createRelationshipHandler(input: CreateRelationshipInput): Promise<CreateRelationshipOutput> {
    return logger.auditToolInvocation('CreateRelationship', input, async () => {
      if (!input || !input.type || !input.sourceId || !input.targetId) {
        throw new Error('type, sourceId, and targetId are required');
      }

      const relationship = await manipulator.createRelationship({
        type: input.type,
        sourceId: input.sourceId,
        targetId: input.targetId,
        identifier: input.identifier,
        name: input.name,
        documentation: input.documentation,
        properties: input.properties
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, relationship);

      let markdown = `# Relationship Created\n\n` +
        `**ID:** ${relationship.id}\n` +
        `**Type:** ${relationship.type}\n` +
        `**Source:** ${relationship.sourceId}\n` +
        `**Target:** ${relationship.targetId}\n` +
        (relationship.name ? `**Name:** ${relationship.name}\n` : '') +
        (relationship.documentation ? `**Documentation:** ${relationship.documentation}\n` : '');
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createRelationshipOutput(relationship.id, markdown);
      (out as any).__audit = { relationshipId: relationship.id, type: relationship.type, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function updateRelationshipHandler(input: UpdateRelationshipInput): Promise<UpdateRelationshipOutput> {
    return logger.auditToolInvocation('UpdateRelationship', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      const relationship = await manipulator.updateRelationship(input.identifier, {
        type: input.type,
        sourceId: input.sourceId,
        targetId: input.targetId,
        name: input.name,
        documentation: input.documentation,
        properties: input.properties
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, relationship);

      let markdown = `# Relationship Updated\n\n` +
        `**ID:** ${relationship.id}\n` +
        `**Type:** ${relationship.type}\n` +
        `**Source:** ${relationship.sourceId}\n` +
        `**Target:** ${relationship.targetId}\n` +
        (relationship.name ? `**Name:** ${relationship.name}\n` : '') +
        (relationship.documentation ? `**Documentation:** ${relationship.documentation}\n` : '');
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createUpdateRelationshipOutput(relationship.id, markdown);
      (out as any).__audit = { relationshipId: relationship.id, changes: Object.keys(input).filter(k => k !== 'identifier' && k !== 'autoSave'), autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function deleteRelationshipHandler(input: DeleteRelationshipInput): Promise<DeleteRelationshipOutput> {
    return logger.auditToolInvocation('DeleteRelationship', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      await manipulator.deleteRelationship(input.identifier);

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, { identifier: input.identifier });

      let markdown = `# Relationship Deleted\n\nRelationship with identifier "${input.identifier}" has been successfully deleted.`;
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createDeleteRelationshipOutput(true, markdown);
      (out as any).__audit = { relationshipId: input.identifier, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  // ============================================================================
  // View Management Handlers
  // ============================================================================

  async function createViewHandler(input: CreateViewInput): Promise<CreateViewOutput> {
    return logger.auditToolInvocation('CreateView', input, async () => {
      if (!input || !input.name) {
        throw new Error('name is required');
      }

      const view = await manipulator.createView({
        name: input.name,
        identifier: input.identifier,
        type: input.type,
        viewpoint: input.viewpoint,
        documentation: input.documentation,
        properties: input.properties,
        elements: input.elements,
        relationships: input.relationships,
        nodeHierarchy: input.nodeHierarchy
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, view);

      const model = manipulator.getModel();
      let markdown = renderViewDetailsMarkdownFromModel(model, view);
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createViewOutput(view.id, markdown);
      (out as any).__audit = { viewId: view.id, name: view.name, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function updateViewHandler(input: UpdateViewInput): Promise<UpdateViewOutput> {
    return logger.auditToolInvocation('UpdateView', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      const view = await manipulator.updateView(input.identifier, {
        name: input.name,
        type: input.type,
        viewpoint: input.viewpoint,
        documentation: input.documentation,
        properties: input.properties,
        elements: input.elements,
        relationships: input.relationships,
        nodeHierarchy: input.nodeHierarchy
      });

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, view);

      const model = manipulator.getModel();
      let markdown = renderViewDetailsMarkdownFromModel(model, view);
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createUpdateViewOutput(view.id, markdown);
      (out as any).__audit = { viewId: view.id, changes: Object.keys(input).filter(k => k !== 'identifier' && k !== 'autoSave'), autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function addElementToViewHandler(input: AddElementToViewInput): Promise<AddElementToViewOutput> {
    return logger.auditToolInvocation('AddElementToView', input, async () => {
      if (!input || !input.viewId || !input.elementId) {
        throw new Error('viewId and elementId are required');
      }

      await manipulator.addElementToView(input.viewId, input.elementId, input.parentElementId);

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, { viewId: input.viewId, elementId: input.elementId });

      let markdown = `# Element Added to View\n\n` +
        `Element "${input.elementId}" has been successfully added to view "${input.viewId}".` +
        (input.parentElementId ? `\n\nParent element: ${input.parentElementId}` : '');
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createAddElementToViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.viewId, elementId: input.elementId, parentElementId: input.parentElementId, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function removeElementFromViewHandler(input: RemoveElementFromViewInput): Promise<RemoveElementFromViewOutput> {
    return logger.auditToolInvocation('RemoveElementFromView', input, async () => {
      if (!input || !input.viewId || !input.elementId) {
        throw new Error('viewId and elementId are required');
      }

      await manipulator.removeElementFromView(input.viewId, input.elementId);

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, { viewId: input.viewId, elementId: input.elementId });

      let markdown = `# Element Removed from View\n\n` +
        `Element "${input.elementId}" has been successfully removed from view "${input.viewId}".`;
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createRemoveElementFromViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.viewId, elementId: input.elementId, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  async function deleteViewHandler(input: DeleteViewInput): Promise<DeleteViewOutput> {
    return logger.auditToolInvocation('DeleteView', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      await manipulator.deleteView(input.identifier);

      // Handle auto-save if requested
      const { saveResult, warning } = await handleAutoSave(input.autoSave, { identifier: input.identifier });

      let markdown = `# View Deleted\n\nView with identifier "${input.identifier}" has been successfully deleted.`;
      if (saveResult) {
        markdown += `\n\n**Save Result:** ${saveResult.markdown}`;
      }
      if (warning) {
        markdown += `\n\n${warning}`;
      }
      markdown = withDisclaimer(markdown);
      
      const out = createDeleteViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.identifier, autoSave: input.autoSave || false };
      if (saveResult) {
        (out as any).saveResult = saveResult;
      }
      return out;
    });
  }

  // ============================================================================
  // Validation Handlers
  // ============================================================================

  async function validateModelHandler(input: ValidateModelInput): Promise<ValidateModelOutput> {
    return logger.auditToolInvocation('ValidateModel', input, async () => {
      const validationResult = await manipulator.validateModel();
      const reporter = new ValidationReporter();
      
      // Generate comprehensive report
      const report = reporter.createReport(validationResult, validationResult, validationResult);
      const markdown = withDisclaimer(reporter.toMarkdown(report));
      
      const out = createValidateModelOutput(validationResult.valid, markdown, report);
      (out as any).__audit = { 
        valid: validationResult.valid, 
        errorCount: validationResult.errors.length 
      };
      return out;
    });
  }

  async function validateElementHandler(input: ValidateElementInput): Promise<ValidateElementOutput> {
    return logger.auditToolInvocation('ValidateElement', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      const element = manipulator.getElement(input.identifier);
      if (!element) {
        throw new Error(`Element not found: ${input.identifier}`);
      }

      const validationResult = await manipulator.validateElement(element);
      const reporter = new ValidationReporter();
      
      // Generate report for single element
      const report = reporter.createReport(validationResult, validationResult, validationResult);
      const markdown = withDisclaimer(
        `# Element Validation: ${element.name}\n\n` +
        `**ID:** ${element.id}\n\n` +
        reporter.toMarkdown(report)
      );
      
      const out = createValidateElementOutput(validationResult.valid, markdown, report);
      (out as any).__audit = { 
        elementId: input.identifier,
        valid: validationResult.valid, 
        errorCount: validationResult.errors.length 
      };
      return out;
    });
  }

  async function validateRelationshipHandler(input: ValidateRelationshipInput): Promise<ValidateRelationshipOutput> {
    return logger.auditToolInvocation('ValidateRelationship', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      const relationship = manipulator.getRelationship(input.identifier);
      if (!relationship) {
        throw new Error(`Relationship not found: ${input.identifier}`);
      }

      const validationResult = await manipulator.validateRelationship(relationship);
      const reporter = new ValidationReporter();
      
      // Generate report for single relationship
      const report = reporter.createReport(validationResult, validationResult, validationResult);
      const markdown = withDisclaimer(
        `# Relationship Validation: ${relationship.type}\n\n` +
        `**ID:** ${relationship.id}\n` +
        `**Source:** ${relationship.sourceId}\n` +
        `**Target:** ${relationship.targetId}\n\n` +
        reporter.toMarkdown(report)
      );
      
      const out = createValidateRelationshipOutput(validationResult.valid, markdown, report);
      (out as any).__audit = { 
        relationshipId: input.identifier,
        valid: validationResult.valid, 
        errorCount: validationResult.errors.length 
      };
      return out;
    });
  }

  // ============================================================================
  // Model Persistence Handlers
  // ============================================================================

  async function saveModelHandler(input: SaveModelInput): Promise<SaveModelOutput> {
    return logger.auditToolInvocation('SaveModel', input, async () => {
      const modelPath = manipulator.getModel() ? loader.getPath() : null;
      if (!modelPath && !input?.path) {
        throw new Error('No model file path available. Specify a path in the save request.');
      }

      await manipulator.save(input?.path, {
        createBackup: input?.createBackup !== false, // Default to true
        validate: input?.validate !== false // Default to true
      });

      const savedPath = input?.path || modelPath || 'unknown';
      const markdown = withDisclaimer(
        `# Model Saved Successfully\n\n` +
        `**Path:** ${savedPath}\n` +
        `**Backup Created:** ${input?.createBackup !== false ? 'Yes' : 'No'}\n` +
        `**Validated:** ${input?.validate !== false ? 'Yes' : 'No'}\n\n` +
        `All changes have been persisted to the model file.`
      );
      
      const out = createSaveModelOutput(true, savedPath, markdown);
      (out as any).__audit = { path: savedPath, backup: input?.createBackup !== false };
      return out;
    });
  }

  async function getModelPathHandler(input: GetModelPathInput): Promise<GetModelPathOutput> {
    return logger.auditToolInvocation('GetModelPath', input, async () => {
      const modelPath = loader.getPath();
      const modified = manipulator.isModified();
      
      const markdown = withDisclaimer(
        `# Model File Information\n\n` +
        `**Path:** ${modelPath}\n` +
        `**Status:** ${modified ? 'Modified (unsaved changes)' : 'Unchanged'}\n\n` +
        (modified 
          ? `⚠️ **Warning:** There are unsaved changes. Use SaveModel to persist changes to the file.`
          : `All changes have been saved.`)
      );
      
      const out = createGetModelPathOutput(modelPath, modified, markdown);
      (out as any).__audit = { path: modelPath, modified };
      return out;
    });
  }

  async function setModelPathHandler(input: SetModelPathInput): Promise<SetModelPathOutput> {
    return logger.auditToolInvocation('SetModelPath', input, async () => {
      if (!input || !input.path) {
        throw new Error('path is required');
      }

      // Check for unsaved changes in current model
      const hasUnsavedChanges = manipulator.isModified();
      let warning: string | undefined;
      if (hasUnsavedChanges) {
        warning = 'Current model has unsaved changes. These changes will be lost when switching models.';
        logger.log('warn', 'model.path.change.unsaved', { 
          currentPath: loader.getPath(), 
          newPath: input.path 
        });
      }

      // Validate path
      const validationResult = validateModelPath(input.path);
      if (!validationResult.valid) {
        logger.log('error', 'model.path.validation.failed', { 
          path: input.path, 
          error: validationResult.error 
        });
        throw new Error(`Path validation failed: ${validationResult.error}`);
      }

      const resolvedPath = validationResult.resolvedPath!;
      const previousPath = loader.getPath();

      // Try to load the new model to validate it's valid ArchiMate XML
      try {
        loader.setPath(resolvedPath);
        manipulator.reload(); // Reload manipulator with new model
        
        const model = manipulator.getModel();
        const elementCount = model.elements?.length || 0;
        const viewCount = model.views?.length || 0;

        const markdown = withDisclaimer(
          `# Model Path Changed Successfully\n\n` +
          `**New Path:** ${resolvedPath}\n` +
          `**Elements:** ${elementCount}\n` +
          `**Views:** ${viewCount}\n` +
          `**Status:** ${hasUnsavedChanges ? '⚠️ Previous model had unsaved changes (lost)' : 'Clean switch'}\n\n` +
          (warning ? `⚠️ **Warning:** ${warning}\n\n` : '') +
          `Model loaded successfully.`
        );

        const out = createSetModelPathOutput(
          true,
          resolvedPath,
          elementCount,
          viewCount,
          false, // New model has no unsaved changes
          markdown,
          warning
        );
        
        (out as any).__audit = { 
          path: resolvedPath, 
          elementCount, 
          viewCount,
          hadUnsavedChanges: hasUnsavedChanges
        };
        
        logger.log('info', 'model.path.change.success', { 
          path: resolvedPath, 
          elementCount, 
          viewCount 
        });
        
        return out;
      } catch (err) {
        // Restore previous path on failure
        loader.setPath(previousPath);
        logger.log('error', 'model.path.change.failed', { 
          path: resolvedPath, 
          previousPath,
          error: (err as Error)?.message || String(err) 
        });
        throw new Error(`Failed to load model from path: ${(err as Error)?.message || String(err)}`);
      }
    });
  }

  async function createModelHandler(input: CreateModelInput): Promise<CreateModelOutput> {
    return logger.auditToolInvocation('CreateModel', input, async () => {
      if (!input || !input.path) {
        throw new Error('path is required');
      }

      // Check for unsaved changes in current model
      const hasUnsavedChanges = manipulator.isModified();
      if (hasUnsavedChanges) {
        throw new Error('Current model has unsaved changes. Please save or discard changes before creating a new model.');
      }

      // Validate path (but don't require file to exist)
      const validationResult = validatePath(input.path, {
        checkExists: false,
        checkReadable: false,
        mustBeFile: true
      });
      if (!validationResult.valid) {
        logger.log('error', 'model.create.path.validation.failed', { 
          path: input.path, 
          error: validationResult.error 
        });
        throw new Error(`Path validation failed: ${validationResult.error}`);
      }

      const resolvedPath = validationResult.resolvedPath!;

      // Check if file already exists (prevent overwrite)
      if (existsSync(resolvedPath)) {
        logger.log('error', 'model.create.file.exists', { path: resolvedPath });
        throw new Error(`File already exists at path: ${resolvedPath}. Use SetModelPath to load an existing model.`);
      }

      // Generate identifier if not provided
      const identifier = input.identifier || `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const modelName = input.name || 'New ArchiMate Model';

      // Simple XML escape function
      const escapeXml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      // Create parent directories if they don't exist
      const parentDir = dirname(resolvedPath);
      try {
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
          logger.log('info', 'model.create.directory.created', { path: parentDir });
        }
      } catch (err) {
        logger.log('error', 'model.create.directory.failed', { 
          path: parentDir, 
          error: (err as Error)?.message || String(err) 
        });
        throw new Error(`Failed to create directory: ${(err as Error)?.message || String(err)}`);
      }

      // Create empty ArchiMate model XML
      const emptyModelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengroup.org/xsd/archimate/3.0/ http://www.opengroup.org/xsd/archimate/3.1/archimate3_Diagram.xsd" identifier="${escapeXml(identifier)}">
  <name xml:lang="en">${escapeXml(modelName)}</name>
</model>`;

      // Write the file
      try {
        writeFileSync(resolvedPath, emptyModelXml, 'utf8');
        logger.log('info', 'model.create.file.created', { path: resolvedPath, identifier, name: modelName });
      } catch (err) {
        logger.log('error', 'model.create.file.write.failed', { 
          path: resolvedPath, 
          error: (err as Error)?.message || String(err) 
        });
        throw new Error(`Failed to write model file: ${(err as Error)?.message || String(err)}`);
      }

      // Load the newly created model
      const previousPath = loader.getPath();
      try {
        loader.setPath(resolvedPath);
        manipulator.reload();
        
        const model = manipulator.getModel();
        const elementCount = model.elements?.length || 0;
        const viewCount = model.views?.length || 0;
        const relationshipCount = model.relationships?.length || 0;

        const markdown = withDisclaimer(
          `# New Model Created Successfully\n\n` +
          `**Path:** ${resolvedPath}\n` +
          `**Name:** ${modelName}\n` +
          `**Identifier:** ${identifier}\n` +
          `**Elements:** ${elementCount}\n` +
          `**Views:** ${viewCount}\n` +
          `**Relationships:** ${relationshipCount}\n\n` +
          `The new empty ArchiMate model has been created and loaded successfully.`
        );

        const out = createCreateModelOutput(
          true,
          resolvedPath,
          elementCount,
          viewCount,
          relationshipCount,
          false, // New model has no unsaved changes
          'New model created successfully',
          markdown
        );
        
        (out as any).__audit = { 
          path: resolvedPath, 
          identifier,
          name: modelName,
          elementCount, 
          viewCount,
          relationshipCount
        };
        
        logger.log('info', 'model.create.success', { 
          path: resolvedPath, 
          elementCount, 
          viewCount,
          relationshipCount
        });
        
        return out;
      } catch (err) {
        // Restore previous path on failure
        loader.setPath(previousPath);
        logger.log('error', 'model.create.load.failed', { 
          path: resolvedPath, 
          previousPath,
          error: (err as Error)?.message || String(err) 
        });
        throw new Error(`Failed to load newly created model: ${(err as Error)?.message || String(err)}`);
      }
    });
  }

  return { 
    searchViewsHandler, 
    getViewDetailsHandler, 
    searchElementsHandler, 
    getElementDetailsHandler,
    createElementHandler,
    updateElementHandler,
    deleteElementHandler,
    createRelationshipHandler,
    updateRelationshipHandler,
    deleteRelationshipHandler,
    createViewHandler,
    updateViewHandler,
    addElementToViewHandler,
    removeElementFromViewHandler,
    deleteViewHandler,
    validateModelHandler,
    validateElementHandler,
    validateRelationshipHandler,
    saveModelHandler,
    getModelPathHandler,
    setModelPathHandler,
    createModelHandler,
    loader,
    manipulator
  };
}

export type ToolsFactory = ReturnType<typeof createTools>;
