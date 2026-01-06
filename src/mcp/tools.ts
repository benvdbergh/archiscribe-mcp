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
}

export interface UpdateElementOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteElementInput {
  identifier: string;
  cascade?: boolean;
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
}

export interface UpdateRelationshipOutput {
  id: string;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteRelationshipInput {
  identifier: string;
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
}

export interface AddElementToViewOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

export interface RemoveElementFromViewInput {
  viewId: string;
  elementId: string;
}

export interface RemoveElementFromViewOutput {
  success: boolean;
  markdown: string;
  [key: string]: unknown;
}

export interface DeleteViewInput {
  identifier: string;
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

      const model = manipulator.getModel();
      const markdown = withDisclaimer(renderElementDetailsMarkdownFromModel(model, element));
      const out = createElementOutput(element.id, markdown);
      (out as any).__audit = { elementId: element.id, type: element.type };
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

      const model = manipulator.getModel();
      const markdown = withDisclaimer(renderElementDetailsMarkdownFromModel(model, element));
      const out = createUpdateElementOutput(element.id, markdown);
      (out as any).__audit = { elementId: element.id, changes: Object.keys(input).filter(k => k !== 'identifier') };
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

      const markdown = withDisclaimer(`# Element Deleted\n\nElement with identifier "${input.identifier}" has been successfully deleted.`);
      const out = createDeleteElementOutput(true, markdown);
      (out as any).__audit = { elementId: input.identifier, cascade: input.cascade !== false };
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

      const markdown = withDisclaimer(
        `# Relationship Created\n\n` +
        `**ID:** ${relationship.id}\n` +
        `**Type:** ${relationship.type}\n` +
        `**Source:** ${relationship.sourceId}\n` +
        `**Target:** ${relationship.targetId}\n` +
        (relationship.name ? `**Name:** ${relationship.name}\n` : '') +
        (relationship.documentation ? `**Documentation:** ${relationship.documentation}\n` : '')
      );
      const out = createRelationshipOutput(relationship.id, markdown);
      (out as any).__audit = { relationshipId: relationship.id, type: relationship.type };
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

      const markdown = withDisclaimer(
        `# Relationship Updated\n\n` +
        `**ID:** ${relationship.id}\n` +
        `**Type:** ${relationship.type}\n` +
        `**Source:** ${relationship.sourceId}\n` +
        `**Target:** ${relationship.targetId}\n` +
        (relationship.name ? `**Name:** ${relationship.name}\n` : '') +
        (relationship.documentation ? `**Documentation:** ${relationship.documentation}\n` : '')
      );
      const out = createUpdateRelationshipOutput(relationship.id, markdown);
      (out as any).__audit = { relationshipId: relationship.id, changes: Object.keys(input).filter(k => k !== 'identifier') };
      return out;
    });
  }

  async function deleteRelationshipHandler(input: DeleteRelationshipInput): Promise<DeleteRelationshipOutput> {
    return logger.auditToolInvocation('DeleteRelationship', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      await manipulator.deleteRelationship(input.identifier);

      const markdown = withDisclaimer(`# Relationship Deleted\n\nRelationship with identifier "${input.identifier}" has been successfully deleted.`);
      const out = createDeleteRelationshipOutput(true, markdown);
      (out as any).__audit = { relationshipId: input.identifier };
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

      const model = manipulator.getModel();
      const markdown = withDisclaimer(renderViewDetailsMarkdownFromModel(model, view));
      const out = createViewOutput(view.id, markdown);
      (out as any).__audit = { viewId: view.id, name: view.name };
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

      const model = manipulator.getModel();
      const markdown = withDisclaimer(renderViewDetailsMarkdownFromModel(model, view));
      const out = createUpdateViewOutput(view.id, markdown);
      (out as any).__audit = { viewId: view.id, changes: Object.keys(input).filter(k => k !== 'identifier') };
      return out;
    });
  }

  async function addElementToViewHandler(input: AddElementToViewInput): Promise<AddElementToViewOutput> {
    return logger.auditToolInvocation('AddElementToView', input, async () => {
      if (!input || !input.viewId || !input.elementId) {
        throw new Error('viewId and elementId are required');
      }

      await manipulator.addElementToView(input.viewId, input.elementId, input.parentElementId);

      const markdown = withDisclaimer(
        `# Element Added to View\n\n` +
        `Element "${input.elementId}" has been successfully added to view "${input.viewId}".` +
        (input.parentElementId ? `\n\nParent element: ${input.parentElementId}` : '')
      );
      const out = createAddElementToViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.viewId, elementId: input.elementId, parentElementId: input.parentElementId };
      return out;
    });
  }

  async function removeElementFromViewHandler(input: RemoveElementFromViewInput): Promise<RemoveElementFromViewOutput> {
    return logger.auditToolInvocation('RemoveElementFromView', input, async () => {
      if (!input || !input.viewId || !input.elementId) {
        throw new Error('viewId and elementId are required');
      }

      await manipulator.removeElementFromView(input.viewId, input.elementId);

      const markdown = withDisclaimer(
        `# Element Removed from View\n\n` +
        `Element "${input.elementId}" has been successfully removed from view "${input.viewId}".`
      );
      const out = createRemoveElementFromViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.viewId, elementId: input.elementId };
      return out;
    });
  }

  async function deleteViewHandler(input: DeleteViewInput): Promise<DeleteViewOutput> {
    return logger.auditToolInvocation('DeleteView', input, async () => {
      if (!input || !input.identifier) {
        throw new Error('identifier is required');
      }

      await manipulator.deleteView(input.identifier);

      const markdown = withDisclaimer(`# View Deleted\n\nView with identifier "${input.identifier}" has been successfully deleted.`);
      const out = createDeleteViewOutput(true, markdown);
      (out as any).__audit = { viewId: input.identifier };
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
    loader,
    manipulator
  };
}

export type ToolsFactory = ReturnType<typeof createTools>;
