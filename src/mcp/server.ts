import { appService } from '../services/app';
import { z } from 'zod';
import { getLogger } from '../utils/logger';

type SdkServer = any;

// Create and start an MCP server registering our tools. This function will try to import
// the `@modelcontextprotocol/sdk` package and register tools using a best-effort API.
// If the SDK is not available, it will return a shim that exposes the tools for in-process use.
export async function createMcpServer() {
  const tools = appService.tools;
  let sdkServer: SdkServer | null = null;
  const logger = getLogger();
  
  try {
    // Try to load the high-level McpServer (preferred approach)
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    
    console.info('MCP: initialising server');
    logger.log('info', 'mcp.init', { message: 'initialising server' });
    
    const server = new McpServer(
      { name: 'ArchiScribe MCP', version: '1.0.0' }, 
      { capabilities: { tools: { listChanged: true } } }
    );

    // Register the SearchViews tool
    server.registerTool(
      'SearchViews',
      {
        title: 'Search Views',
        description: 'Search view names in the ArchiMate model',
        inputSchema: { 
          query: z.string().optional().describe('Search keyword to filter view names') 
        },
      },
      async (args: { query?: string }) => {
        const out = await tools.searchViewsHandler({ query: args?.query });
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: SearchViews');
    logger.log('info', 'mcp.tool.register', { tool: 'SearchViews', highLevel: true });

    // Register the GetViewDetails tool
    server.registerTool(
      'GetViewDetails',
      {
        title: 'Get View Details',
        description: 'Get detailed markdown for a named view in the ArchiMate model',
        inputSchema: { 
          viewname: z.string().describe('The exact name of the view to retrieve details for') 
        },
      },
      async (args: { viewname: string }) => {
        const out = await tools.getViewDetailsHandler({ viewname: args.viewname });
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: GetViewDetails');
    logger.log('info', 'mcp.tool.register', { tool: 'GetViewDetails', highLevel: true });

    // Register the SearchElements tool
    server.registerTool(
      'SearchElements',
      {
        title: 'Search Elements',
        description: 'Search elements in the ArchiMate model by name, type, or documentation',
        inputSchema: { 
          query: z.string().optional().describe('Search keyword to filter element names, documentation, and properties'),
          type: z.string().optional().describe('Filter elements by type')
        },
      },
      async (args: { query?: string, type?: string }) => {
        const out = await tools.searchElementsHandler({ query: args?.query, type: args?.type });
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: SearchElements');
    logger.log('info', 'mcp.tool.register', { tool: 'SearchElements', highLevel: true });

    // Register the GetElementDetails tool
    server.registerTool(
      'GetElementDetails',
      {
        title: 'Get Element Details',
        description: 'Get detailed markdown for a named element in the ArchiMate model',
        inputSchema: { 
          elementname: z.string().describe('The name of the element to retrieve details for') 
        },
      },
      async (args: { elementname: string }) => {
        const out = await tools.getElementDetailsHandler({ elementname: args.elementname });
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: GetElementDetails');
    logger.log('info', 'mcp.tool.register', { tool: 'GetElementDetails', highLevel: true });

    // ============================================================================
    // Element Management Tools
    // ============================================================================

    // Register the CreateElement tool
    server.registerTool(
      'CreateElement',
      {
        title: 'Create Element',
        description: 'Create a new element in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          type: z.string().describe('ArchiMate element type (e.g., ApplicationComponent, BusinessProcess)'),
          name: z.string().describe('Element name'),
          identifier: z.string().optional().describe('Element identifier (auto-generated if not provided)'),
          documentation: z.string().optional().describe('Element documentation'),
          properties: z.record(z.string()).optional().describe('Custom properties as key-value pairs'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { type: string; name: string; identifier?: string; documentation?: string; properties?: Record<string, string>; autoSave?: boolean }) => {
        const out = await tools.createElementHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: CreateElement');
    logger.log('info', 'mcp.tool.register', { tool: 'CreateElement', highLevel: true });

    // Register the UpdateElement tool
    server.registerTool(
      'UpdateElement',
      {
        title: 'Update Element',
        description: 'Update an existing element in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('Element identifier'),
          name: z.string().optional().describe('Updated element name'),
          type: z.string().optional().describe('Updated element type'),
          documentation: z.string().optional().describe('Updated element documentation'),
          properties: z.record(z.string()).optional().describe('Updated custom properties as key-value pairs'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { identifier: string; name?: string; type?: string; documentation?: string; properties?: Record<string, string>; autoSave?: boolean }) => {
        const out = await tools.updateElementHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: UpdateElement');
    logger.log('info', 'mcp.tool.register', { tool: 'UpdateElement', highLevel: true });

    // Register the DeleteElement tool
    server.registerTool(
      'DeleteElement',
      {
        title: 'Delete Element',
        description: 'Delete an element from the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('Element identifier'),
          cascade: z.boolean().optional().describe('If true, delete dependent relationships and remove from views (default: true)'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { identifier: string; cascade?: boolean; autoSave?: boolean }) => {
        const out = await tools.deleteElementHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: DeleteElement');
    logger.log('info', 'mcp.tool.register', { tool: 'DeleteElement', highLevel: true });

    // ============================================================================
    // Relationship Management Tools
    // ============================================================================

    // Register the CreateRelationship tool
    server.registerTool(
      'CreateRelationship',
      {
        title: 'Create Relationship',
        description: 'Create a new relationship between elements in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          type: z.string().describe('ArchiMate relationship type (e.g., Serving, Access, Composition)'),
          sourceId: z.string().describe('Source element identifier'),
          targetId: z.string().describe('Target element identifier'),
          identifier: z.string().optional().describe('Relationship identifier (auto-generated if not provided)'),
          name: z.string().optional().describe('Relationship name'),
          documentation: z.string().optional().describe('Relationship documentation'),
          properties: z.record(z.string()).optional().describe('Custom properties as key-value pairs'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { type: string; sourceId: string; targetId: string; identifier?: string; name?: string; documentation?: string; properties?: Record<string, string>; autoSave?: boolean }) => {
        const out = await tools.createRelationshipHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: CreateRelationship');
    logger.log('info', 'mcp.tool.register', { tool: 'CreateRelationship', highLevel: true });

    // Register the UpdateRelationship tool
    server.registerTool(
      'UpdateRelationship',
      {
        title: 'Update Relationship',
        description: 'Update an existing relationship in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('Relationship identifier'),
          type: z.string().optional().describe('Updated relationship type'),
          sourceId: z.string().optional().describe('Updated source element identifier'),
          targetId: z.string().optional().describe('Updated target element identifier'),
          name: z.string().optional().describe('Updated relationship name'),
          documentation: z.string().optional().describe('Updated relationship documentation'),
          properties: z.record(z.string()).optional().describe('Updated custom properties as key-value pairs'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { identifier: string; type?: string; sourceId?: string; targetId?: string; name?: string; documentation?: string; properties?: Record<string, string>; autoSave?: boolean }) => {
        const out = await tools.updateRelationshipHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: UpdateRelationship');
    logger.log('info', 'mcp.tool.register', { tool: 'UpdateRelationship', highLevel: true });

    // Register the DeleteRelationship tool
    server.registerTool(
      'DeleteRelationship',
      {
        title: 'Delete Relationship',
        description: 'Delete a relationship from the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('Relationship identifier'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { identifier: string; autoSave?: boolean }) => {
        const out = await tools.deleteRelationshipHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: DeleteRelationship');
    logger.log('info', 'mcp.tool.register', { tool: 'DeleteRelationship', highLevel: true });

    // ============================================================================
    // View Management Tools
    // ============================================================================

    // Register the CreateView tool
    server.registerTool(
      'CreateView',
      {
        title: 'Create View',
        description: 'Create a new view in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          name: z.string().describe('View name'),
          identifier: z.string().optional().describe('View identifier (auto-generated if not provided)'),
          type: z.string().optional().describe('View type'),
          viewpoint: z.string().optional().describe('Viewpoint identifier'),
          documentation: z.string().optional().describe('View documentation'),
          properties: z.record(z.string()).optional().describe('Custom properties as key-value pairs'),
          elements: z.array(z.string()).optional().describe('Element IDs to include in view'),
          relationships: z.array(z.string()).optional().describe('Relationship IDs to include in view'),
          nodeHierarchy: z.array(z.object({
            parentElement: z.string(),
            childElement: z.string()
          })).optional().describe('Node hierarchy (parent-child relationships)'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: any) => {
        const out = await tools.createViewHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: CreateView');
    logger.log('info', 'mcp.tool.register', { tool: 'CreateView', highLevel: true });

    // Register the UpdateView tool
    server.registerTool(
      'UpdateView',
      {
        title: 'Update View',
        description: 'Update an existing view in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('View identifier'),
          name: z.string().optional().describe('Updated view name'),
          type: z.string().optional().describe('Updated view type'),
          viewpoint: z.string().optional().describe('Updated viewpoint identifier'),
          documentation: z.string().optional().describe('Updated view documentation'),
          properties: z.record(z.string()).optional().describe('Updated custom properties as key-value pairs'),
          elements: z.array(z.string()).optional().describe('Updated element IDs in view'),
          relationships: z.array(z.string()).optional().describe('Updated relationship IDs in view'),
          nodeHierarchy: z.array(z.object({
            parentElement: z.string(),
            childElement: z.string()
          })).optional().describe('Updated node hierarchy (parent-child relationships)'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: any) => {
        const out = await tools.updateViewHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: UpdateView');
    logger.log('info', 'mcp.tool.register', { tool: 'UpdateView', highLevel: true });

    // Register the AddElementToView tool
    server.registerTool(
      'AddElementToView',
      {
        title: 'Add Element to View',
        description: 'Add an element to a view in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          viewId: z.string().describe('View identifier'),
          elementId: z.string().describe('Element identifier'),
          parentElementId: z.string().optional().describe('Optional parent element identifier for hierarchy'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { viewId: string; elementId: string; parentElementId?: string; autoSave?: boolean }) => {
        const out = await tools.addElementToViewHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: AddElementToView');
    logger.log('info', 'mcp.tool.register', { tool: 'AddElementToView', highLevel: true });

    // Register the RemoveElementFromView tool
    server.registerTool(
      'RemoveElementFromView',
      {
        title: 'Remove Element from View',
        description: 'Remove an element from a view in the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          viewId: z.string().describe('View identifier'),
          elementId: z.string().describe('Element identifier'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { viewId: string; elementId: string; autoSave?: boolean }) => {
        const out = await tools.removeElementFromViewHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: RemoveElementFromView');
    logger.log('info', 'mcp.tool.register', { tool: 'RemoveElementFromView', highLevel: true });

    // Register the DeleteView tool
    server.registerTool(
      'DeleteView',
      {
        title: 'Delete View',
        description: 'Delete a view from the ArchiMate model. ⚠️ WARNING: If autoSave is true, changes are saved without backup. Create a backup first using SaveModel with createBackup: true.',
        inputSchema: {
          identifier: z.string().describe('View identifier'),
          autoSave: z.boolean().optional().describe('If true, automatically save after operation without backup (default: false). ⚠️ WARNING: Ensure backups are managed externally.')
        },
      },
      async (args: { identifier: string; autoSave?: boolean }) => {
        const out = await tools.deleteViewHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: DeleteView');
    logger.log('info', 'mcp.tool.register', { tool: 'DeleteView', highLevel: true });

    // ============================================================================
    // Validation Tools
    // ============================================================================

    // Register the ValidateModel tool
    server.registerTool(
      'ValidateModel',
      {
        title: 'Validate Model',
        description: 'Validate the entire ArchiMate model (XSD, business rules, referential integrity)',
        inputSchema: {
          strict: z.boolean().optional().describe('If true, use strict validation mode'),
          includeWarnings: z.boolean().optional().describe('If true, include warnings in validation report')
        },
      },
      async (args: { strict?: boolean; includeWarnings?: boolean }) => {
        const out = await tools.validateModelHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: ValidateModel');
    logger.log('info', 'mcp.tool.register', { tool: 'ValidateModel', highLevel: true });

    // Register the ValidateElement tool
    server.registerTool(
      'ValidateElement',
      {
        title: 'Validate Element',
        description: 'Validate a specific element in the ArchiMate model',
        inputSchema: {
          identifier: z.string().describe('Element identifier')
        },
      },
      async (args: { identifier: string }) => {
        const out = await tools.validateElementHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: ValidateElement');
    logger.log('info', 'mcp.tool.register', { tool: 'ValidateElement', highLevel: true });

    // Register the ValidateRelationship tool
    server.registerTool(
      'ValidateRelationship',
      {
        title: 'Validate Relationship',
        description: 'Validate a specific relationship in the ArchiMate model',
        inputSchema: {
          identifier: z.string().describe('Relationship identifier')
        },
      },
      async (args: { identifier: string }) => {
        const out = await tools.validateRelationshipHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: ValidateRelationship');
    logger.log('info', 'mcp.tool.register', { tool: 'ValidateRelationship', highLevel: true });

    // ============================================================================
    // Model Persistence Tools
    // ============================================================================

    // Register the SaveModel tool
    server.registerTool(
      'SaveModel',
      {
        title: 'Save Model',
        description: 'Save the ArchiMate model to file (persist all changes)',
        inputSchema: {
          path: z.string().optional().describe('Optional path to save to (defaults to configured model path)'),
          createBackup: z.boolean().optional().describe('If true, create a backup before saving (default: true)'),
          validate: z.boolean().optional().describe('If true, validate model before saving (default: true)')
        },
      },
      async (args: { path?: string; createBackup?: boolean; validate?: boolean }) => {
        const out = await tools.saveModelHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: SaveModel');
    logger.log('info', 'mcp.tool.register', { tool: 'SaveModel', highLevel: true });

    // Register the GetModelPath tool
    server.registerTool(
      'GetModelPath',
      {
        title: 'Get Model Path',
        description: 'Get the current model file path and modification status',
        inputSchema: {},
      },
      async () => {
        const out = await tools.getModelPathHandler({});
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: GetModelPath');
    logger.log('info', 'mcp.tool.register', { tool: 'GetModelPath', highLevel: true });

    // Register the SetModelPath tool
    server.registerTool(
      'SetModelPath',
      {
        title: 'Set Model Path',
        description: 'Dynamically change the ArchiMate model file path at runtime. Validates path security and warns if current model has unsaved changes.',
        inputSchema: {
          path: z.string().describe('Absolute or relative path to ArchiMate model file (.archimate or .xml)')
        },
      },
      async (args: { path: string }) => {
        const out = await tools.setModelPathHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: SetModelPath');
    logger.log('info', 'mcp.tool.register', { tool: 'SetModelPath', highLevel: true });

    // Register the CreateModel tool
    server.registerTool(
      'CreateModel',
      {
        title: 'Create Model',
        description: 'Create a new empty ArchiMate model at a specified path. ⚠️ WARNING: If current model has unsaved changes, operation will fail.',
        inputSchema: {
          path: z.string().describe('Absolute or relative path where to create the new model file (.archimate or .xml)'),
          name: z.string().optional().describe('Model name (default: "New ArchiMate Model")'),
          identifier: z.string().optional().describe('Model identifier (auto-generated if not provided)')
        },
      },
      async (args: { path: string; name?: string; identifier?: string }) => {
        const out = await tools.createModelHandler(args);
        return { content: [{ type: 'text', text: out.markdown }], structuredContent: out };
      }
    );
    console.info('MCP: registered tool: CreateModel');
    logger.log('info', 'mcp.tool.register', { tool: 'CreateModel', highLevel: true });

    sdkServer = server;
  } catch (err) {
    // SDK not available or registration failed; continue with in-process tools only
    const msg = (err as Error)?.message || String(err);
    console.warn('MCP SDK not loaded, falling back to in-process tools only:', msg);
    logger.log('warn', 'mcp.init.fallback', { message: 'SDK not loaded, using in-process tools', error: msg });
    sdkServer = null;
  }

  async function start() {
    if (sdkServer && typeof sdkServer.start === 'function') {
      await sdkServer.start();
      logger.log('info', 'mcp.server.start', { mode: 'sdk', tools: Object.keys(tools) });
    } else {
      logger.log('info', 'mcp.server.start', { mode: 'in-process', tools: Object.keys(tools) });
    }
    return { tools };
  }

  async function stop() {
    if (sdkServer && typeof sdkServer.stop === 'function') {
      await sdkServer.stop();
      logger.log('info', 'mcp.server.stop', { mode: 'sdk' });
    } else {
      logger.log('info', 'mcp.server.stop', { mode: 'in-process' });
    }
    return;
  }

  return { start, stop, tools, sdkServer };
}
