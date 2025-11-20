using MemoryGraphVisualizer.Models;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service interface for memory graph operations.
/// </summary>
public interface IMemoryGraphService
{
    /// <summary>
    /// Gets a list of all available memory databases in the configured folder.
    /// </summary>
    /// <returns>List of database information objects.</returns>
    Task<List<DatabaseInfo>> GetAvailableDatabasesAsync();

    /// <summary>
    /// Loads a complete memory graph from the specified database.
    /// </summary>
    /// <param name="databaseName">Name of the database file (e.g., "work.db").</param>
    /// <returns>The loaded memory graph, or null if not found.</returns>
    Task<MemoryGraph?> LoadGraphAsync(string databaseName);
}
