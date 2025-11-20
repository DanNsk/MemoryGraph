# Memory Graph Visualizer

A production-ready ASP.NET Core application for visualizing knowledge graphs from the [multi-memory-mcp](https://github.com/DanNsk/multi-memory-mcp) project using Cytoscape.js.

## Features

- **Interactive Graph Visualization** - Cytoscape.js with zoom, pan, and drag-and-drop
- **Multiple Layouts** - COSE (force-directed), Circle, Grid, Breadthfirst, Concentric
- **Entity Type Coloring** - Automatic color-coding by entity type
- **Node Details Panel** - View observations, timestamps, sources, and connections
- **Search & Filter** - Find nodes by name or type
- **Export to PNG** - Save graph as an image
- **Directional Edges** - Arrows showing relationship direction (source → target)
- **Responsive Design** - Works on desktop and mobile

## Prerequisites

- .NET 8.0 SDK or later
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Quick Start

### 1. Configure the Memory Folder

Edit `appsettings.json`:

```json
{
  "MemoryGraph": {
    "MemoryFolderPath": "./.memory/",
    "MaxGraphNodes": 10000,
    "DefaultLayout": "cose"
  }
}
```

### 2. Run the Application

```bash
dotnet restore
dotnet run
```

The application starts at `https://localhost:5001` (or `http://localhost:5000`).

### 3. View Your Graphs

1. Open the application in your browser
2. Select a database from the dropdown
3. Interact with the graph:
   - **Scroll/Pinch** - Zoom in/out
   - **Drag canvas** - Pan the view
   - **Drag nodes** - Reposition nodes
   - **Click node** - View details and highlight connections

## Test Databases

In Development mode, the application creates sample databases:

- `software-project.db` - 30 entities, 40 relations (software architecture)
- `team-knowledge.db` - 15 entities, 16 relations (team/project knowledge)
- `empty.db` - Empty database (edge case)
- `nodes-only.db` - 5 entities, 0 relations (disconnected nodes)

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `MemoryFolderPath` | Path to folder containing .db files | `./.memory/` |
| `MaxGraphNodes` | Maximum nodes to load | `10000` |
| `DefaultLayout` | Default layout algorithm | `cose` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Fit graph to screen |
| `R` | Reset view |
| `/` | Focus search box |
| `Esc` | Clear search |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/databases` | GET | List available databases |
| `/api/graph?database={name}` | GET | Load graph data |

## Project Structure

```
MemoryGraph/
├── MemoryGraph.slnx                    # Solution file
├── MemoryGraphVisualizer.csproj        # Project file
├── Program.cs                          # Entry point and API endpoints
├── appsettings.json                    # Configuration
├── Configuration/                      # Options classes
├── Models/                             # GraphNode, GraphEdge, Observation, etc.
├── Pages/                              # Razor pages (Index)
├── Services/                           # Business logic and data access
├── wwwroot/
│   ├── css/                            # Custom styles
│   └── js/                             # Graph visualization JavaScript
└── FEATURE_REQUEST_NODE_EDITING.md     # Planned editing features
```

## Database Schema

The visualizer expects SQLite databases with this schema:

```sql
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT  -- JSON array
);

CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL
);
```

### Observations Format

```json
[
  {
    "text": "Observation text",
    "timestamp": "2025-01-15T10:30:00Z",
    "source": "code-analysis"
  }
]
```

## Technology Stack

**Backend:**
- ASP.NET Core 8.0 (Razor Pages)
- Microsoft.Data.Sqlite
- Serilog

**Frontend:**
- Cytoscape.js 3.28
- Bootstrap 5.3
- Vanilla JavaScript (ES6+)

## Future Enhancements

See [FEATURE_REQUEST_NODE_EDITING.md](FEATURE_REQUEST_NODE_EDITING.md) for planned editing capabilities:
- Add/remove nodes
- Draw connections between nodes
- Edit properties and observations

## License

MIT
