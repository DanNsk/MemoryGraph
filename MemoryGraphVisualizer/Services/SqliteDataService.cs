using Dapper;
using MemoryGraphVisualizer.Models;
using Microsoft.Data.Sqlite;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service for reading data from SQLite memory databases.
/// </summary>
public class SqliteDataService : ISqliteDataService
{
    private readonly ILogger<SqliteDataService> logger;

    public SqliteDataService(ILogger<SqliteDataService> logger)
    {
        this.logger = logger;
    }

    public async Task<List<GraphNode>> GetEntitiesAsync(string dbPath)
    {
        try
        {
            var connectionString = BuildConnectionString(dbPath);

            await using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            // Get all entities
            var entities = await connection.QueryAsync<EntityDto>(
                "SELECT id, name, entity_type FROM entities");

            var entityMap = new Dictionary<long, GraphNode>();
            var nodes = new List<GraphNode>();

            foreach (var entity in entities)
            {
                var node = new GraphNode
                {
                    Id = entity.name,
                    Label = entity.name,
                    EntityType = entity.entity_type,
                    Observations = []
                };

                entityMap[entity.id] = node;
                nodes.Add(node);
            }

            // Get all observations
            var observations = await connection.QueryAsync<ObservationDto>(
                "SELECT entity_id, content, timestamp, source FROM observations");

            foreach (var obs in observations)
            {
                if (entityMap.TryGetValue(obs.entity_id, out var node))
                {
                    node.Observations.Add(new Observation
                    {
                        Text = obs.content,
                        Timestamp = obs.timestamp,
                        Source = obs.source
                    });
                }
            }

            logger.LogDebug("Retrieved {Count} entities from database: {Path}", nodes.Count, dbPath);
            return nodes;
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "Failed to retrieve entities from database: {Path}", dbPath);
            throw;
        }
    }

    private record EntityDto(long id, string name, string entity_type);
    private record ObservationDto(long entity_id, string content, string? timestamp, string? source);

    public async Task<List<GraphEdge>> GetRelationsAsync(string dbPath)
    {
        try
        {
            var connectionString = BuildConnectionString(dbPath);

            await using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            var relations = await connection.QueryAsync<RelationDto>(@"
                SELECT
                    r.id,
                    from_e.name as from_entity,
                    from_e.entity_type as from_type,
                    to_e.name as to_entity,
                    to_e.entity_type as to_type,
                    r.relation_type
                FROM relations r
                JOIN entities from_e ON r.from_entity_id = from_e.id
                JOIN entities to_e ON r.to_entity_id = to_e.id");

            var edges = new List<GraphEdge>();
            var edgeIndex = 0;

            foreach (var rel in relations)
            {
                var edge = new GraphEdge
                {
                    Id = rel.id?.ToString() ?? $"edge_{edgeIndex}",
                    Source = rel.from_entity,
                    Target = rel.to_entity,
                    FromType = rel.from_type,
                    ToType = rel.to_type,
                    RelationType = rel.relation_type,
                    Label = rel.relation_type
                };

                edges.Add(edge);
                edgeIndex++;
            }

            logger.LogDebug("Retrieved {Count} relations from database: {Path}", edges.Count, dbPath);
            return edges;
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "Failed to retrieve relations from database: {Path}", dbPath);
            throw;
        }
    }

    private record RelationDto(long? id, string from_entity, string from_type, string to_entity, string to_type, string relation_type);

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

            await using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();

            // Check for required tables
            var tableCount = await connection.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM sqlite_master
                WHERE type='table' AND name IN ('entities', 'observations', 'relations')");

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
}
