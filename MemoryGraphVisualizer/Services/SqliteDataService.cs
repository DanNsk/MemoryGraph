using MemoryGraphVisualizer.Models;
using Microsoft.Data.Sqlite;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service for reading data from SQLite memory databases.
/// </summary>
public class SqliteDataService : ISqliteDataService
{
    private readonly ILogger<SqliteDataService> logger;

    /// <summary>
    /// Color palette for different entity types.
    /// </summary>
    private static readonly Dictionary<string, string> EntityTypeColors = new(StringComparer.OrdinalIgnoreCase)
    {
        ["module"] = "#3498db",
        ["class"] = "#e74c3c",
        ["function"] = "#2ecc71",
        ["method"] = "#27ae60",
        ["service"] = "#f39c12",
        ["person"] = "#9b59b6",
        ["concept"] = "#1abc9c",
        ["document"] = "#34495e",
        ["file"] = "#7f8c8d",
        ["variable"] = "#e67e22",
        ["interface"] = "#16a085",
        ["component"] = "#2980b9",
        ["api"] = "#8e44ad",
        ["database"] = "#c0392b",
        ["config"] = "#d35400",
        ["project"] = "#2c3e50",
        ["technology"] = "#00b894"
    };

    public SqliteDataService(ILogger<SqliteDataService> logger)
    {
        this.logger = logger;
    }

    public async Task<List<GraphNode>> GetEntitiesAsync(string dbPath)
    {
        var nodes = new List<GraphNode>();

        try
        {
            var connectionString = BuildConnectionString(dbPath);

            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            // Get all entities
            using var entityCommand = connection.CreateCommand();
            entityCommand.CommandText = "SELECT id, name, entity_type FROM entities";

            var entityMap = new Dictionary<long, GraphNode>();

            using var entityReader = await entityCommand.ExecuteReaderAsync();
            while (await entityReader.ReadAsync())
            {
                var id = entityReader.GetInt64(0);
                var name = entityReader.GetString(1);
                var entityType = entityReader.GetString(2);
                var color = GetColorForEntityType(entityType);

                var node = new GraphNode
                {
                    Id = name,
                    Label = name,
                    EntityType = entityType,
                    Observations = new List<Observation>(),
                    Color = color,
                    Size = 30 // Will be updated after loading observations
                };

                entityMap[id] = node;
                nodes.Add(node);
            }

            // Get all observations
            using var obsCommand = connection.CreateCommand();
            obsCommand.CommandText = "SELECT entity_id, content, timestamp, source FROM observations";

            using var obsReader = await obsCommand.ExecuteReaderAsync();
            while (await obsReader.ReadAsync())
            {
                var entityId = obsReader.GetInt64(0);
                var content = obsReader.GetString(1);
                var timestamp = obsReader.IsDBNull(2) ? null : obsReader.GetString(2);
                var source = obsReader.IsDBNull(3) ? null : obsReader.GetString(3);

                if (entityMap.TryGetValue(entityId, out var node))
                {
                    node.Observations.Add(new Observation
                    {
                        Text = content,
                        Timestamp = timestamp,
                        Source = source
                    });
                }
            }

            // Update node sizes based on observation count
            foreach (var node in nodes)
            {
                node.Size = CalculateNodeSize(node.Observations.Count);
            }

            logger.LogDebug("Retrieved {Count} entities from database: {Path}", nodes.Count, dbPath);
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "Failed to retrieve entities from database: {Path}", dbPath);
            throw;
        }

        return nodes;
    }

    public async Task<List<GraphEdge>> GetRelationsAsync(string dbPath)
    {
        var edges = new List<GraphEdge>();

        try
        {
            var connectionString = BuildConnectionString(dbPath);

            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT id, from_entity, from_type, to_entity, to_type, relation_type FROM relations";

            using var reader = await command.ExecuteReaderAsync();
            int edgeIndex = 0;
            while (await reader.ReadAsync())
            {
                var id = reader.IsDBNull(0) ? $"edge_{edgeIndex}" : reader.GetValue(0).ToString();
                var fromEntity = reader.GetString(1);
                var fromType = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                var toEntity = reader.GetString(3);
                var toType = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                var relationType = reader.GetString(5);

                var edge = new GraphEdge
                {
                    Id = id ?? $"edge_{edgeIndex}",
                    Source = fromEntity,
                    Target = toEntity,
                    FromType = fromType,
                    ToType = toType,
                    RelationType = relationType,
                    Label = relationType
                };

                edges.Add(edge);
                edgeIndex++;
            }

            logger.LogDebug("Retrieved {Count} relations from database: {Path}", edges.Count, dbPath);
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "Failed to retrieve relations from database: {Path}", dbPath);
            throw;
        }

        return edges;
    }

    public async Task<bool> ValidateDatabaseAsync(string dbPath)
    {
        if (!File.Exists(dbPath))
        {
            logger.LogWarning("Database file does not exist: {Path}", dbPath);
            return false;
        }

        try
        {
            var connectionString = BuildConnectionString(dbPath);

            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            // Check for required tables
            using var command = connection.CreateCommand();
            command.CommandText = @"
                SELECT COUNT(*) FROM sqlite_master
                WHERE type='table' AND name IN ('entities', 'observations', 'relations')";

            var tableCount = Convert.ToInt32(await command.ExecuteScalarAsync());

            if (tableCount < 3)
            {
                logger.LogWarning("Database is missing required tables (entities, observations, relations): {Path}", dbPath);
                return false;
            }

            logger.LogDebug("Database validation successful: {Path}", dbPath);
            return true;
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "Failed to validate database: {Path}", dbPath);
            return false;
        }
    }

    private static string BuildConnectionString(string dbPath)
    {
        return new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadOnly
        }.ToString();
    }


    private static string GetColorForEntityType(string entityType)
    {
        if (EntityTypeColors.TryGetValue(entityType, out var color))
        {
            return color;
        }

        // Generate consistent color for unknown types based on hash
        var hash = entityType.GetHashCode();
        var hue = Math.Abs(hash % 360);
        return HslToHex(hue, 65, 55);
    }

    private static string HslToHex(int hue, int saturation, int lightness)
    {
        var h = hue / 360.0;
        var s = saturation / 100.0;
        var l = lightness / 100.0;

        double r, g, b;

        if (s == 0)
        {
            r = g = b = l;
        }
        else
        {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = HueToRgb(p, q, h + 1.0 / 3);
            g = HueToRgb(p, q, h);
            b = HueToRgb(p, q, h - 1.0 / 3);
        }

        return $"#{(int)(r * 255):X2}{(int)(g * 255):X2}{(int)(b * 255):X2}";
    }

    private static double HueToRgb(double p, double q, double t)
    {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1.0 / 6) return p + (q - p) * 6 * t;
        if (t < 1.0 / 2) return q;
        if (t < 2.0 / 3) return p + (q - p) * (2.0 / 3 - t) * 6;
        return p;
    }

    private static int CalculateNodeSize(int observationCount)
    {
        // Base size of 30, increases with observations (max 60)
        return Math.Min(30 + observationCount * 3, 60);
    }
}
