# Using ArchiScribe MCP Server in Cursor

## Quick Start

### 1. Start the MCP Server

First, make sure the server is running:

```bash
cd /home/ben/mcp/archiscribe-mcp

# Development mode (auto-restart on changes)
npm run dev

# OR Production mode
npm run build
npm start
```

You should see output like:
```
MCP: initialising server
MCP: registered tool: SearchViews
MCP: registered tool: GetViewDetails
...
MCP: registered tool: ValidateRelationship
Server listening on port 3090
```

### 2. Configure Cursor

Cursor needs to be configured to connect to the MCP server. The server runs on **HTTP** at `http://localhost:3090/mcp`.

#### Using Cursor Settings

1. Open **Cursor Settings** → **Features** → **MCP**
2. Click **+ Add New MCP Server**
3. Configure:
   - **Name**: `archiscribe` (or any name you prefer)
   - **Type**: `HTTP`
   - **URL**: `http://localhost:3090/mcp`
4. Save the configuration
5. Click refresh to load the tools

The server should now appear in your MCP servers list with all 18 tools available.

#### Option B: Using stdio (if Cursor requires stdio-based MCP)

If Cursor only supports stdio-based MCP servers, you may need to use a wrapper script or modify the server to support stdio transport. The current implementation uses HTTP transport.

### 3. Verify Connection

Once configured, you should be able to use all 18 MCP tools in Cursor:

**Read Operations:**
- `SearchViews` - Search for views
- `GetViewDetails` - Get view details
- `SearchElements` - Search for elements
- `GetElementDetails` - Get element details

**Element Management:**
- `CreateElement` - Create new elements
- `UpdateElement` - Update elements
- `DeleteElement` - Delete elements

**Relationship Management:**
- `CreateRelationship` - Create relationships
- `UpdateRelationship` - Update relationships
- `DeleteRelationship` - Delete relationships

**View Management:**
- `CreateView` - Create views
- `UpdateView` - Update views
- `AddElementToView` - Add elements to views
- `RemoveElementFromView` - Remove elements from views
- `DeleteView` - Delete views

**Validation:**
- `ValidateModel` - Validate entire model
- `ValidateElement` - Validate specific element
- `ValidateRelationship` - Validate specific relationship

## Configuration

The server configuration is in `config/settings.json`:

```json
{
  "modelPath": "/path/to/your/model.archimate",
  "serverPort": 3090,
  "enableHttpEndpoints": false,
  "logPath": "logs",
  "logLevel": "info"
}
```

## Troubleshooting

### Server won't start
- Check that port 3090 is not in use
- Verify the model file path exists
- Check logs in the `logs/` directory

### Tools not appearing in Cursor
- Verify the server is running (`Server listening on port 3090`)
- Check Cursor MCP configuration
- Restart Cursor after configuration changes
- Check Cursor's MCP connection logs

### Model file issues
- Ensure the model file is in ArchiMate Exchange File (.xml) format
- Verify the path in `config/settings.json` is correct
- Check file permissions

## Example Usage in Cursor

Once connected, you can ask Cursor to:

```
"Search for all ApplicationComponent elements in the model"
"Create a new BusinessProcess element named 'Order Processing'"
"Validate the entire model and show me any errors"
"Create a relationship between element X and element Y"
```

The AI assistant in Cursor will use the appropriate MCP tools to fulfill these requests.
