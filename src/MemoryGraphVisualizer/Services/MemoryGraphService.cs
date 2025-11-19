using MemoryGraphVisualizer.Configuration;
using MemoryGraphVisualizer.Models;
using Microsoft.Extensions.Options;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service for managing memory graph operations including database discovery and loading.
/// </summary>
public class MemoryGraphService : IMemoryGraphService
{
    private readonly ISqliteDataService sqliteDataService;
    private readonly MemoryGraphOptions options;
    private readonly ILogger<MemoryGraphService> logger;

    public MemoryGraphService(
        ISqliteDataService sqliteDataService,
        IOptions<MemoryGraphOptions> options,
        ILogger<MemoryGraphService> logger)
    {
        this.sqliteDataService = sqliteDataService;
        this.options = options.Value;
        this.logger = logger;
    }

    public Task<List<DatabaseInfo>> GetAvailableDatabasesAsync()
    {
        var databases = new List<DatabaseInfo>();

        var folderPath = GetResolvedFolderPath();

        if (!Directory.Exists(folderPath))
        {
            logger.LogWarning("Memory folder does not exist: {Path}", folderPath);
            return Task.FromResult(databases);
        }

        var dbFiles = Directory.GetFiles(folderPath, "*.db", SearchOption.TopDirectoryOnly);

        foreach (var filePath in dbFiles)
        {
            var fileInfo = new FileInfo(filePath);
            var fileName = fileInfo.Name;

            databases.Add(new DatabaseInfo
            {
                FileName = fileName,
                DisplayName = Path.GetFileNameWithoutExtension(fileName),
                FilePath = filePath,
                FileSize = fileInfo.Length,
                FileSizeFormatted = FormatFileSize(fileInfo.Length),
                LastModified = fileInfo.LastWriteTimeUtc
            });
        }

        // Sort by display name
        databases = databases.OrderBy(d => d.DisplayName).ToList();

        logger.LogInformation("Found {Count} databases in folder: {Path}", databases.Count, folderPath);
        return Task.FromResult(databases);
    }

    public async Task<MemoryGraph?> LoadGraphAsync(string databaseName)
    {
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            logger.LogWarning("Database name is null or empty");
            return null;
        }

        // Sanitize database name to prevent directory traversal
        var sanitizedName = Path.GetFileName(databaseName);
        if (sanitizedName != databaseName)
        {
            logger.LogWarning("Potential directory traversal attempt detected: {Input}", databaseName);
            return null;
        }

        var folderPath = GetResolvedFolderPath();
        var dbPath = Path.Combine(folderPath, sanitizedName);

        // Verify the resolved path is still within the allowed folder
        var resolvedDbPath = Path.GetFullPath(dbPath);
        var resolvedFolderPath = Path.GetFullPath(folderPath);
        if (!resolvedDbPath.StartsWith(resolvedFolderPath, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Directory traversal attempt blocked: {Path}", dbPath);
            return null;
        }

        if (!File.Exists(resolvedDbPath))
        {
            logger.LogWarning("Database file not found: {Path}", resolvedDbPath);
            return null;
        }

        var isValid = await sqliteDataService.ValidateDatabaseAsync(resolvedDbPath);
        if (!isValid)
        {
            logger.LogWarning("Database validation failed: {Path}", resolvedDbPath);
            return null;
        }

        logger.LogInformation("Loading graph from database: {Database}", sanitizedName);

        var nodes = await sqliteDataService.GetEntitiesAsync(resolvedDbPath);
        var edges = await sqliteDataService.GetRelationsAsync(resolvedDbPath);

        // Check node count limit
        if (nodes.Count > options.MaxGraphNodes)
        {
            logger.LogWarning(
                "Graph has {Count} nodes which exceeds limit of {Max}. Consider filtering.",
                nodes.Count, options.MaxGraphNodes);
        }

        var graph = new MemoryGraph
        {
            DatabaseName = sanitizedName,
            Nodes = nodes,
            Edges = edges
        };

        logger.LogInformation(
            "Successfully loaded graph with {NodeCount} nodes and {EdgeCount} edges from {Database}",
            graph.NodeCount, graph.EdgeCount, sanitizedName);

        return graph;
    }

    private string GetResolvedFolderPath()
    {
        return Path.GetFullPath(options.MemoryFolderPath);
    }

    private static string FormatFileSize(long bytes)
    {
        string[] suffixes = { "B", "KB", "MB", "GB", "TB" };
        int suffixIndex = 0;
        double size = bytes;

        while (size >= 1024 && suffixIndex < suffixes.Length - 1)
        {
            size /= 1024;
            suffixIndex++;
        }

        return $"{size:0.##} {suffixes[suffixIndex]}";
    }
}
