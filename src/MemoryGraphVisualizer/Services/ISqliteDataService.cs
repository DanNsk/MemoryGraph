using MemoryGraphVisualizer.Models;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service interface for SQLite database operations.
/// </summary>
public interface ISqliteDataService
{
    /// <summary>
    /// Retrieves all entities from the specified database.
    /// </summary>
    /// <param name="dbPath">Full path to the SQLite database file.</param>
    /// <returns>List of graph nodes representing entities.</returns>
    Task<List<GraphNode>> GetEntitiesAsync(string dbPath);

    /// <summary>
    /// Retrieves all relations from the specified database.
    /// </summary>
    /// <param name="dbPath">Full path to the SQLite database file.</param>
    /// <returns>List of graph edges representing relations.</returns>
    Task<List<GraphEdge>> GetRelationsAsync(string dbPath);

    /// <summary>
    /// Validates that the database file exists and has the expected schema.
    /// </summary>
    /// <param name="dbPath">Full path to the SQLite database file.</param>
    /// <returns>True if the database is valid, false otherwise.</returns>
    Task<bool> ValidateDatabaseAsync(string dbPath);
}
