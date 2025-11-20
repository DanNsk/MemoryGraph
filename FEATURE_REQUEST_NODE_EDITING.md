# Feature Request: Node Editing UI

## Overview

Add interactive editing capabilities to the Memory Graph Visualizer, allowing users to:
- Add/remove nodes
- Draw directional connections between nodes
- Delete connections
- Add/edit properties and observations on nodes

---

## Current Architecture Summary

### Technology Stack
- **Backend:** ASP.NET Core 8.0 (Razor Pages), C# 12
- **Frontend:** Vanilla JavaScript (ES6+), Cytoscape.js 3.28.1, Bootstrap 5.3.2
- **Database:** SQLite with Microsoft.Data.Sqlite

### Key Files

| File | Purpose |
|------|---------|
| `MemoryGraphVisualizer/wwwroot/js/graph-visualizer.js` | All graph UI logic, Cytoscape integration |
| `MemoryGraphVisualizer/wwwroot/css/site.css` | Styling for graph and panels |
| `MemoryGraphVisualizer/Pages/Index.cshtml` | Main UI (Razor page) |
| `MemoryGraphVisualizer/Program.cs` | API endpoints, DI setup |
| `MemoryGraphVisualizer/Services/MemoryGraphService.cs` | Graph loading logic |
| `MemoryGraphVisualizer/Services/SqliteDataService.cs` | SQLite read operations |
| `MemoryGraphVisualizer/Models/GraphNode.cs` | Node model |
| `MemoryGraphVisualizer/Models/GraphEdge.cs` | Edge model |
| `MemoryGraphVisualizer/Models/Observation.cs` | Observation model |

### Database Schema

```sql
-- entities table
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT,
    observations TEXT  -- JSON array of observations
);

-- relations table
CREATE TABLE relations (
    id INTEGER PRIMARY KEY,
    fromEntity TEXT,
    toEntity TEXT,
    relationType TEXT,
    FOREIGN KEY (fromEntity) REFERENCES entities(name),
    FOREIGN KEY (toEntity) REFERENCES entities(name)
);
```

### Current API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/databases` | GET | Lists available .db files |
| `/api/graph?database=name.db` | GET | Returns graph in Cytoscape format |

### Data Models

**GraphNode.cs:**
```csharp
public class GraphNode
{
    public string Id { get; set; }           // Entity name
    public string Label { get; set; }        // Display name
    public string EntityType { get; set; }   // Type category
    public List<Observation> Observations { get; set; }
    public string Color { get; set; }        // Auto-assigned by type
    public int Size { get; set; }            // Based on connection count
}
```

**GraphEdge.cs:**
```csharp
public class GraphEdge
{
    public string Id { get; set; }           // Unique edge ID
    public string Source { get; set; }       // FromEntity
    public string Target { get; set; }       // ToEntity
    public string RelationType { get; set; } // e.g., "imports", "uses"
    public string Label { get; set; }        // Display label
}
```

**Observation.cs:**
```csharp
public class Observation
{
    public string Text { get; set; }
    public DateTime Timestamp { get; set; }
    public string Source { get; set; }
}
```

### Cytoscape.js Details

- **Version:** 3.28.1 (CDN loaded)
- **Instance variable:** `cy` (global in graph-visualizer.js)
- **Edge style:** Directional with triangle arrows (`target-arrow-shape: 'triangle'`)
- **Layout algorithms:** COSE (default), Circle, Grid, Breadthfirst, Concentric

---

## Implementation Plan

### Phase 1: Backend API Endpoints

Add to `Program.cs`:

```csharp
// Node operations
app.MapPost("/api/graph/{database}/nodes", async (string database, CreateNodeRequest request, IMemoryGraphService service) => { });
app.MapPut("/api/graph/{database}/nodes/{id}", async (string database, string id, UpdateNodeRequest request, IMemoryGraphService service) => { });
app.MapDelete("/api/graph/{database}/nodes/{id}", async (string database, string id, IMemoryGraphService service) => { });

// Edge operations
app.MapPost("/api/graph/{database}/edges", async (string database, CreateEdgeRequest request, IMemoryGraphService service) => { });
app.MapPut("/api/graph/{database}/edges/{id}", async (string database, string id, UpdateEdgeRequest request, IMemoryGraphService service) => { });
app.MapDelete("/api/graph/{database}/edges/{id}", async (string database, string id, IMemoryGraphService service) => { });

// Observation operations
app.MapPost("/api/graph/{database}/nodes/{nodeId}/observations", async (...) => { });
app.MapPut("/api/graph/{database}/observations/{id}", async (...) => { });
app.MapDelete("/api/graph/{database}/observations/{id}", async (...) => { });
```

### Phase 2: Service Layer

Add to `IMemoryGraphService.cs`:

```csharp
// Node CRUD
Task<GraphNode> CreateNodeAsync(string database, string name, string entityType);
Task<GraphNode> UpdateNodeAsync(string database, string id, string label, string entityType);
Task DeleteNodeAsync(string database, string id);

// Edge CRUD
Task<GraphEdge> CreateEdgeAsync(string database, string source, string target, string relationType);
Task<GraphEdge> UpdateEdgeAsync(string database, string id, string relationType);
Task DeleteEdgeAsync(string database, string id);

// Observation CRUD
Task<Observation> AddObservationAsync(string database, string nodeId, string text, string source);
Task<Observation> UpdateObservationAsync(string database, string observationId, string text);
Task DeleteObservationAsync(string database, string observationId);
```

Add to `ISqliteDataService.cs`:

```csharp
// Write operations
Task InsertEntityAsync(string name, string entityType, string observationsJson);
Task UpdateEntityAsync(string name, string entityType, string observationsJson);
Task DeleteEntityAsync(string name);

Task<int> InsertRelationAsync(string fromEntity, string toEntity, string relationType);
Task UpdateRelationAsync(int id, string relationType);
Task DeleteRelationAsync(int id);
```

### Phase 3: Request/Response DTOs

Create `Models/Requests/` folder:

```csharp
// CreateNodeRequest.cs
public class CreateNodeRequest
{
    public string Name { get; set; }        // Required, unique
    public string EntityType { get; set; }  // Required
    public string InitialObservation { get; set; }  // Optional
}

// UpdateNodeRequest.cs
public class UpdateNodeRequest
{
    public string Label { get; set; }
    public string EntityType { get; set; }
}

// CreateEdgeRequest.cs
public class CreateEdgeRequest
{
    public string Source { get; set; }      // Required, must exist
    public string Target { get; set; }      // Required, must exist
    public string RelationType { get; set; } // Required
}

// UpdateEdgeRequest.cs
public class UpdateEdgeRequest
{
    public string RelationType { get; set; }
}

// AddObservationRequest.cs
public class AddObservationRequest
{
    public string Text { get; set; }        // Required
    public string Source { get; set; }      // Optional, defaults to "user"
}
```

### Phase 4: Frontend UI Components

#### 4.1 Edit Mode Toggle

Add to toolbar in `Index.cshtml`:
```html
<div class="btn-group" role="group">
    <input type="checkbox" class="btn-check" id="editModeToggle" autocomplete="off">
    <label class="btn btn-outline-warning" for="editModeToggle">
        <i class="bi bi-pencil"></i> Edit Mode
    </label>
</div>
```

#### 4.2 Context Menus

Add right-click context menus for:
- **Canvas:** Add new node
- **Node:** Edit node, Delete node, Add connection from here
- **Edge:** Edit edge, Delete edge

#### 4.3 Modal Dialogs

**Add Node Modal:**
```html
<div class="modal" id="addNodeModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5>Add Node</h5>
            </div>
            <div class="modal-body">
                <input type="text" id="nodeName" placeholder="Node name (unique)" required>
                <select id="nodeEntityType">
                    <!-- Populated dynamically from existing types -->
                    <option value="">Select entity type...</option>
                </select>
                <input type="text" id="newEntityType" placeholder="Or enter new type...">
                <textarea id="initialObservation" placeholder="Initial observation (optional)"></textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" id="saveNodeBtn">Add Node</button>
            </div>
        </div>
    </div>
</div>
```

**Add Edge Modal:**
```html
<div class="modal" id="addEdgeModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5>Add Connection</h5>
            </div>
            <div class="modal-body">
                <div id="edgeSourceDisplay">From: <strong id="edgeSourceName"></strong></div>
                <div id="edgeTargetDisplay">To: <strong id="edgeTargetName"></strong></div>
                <select id="edgeRelationType">
                    <option value="relates_to">relates_to</option>
                    <option value="imports">imports</option>
                    <option value="uses">uses</option>
                    <option value="depends_on">depends_on</option>
                    <option value="contains">contains</option>
                </select>
                <input type="text" id="customRelationType" placeholder="Or enter custom type...">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" id="saveEdgeBtn">Add Connection</button>
            </div>
        </div>
    </div>
</div>
```

#### 4.4 Edge Creation Workflow

In `graph-visualizer.js`:

```javascript
let edgeCreationMode = false;
let edgeSourceNode = null;

function startEdgeCreation(sourceNode) {
    edgeCreationMode = true;
    edgeSourceNode = sourceNode;
    cy.nodes().addClass('edge-creation-target');
    sourceNode.addClass('edge-creation-source');
    showToast('Click target node to create connection');
}

function completeEdgeCreation(targetNode) {
    if (edgeSourceNode && targetNode && edgeSourceNode.id() !== targetNode.id()) {
        showAddEdgeModal(edgeSourceNode.id(), targetNode.id());
    }
    cancelEdgeCreation();
}

function cancelEdgeCreation() {
    edgeCreationMode = false;
    edgeSourceNode = null;
    cy.nodes().removeClass('edge-creation-target edge-creation-source');
}
```

#### 4.5 Observation Editor

Add to details panel when in edit mode:
```html
<div id="observationEditor" class="edit-mode-only">
    <button class="btn btn-sm btn-outline-primary" id="addObservationBtn">
        <i class="bi bi-plus"></i> Add Observation
    </button>
    <!-- Each observation gets edit/delete buttons -->
</div>
```

### Phase 5: API Integration Functions

Add to `graph-visualizer.js`:

```javascript
// Node operations
async function createNode(name, entityType, initialObservation) {
    const response = await fetch(`/api/graph/${currentDatabase}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, entityType, initialObservation })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

async function updateNode(id, label, entityType) {
    const response = await fetch(`/api/graph/${currentDatabase}/nodes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, entityType })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

async function deleteNode(id) {
    const response = await fetch(`/api/graph/${currentDatabase}/nodes/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(await response.text());
}

// Edge operations
async function createEdge(source, target, relationType) {
    const response = await fetch(`/api/graph/${currentDatabase}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target, relationType })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

async function deleteEdge(id) {
    const response = await fetch(`/api/graph/${currentDatabase}/edges/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error(await response.text());
}

// Observation operations
async function addObservation(nodeId, text, source = 'user') {
    const response = await fetch(`/api/graph/${currentDatabase}/nodes/${encodeURIComponent(nodeId)}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}
```

---

## Validation Requirements

### Node Creation
- Name must be unique (check before insert)
- Name cannot be empty
- EntityType cannot be empty

### Edge Creation
- Source node must exist
- Target node must exist
- Source !== Target (no self-loops)
- Duplicate edges allowed (same source/target, different relationType)

### Node Deletion
- Cascade delete all connected edges
- Confirm before deletion

### Edge Deletion
- Simple delete, no cascading needed

---

## CSS Additions

Add to `site.css`:

```css
/* Edit mode styles */
.edit-mode #cy {
    cursor: crosshair;
}

.edge-creation-source {
    border: 3px dashed #28a745 !important;
}

.edge-creation-target {
    cursor: pointer;
}

.edge-creation-target:hover {
    border: 2px solid #28a745;
}

/* Context menu */
.context-menu {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
}

.context-menu-item {
    padding: 8px 16px;
    cursor: pointer;
}

.context-menu-item:hover {
    background: #f0f0f0;
}

.context-menu-item.danger {
    color: #dc3545;
}

/* Edit mode indicator */
.edit-mode-active {
    border: 2px solid #ffc107 !important;
}

/* Observation edit buttons */
.observation-actions {
    display: none;
}

.edit-mode .observation-actions {
    display: inline-block;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] SqliteDataService: InsertEntity, UpdateEntity, DeleteEntity
- [ ] SqliteDataService: InsertRelation, UpdateRelation, DeleteRelation
- [ ] MemoryGraphService: CreateNode, UpdateNode, DeleteNode
- [ ] MemoryGraphService: CreateEdge, UpdateEdge, DeleteEdge
- [ ] Validation: unique node names, existing nodes for edges

### Integration Tests
- [ ] POST /api/graph/{db}/nodes - creates node in database
- [ ] DELETE /api/graph/{db}/nodes/{id} - cascades to edges
- [ ] POST /api/graph/{db}/edges - validates source/target exist
- [ ] Concurrent edit handling

### Manual UI Tests
- [ ] Add node via context menu
- [ ] Delete node and verify edges removed
- [ ] Create edge by clicking source then target
- [ ] Delete edge via context menu
- [ ] Add observation to existing node
- [ ] Edit observation text
- [ ] Delete observation
- [ ] Undo after accidental delete (if implemented)

---

## Security Considerations

1. **Input Sanitization** - Escape all user inputs before SQL
2. **Path Validation** - Ensure database parameter doesn't allow path traversal
3. **SQL Injection** - Use parameterized queries (already done in SqliteDataService)
4. **XSS Prevention** - Escape node labels/observations when rendering

---

## Future Enhancements

1. **Undo/Redo** - Track operations in memory for reversal
2. **Bulk Operations** - Import/export nodes and edges
3. **Collaborative Editing** - Real-time sync between users
4. **Change History** - Audit log of all modifications
5. **Templates** - Pre-defined node types with default properties

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Backend API endpoints | 2-3 hours |
| Service layer CRUD | 2-3 hours |
| Frontend modals & forms | 2-3 hours |
| Context menus | 1-2 hours |
| Edge creation workflow | 1-2 hours |
| Observation editor | 1-2 hours |
| Testing & polish | 2-3 hours |
| **Total** | **11-18 hours** |
