# Memory Graph Visualizer

A production-ready ASP.NET Core Razor Pages application for visualizing knowledge graphs from the [multi-memory-mcp](https://github.com/DanNsk/multi-memory-mcp) project using Cytoscape.js.

## Features

- **Interactive Graph Visualization**: Powered by Cytoscape.js with zoom, pan, and drag-and-drop
- **Multiple Layouts**: COSE (force-directed), Circle, Grid, Breadthfirst, and Concentric
- **Entity Type Coloring**: Automatic color-coding based on entity types
- **Node Details Panel**: View observations, timestamps, sources, and connections
- **Search & Filter**: Find nodes by name or type
- **Export to PNG**: Save graph as an image
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- .NET 8.0 SDK or later
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Getting Started

### 1. Configure the Memory Folder

Edit `appsettings.json` to set the path to your memory folder containing SQLite database files:

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
cd src/MemoryGraphVisualizer
dotnet restore
dotnet run
```

The application will start at `https://localhost:5001` (or `http://localhost:5000`).

### 3. View Your Graphs

1. Open the application in your browser
2. Select a database from the dropdown
3. Interact with the graph using mouse/touch gestures:
   - **Scroll/Pinch**: Zoom in/out
   - **Drag canvas**: Pan the view
   - **Drag nodes**: Reposition nodes
   - **Click node**: View details and highlight connections

## Test Databases

In Development mode, the application automatically creates sample databases:

- `software-project.db`: 30 entities, 40 relations (software architecture)
- `team-knowledge.db`: 15 entities, 16 relations (team and project knowledge)
- `empty.db`: Empty database (edge case)
- `nodes-only.db`: 5 entities, 0 relations (disconnected nodes)

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `MemoryFolderPath` | Path to folder containing .db files | `./.memory/` |
| `MaxGraphNodes` | Maximum nodes to load (for performance) | `10000` |
| `DefaultLayout` | Default layout algorithm | `cose` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Fit graph to screen |
| `R` | Reset view |
| `/` | Focus search box |
| `Esc` | Clear search |

## API Endpoints

- `GET /api/databases` - List available databases
- `GET /api/graph?database={name}` - Load graph data

## Project Structure

```
MemoryGraphVisualizer/
├── Configuration/       # Options classes
├── Models/              # Data models (GraphNode, GraphEdge, etc.)
├── Pages/               # Razor pages
├── Services/            # Business logic and data access
├── wwwroot/
│   ├── css/             # Custom styles
│   └── js/              # Graph visualization JavaScript
├── Program.cs           # Application entry point
└── appsettings.json     # Configuration
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

- **Backend**: ASP.NET Core 8.0, Razor Pages
- **Database**: Microsoft.Data.Sqlite
- **Logging**: Serilog
- **Frontend**: Cytoscape.js, Bootstrap 5.3
- **JavaScript**: Vanilla ES6+

## License

MIT
