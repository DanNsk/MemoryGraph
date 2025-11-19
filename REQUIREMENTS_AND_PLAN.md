# Memory Graph Visualizer - Requirements & Implementation Plan

## Executive Summary

This document outlines the requirements and implementation plan for a production-ready ASP.NET Core Razor Pages application that visualizes knowledge graphs from the multi-memory-mcp project using JavaScript graph visualization.

## 1. Research Findings

### 1.1 JavaScript Graph Visualization Libraries Evaluated

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Cytoscape.js** | • Extensive layout algorithms<br>• Designed for complex graph analysis<br>• Excellent performance with large graphs<br>• Rich API and customization<br>• MIT licensed<br>• Active community | • Steeper learning curve<br>• Larger bundle size | ✅ **RECOMMENDED** |
| **Sigma.js** | • WebGL-based, very fast<br>• Modern architecture<br>• TypeScript support<br>• Good for massive graphs (10k+ nodes) | • Requires graphology library<br>• Fewer layout algorithms<br>• Less mature ecosystem | Alternative option |
| **Vis.js (vis-network)** | • Easy to learn<br>• Quick setup<br>• Good documentation | • Performance issues with large graphs<br>• Community-maintained (original deprecated) | Not recommended |

### 1.2 Selected Library: Cytoscape.js

**Justification:**
- Best fit for knowledge graph visualization with heterogeneous node types
- Excellent built-in layouts (COSE, Force-directed, Hierarchical, Circular, Grid)
- Strong interactivity features (zoom, pan, drag-drop, selection)
- Extensive styling and customization options
- Production-ready with proven track record

**CDN Integration:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
```

### 1.3 Multi-Memory-MCP Data Structure Analysis

**Storage Architecture:**
- **Format:** SQLite 3 databases with WAL (Write-Ahead Logging) mode
- **Location:** Configurable base directory (default: `./.memory/`)
- **Organization:** One SQLite file per category (e.g., `work.db`, `personal.db`, `project-alpha.db`)

**Database Schema:**

```sql
-- Entities Table (Graph Nodes)
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT -- JSON array of observations
);

-- Relations Table (Graph Edges)
CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL,
    FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
    FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
);
```

**Data Model:**
- **Entities:** Nodes representing concepts (modules, classes, services, persons, etc.)
- **Relations:** Directed edges between entities with semantic relationship types
- **Observations:** Atomic facts/notes associated with each entity

## 2. Technical Requirements

### 2.1 Functional Requirements

**FR-1: Configuration Management**
- Application must allow configuration of the memory folder path via `appsettings.json`
- Default path: `./.memory/`
- Path must be validated on startup

**FR-2: Database Discovery**
- Automatically scan configured folder for `.db` files
- Display list of available databases in a dropdown selector
- Handle empty folder gracefully with user-friendly message

**FR-3: Graph Data Loading**
- Load selected database and extract entities and relations
- Transform SQLite data into Cytoscape.js-compatible JSON format
- Handle large graphs efficiently (streaming/pagination if needed)

**FR-4: Graph Visualization**
- Display entities as nodes with distinct colors by `entityType`
- Display relations as directed edges with labels showing `relationType`
- Apply intelligent layout algorithm (COSE recommended for knowledge graphs)
- Render graph with smooth animations

**FR-5: Interactivity**
- **Zoom:** Mouse wheel / pinch gesture support
- **Pan:** Click-and-drag on canvas background
- **Node Dragging:** Click-and-drag individual nodes
- **Node Selection:** Click to select, show details panel
- **Tooltips:** Hover to show entity name and type
- **Details Panel:** Display entity observations when selected

**FR-6: Graph Controls**
- Reset zoom/position button
- Layout selector dropdown (COSE, Circle, Grid, Breadthfirst, Concentric)
- Search/filter by entity name or type
- Export graph as PNG image

### 2.2 Non-Functional Requirements

**NFR-1: Performance**
- Initial page load: < 2 seconds
- Graph rendering for 500 nodes: < 3 seconds
- Smooth interactions at 60 FPS for graphs up to 1000 nodes

**NFR-2: Code Quality**
- Production-ready code with no placeholders or TODOs
- Follow Microsoft C# coding conventions (no underscore prefix for private fields)
- Comprehensive error handling and logging
- XML documentation comments for public APIs

**NFR-3: Architecture**
- Clean separation of concerns (MVC pattern)
- Dependency Injection for all services
- Configuration via IConfiguration
- Generic Host with proper startup/shutdown lifecycle

**NFR-4: Security**
- Validate all file paths to prevent directory traversal attacks
- Parameterized SQL queries (no concatenation)
- CORS configuration if needed
- Input validation and sanitization

**NFR-5: Maintainability**
- Clear project structure
- Comprehensive code review and refactoring
- Logging with Serilog or built-in ILogger
- Exception handling with meaningful messages

## 3. System Architecture

### 3.1 Application Stack

**Backend:**
- ASP.NET Core 8.0 (Razor Pages)
- Entity Framework Core 8.0 (optional, may use raw ADO.NET for SQLite)
- Microsoft.Data.Sqlite
- Serilog for logging

**Frontend:**
- Razor Pages (server-side rendering)
- Cytoscape.js 3.28+ (CDN)
- Bootstrap 5.3 (responsive UI)
- Vanilla JavaScript (ES6+)

### 3.2 Project Structure

```
MemoryGraphVisualizer/
├── Program.cs                          # Application entry point, host configuration
├── appsettings.json                    # Configuration (memory folder path)
├── appsettings.Development.json
├── Pages/
│   ├── Index.cshtml                    # Main page with graph visualization
│   ├── Index.cshtml.cs                 # Page model
│   ├── Shared/
│   │   ├── _Layout.cshtml              # Layout with Cytoscape.js CDN
│   │   └── _ValidationScriptsPartial.cshtml
├── Services/
│   ├── IMemoryGraphService.cs          # Interface for graph operations
│   ├── MemoryGraphService.cs           # Implementation: DB discovery, data loading
│   ├── ISqliteDataService.cs           # Interface for SQLite operations
│   └── SqliteDataService.cs            # Implementation: Query entities/relations
├── Models/
│   ├── MemoryGraph.cs                  # Graph model (nodes + edges)
│   ├── GraphNode.cs                    # Entity representation
│   ├── GraphEdge.cs                    # Relation representation
│   └── DatabaseInfo.cs                 # Metadata about available databases
├── Configuration/
│   └── MemoryGraphOptions.cs           # Strongly-typed configuration options
├── wwwroot/
│   ├── css/
│   │   └── site.css                    # Custom styles
│   ├── js/
│   │   └── graph-visualizer.js         # Cytoscape.js initialization and controls
│   └── lib/                            # Local fallback libraries (if needed)
└── Api/                                # API endpoints (Minimal API or Controllers)
    └── GraphController.cs              # REST endpoints for graph data
```

### 3.3 Data Flow

```
User selects database from dropdown
        ↓
JavaScript calls API: GET /api/graph?database=work.db
        ↓
GraphController → MemoryGraphService → SqliteDataService
        ↓
Query SQLite: SELECT * FROM entities; SELECT * FROM relations;
        ↓
Transform to JSON: { nodes: [...], edges: [...] }
        ↓
Return JSON to client
        ↓
Cytoscape.js renders graph with selected layout
        ↓
User interacts: zoom, pan, drag, select nodes
```

## 4. Detailed Implementation Plan

### Phase 1: Project Setup & Configuration (Estimated: 30 minutes)

**Tasks:**
1. Create new ASP.NET Core 8.0 Razor Pages project
2. Install NuGet packages:
   - `Microsoft.Data.Sqlite`
   - `Serilog.AspNetCore`
   - `Serilog.Sinks.Console`
   - `Serilog.Sinks.File`
3. Configure `Program.cs`:
   - Set up Serilog logging
   - Configure dependency injection
   - Add strongly-typed options for memory folder path
   - Configure static files and Razor Pages
4. Create `appsettings.json` with MemoryGraph section
5. Create folder structure (Services, Models, Configuration, Api)

### Phase 2: Configuration & Options (Estimated: 15 minutes)

**Tasks:**
1. Create `MemoryGraphOptions.cs`:
   - `MemoryFolderPath` property
   - Validation attributes
2. Register options in `Program.cs`
3. Add validation for folder path existence
4. Create test `.memory/` folder with sample databases for development

### Phase 3: Data Models (Estimated: 20 minutes)

**Tasks:**
1. Create `GraphNode.cs`:
   - Properties: `Id`, `Label`, `EntityType`, `Observations`
   - JSON serialization attributes
2. Create `GraphEdge.cs`:
   - Properties: `Id`, `Source`, `Target`, `RelationType`
3. Create `MemoryGraph.cs`:
   - Properties: `Nodes`, `Edges`
   - Method: `ToCytoscapeFormat()` → returns Cytoscape.js JSON
4. Create `DatabaseInfo.cs`:
   - Properties: `FileName`, `DisplayName`, `FilePath`, `FileSize`, `LastModified`

### Phase 4: SQLite Data Service (Estimated: 45 minutes)

**Tasks:**
1. Create `ISqliteDataService.cs` interface:
   - `Task<List<GraphNode>> GetEntitiesAsync(string dbPath)`
   - `Task<List<GraphEdge>> GetRelationsAsync(string dbPath)`
   - `Task<bool> ValidateDatabaseAsync(string dbPath)`
2. Create `SqliteDataService.cs` implementation:
   - Constructor with `ILogger<SqliteDataService>`
   - Implement entity retrieval with observation parsing (JSON)
   - Implement relation retrieval
   - Database validation (check schema)
   - Proper connection management (using statements)
   - Comprehensive error handling
   - Parameterized queries
3. Add unit tests (optional but recommended)

### Phase 5: Memory Graph Service (Estimated: 30 minutes)

**Tasks:**
1. Create `IMemoryGraphService.cs` interface:
   - `Task<List<DatabaseInfo>> GetAvailableDatabasesAsync()`
   - `Task<MemoryGraph> LoadGraphAsync(string databaseName)`
2. Create `MemoryGraphService.cs` implementation:
   - Inject `ISqliteDataService`, `IOptions<MemoryGraphOptions>`, `ILogger`
   - Implement database discovery (scan folder for .db files)
   - Implement graph loading (delegate to SqliteDataService)
   - Path validation and sanitization (prevent directory traversal)
   - Transform raw data to `MemoryGraph` model
3. Register services in DI container

### Phase 6: API Endpoints (Estimated: 30 minutes)

**Tasks:**
1. Create Minimal API endpoints in `Program.cs` OR create `GraphController.cs`:
   - `GET /api/databases` → returns `List<DatabaseInfo>`
   - `GET /api/graph?database={name}` → returns `MemoryGraph` in Cytoscape format
2. Add request validation
3. Add error handling middleware
4. Add response caching headers (if appropriate)
5. Test endpoints with Postman/curl

### Phase 7: Razor Page - Backend (Estimated: 20 minutes)

**Tasks:**
1. Create `Pages/Index.cshtml.cs`:
   - Inject `IMemoryGraphService`
   - Property: `List<DatabaseInfo> Databases`
   - `OnGetAsync()`: Load available databases for dropdown
   - Handle errors gracefully
2. Add XML documentation comments

### Phase 8: Razor Page - Frontend HTML (Estimated: 30 minutes)

**Tasks:**
1. Update `Pages/Shared/_Layout.cshtml`:
   - Add Bootstrap 5.3 CDN
   - Add Cytoscape.js CDN
   - Add custom CSS and JS references
   - Set up responsive layout
2. Create `Pages/Index.cshtml`:
   - Page title and instructions
   - Database selector dropdown (populated from Model.Databases)
   - Graph container div (`<div id="cy"></div>`)
   - Controls panel:
     - Layout selector dropdown
     - Reset view button
     - Search input
     - Export button
   - Details panel (sidebar for selected node info)
   - Loading spinner
3. Add responsive CSS in `wwwroot/css/site.css`:
   - Graph container sizing (height: 80vh)
   - Control panel positioning
   - Details panel styling
   - Node color scheme by entity type

### Phase 9: JavaScript Graph Visualization (Estimated: 60 minutes)

**Tasks:**
1. Create `wwwroot/js/graph-visualizer.js`:
   - Initialize Cytoscape instance
   - Configure default styles for nodes and edges:
     - Node colors by `entityType` (use color palette)
     - Edge styling (arrows, labels, colors)
     - Selection highlighting
   - Implement database selection handler:
     - Fetch graph data from API
     - Show loading indicator
     - Update Cytoscape data
     - Apply default layout (COSE)
     - Error handling with user-friendly messages
   - Implement layout switcher:
     - COSE (Compound Spring Embedder)
     - Circle
     - Grid
     - Breadthfirst
     - Concentric
   - Implement zoom controls:
     - Reset zoom/position
     - Zoom in/out buttons
     - Fit to screen
   - Implement node interaction:
     - Click event: show details panel
     - Hover event: show tooltip
     - Drag events: update position
   - Implement search/filter:
     - Filter nodes by name or type
     - Highlight matching nodes
     - Hide non-matching nodes (optional)
   - Implement export:
     - Export graph as PNG image
   - Add keyboard shortcuts (optional):
     - Space: reset view
     - F: fit to screen
     - S: focus search
2. Add comprehensive error handling
3. Add user feedback (toasts/alerts)

### Phase 10: Testing & Quality Assurance (Estimated: 45 minutes)

**Tasks:**
1. Create test databases with sample data:
   - Small graph (10-20 nodes)
   - Medium graph (100-200 nodes)
   - Large graph (500-1000 nodes)
   - Different entity types and relation types
2. Functional testing:
   - Database dropdown populates correctly
   - Graph loads and renders
   - All layouts work properly
   - Zoom, pan, drag interactions work
   - Node selection shows details
   - Search/filter functionality
   - Export generates valid PNG
3. Edge case testing:
   - Empty database
   - Database with no relations
   - Database with circular references
   - Very large graph performance
   - Invalid database file
   - Missing memory folder
4. Error handling testing:
   - Corrupted database
   - Network errors (if API calls fail)
   - Invalid configuration
5. Browser compatibility testing:
   - Chrome, Firefox, Safari, Edge
   - Mobile responsiveness

### Phase 11: Code Review & Refactoring (Estimated: 60 minutes)

**Review Checklist:**

**Architecture & Design:**
- [ ] Clean separation of concerns maintained
- [ ] Dependency injection used consistently
- [ ] No circular dependencies
- [ ] Proper use of interfaces for testability
- [ ] Services are stateless and thread-safe

**Code Quality:**
- [ ] No placeholders or TODO comments
- [ ] Private fields do NOT use underscore prefix
- [ ] Consistent naming conventions (PascalCase for public, camelCase for local)
- [ ] Methods are concise and single-purpose (< 50 lines)
- [ ] Classes are cohesive (< 300 lines)
- [ ] No code duplication (DRY principle)

**Error Handling:**
- [ ] All exceptions are caught and logged
- [ ] User-friendly error messages displayed
- [ ] No sensitive information leaked in errors
- [ ] Using statements for IDisposable resources
- [ ] Database connections properly closed

**Security:**
- [ ] File path validation to prevent directory traversal
- [ ] SQL queries are parameterized
- [ ] Input validation on all API endpoints
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in Razor pages

**Performance:**
- [ ] Database connections are not held open unnecessarily
- [ ] Async/await used correctly (no blocking calls)
- [ ] Large collections use streaming where possible
- [ ] Graph data is efficiently serialized
- [ ] Static assets are cached appropriately

**Documentation:**
- [ ] XML comments on all public APIs
- [ ] Complex logic has inline comments
- [ ] README with setup instructions
- [ ] Configuration options documented

**Testing:**
- [ ] All features manually tested
- [ ] Error scenarios tested
- [ ] Performance tested with large graphs
- [ ] Cross-browser compatibility verified

**Refactoring Actions:**
1. Extract magic numbers/strings to constants
2. Simplify complex conditional logic
3. Break down large methods into smaller ones
4. Add missing documentation
5. Improve variable naming for clarity
6. Consolidate duplicate code
7. Optimize database queries if needed
8. Improve error messages for end users

### Phase 12: Documentation & Deployment Prep (Estimated: 30 minutes)

**Tasks:**
1. Create comprehensive README.md:
   - Project description
   - Features list
   - Prerequisites
   - Installation steps
   - Configuration guide
   - Usage instructions
   - Screenshots (if available)
   - Troubleshooting section
   - License information
2. Update appsettings.json with production-ready defaults
3. Add environment-specific configurations
4. Create deployment checklist
5. Add logging configuration for production

## 5. Technology Stack Summary

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| .NET | 8.0 | Runtime framework |
| ASP.NET Core | 8.0 | Web framework |
| Razor Pages | 8.0 | Server-side rendering |
| Microsoft.Data.Sqlite | Latest | SQLite database access |
| Serilog | Latest | Structured logging |

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Cytoscape.js | 3.28+ | Graph visualization |
| Bootstrap | 5.3 | Responsive UI framework |
| JavaScript | ES6+ | Client-side interactivity |

### Development Tools
| Tool | Purpose |
|------|---------|
| Visual Studio Code / Visual Studio 2022 | IDE |
| .NET CLI | Build and run |
| SQLite Browser | Database inspection |
| Browser DevTools | Frontend debugging |

## 6. Configuration Schema

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "MemoryGraph": {
    "MemoryFolderPath": "./.memory/",
    "MaxGraphNodes": 10000,
    "DefaultLayout": "cose",
    "EnableCaching": true,
    "CacheDurationMinutes": 5
  },
  "Serilog": {
    "Using": [ "Serilog.Sinks.Console", "Serilog.Sinks.File" ],
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning"
      }
    },
    "WriteTo": [
      { "Name": "Console" },
      {
        "Name": "File",
        "Args": {
          "path": "logs/memorygraph-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 7
        }
      }
    ]
  }
}
```

## 7. Cytoscape.js Configuration

### Style Definitions

```javascript
const cytoscapeStyle = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'background-color': 'data(color)',
      'width': 'data(size)',
      'height': 'data(size)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      'color': '#ffffff',
      'text-outline-color': '#000000',
      'text-outline-width': 2
    }
  },
  {
    selector: 'edge',
    style: {
      'label': 'data(label)',
      'width': 2,
      'line-color': '#999',
      'target-arrow-color': '#999',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 1.5,
      'font-size': '10px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': '#FFD700'
    }
  }
];
```

### Entity Type Color Palette

```javascript
const entityTypeColors = {
  'module': '#3498db',      // Blue
  'class': '#e74c3c',       // Red
  'function': '#2ecc71',    // Green
  'service': '#f39c12',     // Orange
  'person': '#9b59b6',      // Purple
  'concept': '#1abc9c',     // Turquoise
  'document': '#34495e',    // Dark gray
  'default': '#95a5a6'      // Light gray
};
```

## 8. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Large graph performance issues | Medium | High | Implement pagination, lazy loading, or graph clustering |
| SQLite file corruption | Low | Medium | Add database validation before loading; provide clear error messages |
| Browser compatibility issues | Low | Low | Test on major browsers; use Cytoscape.js polyfills if needed |
| Memory folder misconfiguration | Medium | Medium | Validate path on startup; provide helpful error messages |
| Missing dependencies (CDN failure) | Low | Low | Include local fallback for Cytoscape.js |

## 9. Future Enhancements (Post-MVP)

1. **Real-time Updates:** WebSocket integration for live graph updates
2. **Advanced Filtering:** Multi-criteria filtering (entity type + relation type)
3. **Graph Clustering:** Automatic grouping of related nodes
4. **Persistence:** Save user-customized layouts
5. **Export Options:** Export to GEXF, GraphML, JSON formats
6. **Analytics:** Graph metrics (centrality, clustering coefficient, shortest paths)
7. **Collaboration:** Multi-user annotations and comments
8. **Dark Mode:** Theme switcher
9. **Node Editing:** Add/edit/delete entities and relations via UI
10. **History/Versioning:** Track changes over time

## 10. Success Criteria

The project will be considered successful when:

✅ Application starts without errors and loads configuration correctly
✅ Database dropdown populates with all .db files from memory folder
✅ Selecting a database loads and displays the graph within 3 seconds (for typical graphs)
✅ All interactive features work smoothly (zoom, pan, drag, select)
✅ Node details panel displays observations correctly
✅ All layout algorithms apply correctly
✅ Search/filter functionality works as expected
✅ Export to PNG generates valid images
✅ Code passes comprehensive review with zero critical issues
✅ No placeholders or TODOs remain in production code
✅ Application is production-ready and deployable

## 11. Estimated Total Development Time

| Phase | Estimated Time |
|-------|----------------|
| 1. Project Setup | 30 min |
| 2. Configuration | 15 min |
| 3. Data Models | 20 min |
| 4. SQLite Service | 45 min |
| 5. Graph Service | 30 min |
| 6. API Endpoints | 30 min |
| 7. Razor Backend | 20 min |
| 8. Razor Frontend HTML | 30 min |
| 9. JavaScript Visualization | 60 min |
| 10. Testing & QA | 45 min |
| 11. Code Review | 60 min |
| 12. Documentation | 30 min |
| **Total** | **~6.5 hours** |

*Note: Times are estimates for an experienced developer. Adjust based on familiarity with technologies.*

## 12. Next Steps

Once this plan is approved:

1. ✅ Confirm project requirements with stakeholder
2. Create Git branch for development
3. Begin Phase 1: Project Setup
4. Follow implementation plan sequentially
5. Conduct code review after completion
6. Deploy to test environment
7. Gather feedback and iterate

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Status:** Ready for Implementation
