using System.Text.Json;
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

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT name, entityType, observations FROM entities";

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var name = reader.GetString(0);
                var entityType = reader.GetString(1);
                var observationsJson = reader.IsDBNull(2) ? "[]" : reader.GetString(2);

                var observations = ParseObservations(observationsJson);
                var color = GetColorForEntityType(entityType);

                var node = new GraphNode
                {
                    Id = name,
                    Label = name,
                    EntityType = entityType,
                    Observations = observations,
                    Color = color,
                    Size = CalculateNodeSize(observations.Count)
                };

                nodes.Add(node);
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
            command.CommandText = "SELECT id, fromEntity, toEntity, relationType, fromType, toType FROM relations";

            using var reader = await command.ExecuteReaderAsync();
            int edgeIndex = 0;
            while (await reader.ReadAsync())
            {
                var id = reader.IsDBNull(0) ? $"edge_{edgeIndex}" : reader.GetValue(0).ToString();
                var fromEntity = reader.GetString(1);
                var toEntity = reader.GetString(2);
                var relationType = reader.GetString(3);
                var fromType = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);
                var toType = reader.IsDBNull(5) ? string.Empty : reader.GetString(5);

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
                WHERE type='table' AND name IN ('entities', 'relations')";

            var tableCount = Convert.ToInt32(await command.ExecuteScalarAsync());

            if (tableCount < 2)
            {
                logger.LogWarning("Database is missing required tables (entities, relations): {Path}", dbPath);
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

    private List<Observation> ParseObservations(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<Observation>();
        }

        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            // Try to parse as array of observation objects
            var observations = JsonSerializer.Deserialize<List<Observation>>(json, options);
            if (observations != null)
            {
                return observations;
            }
        }
        catch (JsonException)
        {
            // Try to parse as array of strings (legacy format)
            try
            {
                var strings = JsonSerializer.Deserialize<List<string>>(json);
                if (strings != null)
                {
                    return strings.Select(s => new Observation { Text = s }).ToList();
                }
            }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Failed to parse observations JSON: {Json}", json);
            }
        }

        return new List<Observation>();
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
