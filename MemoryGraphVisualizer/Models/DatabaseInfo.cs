using System.Text.Json.Serialization;

namespace MemoryGraphVisualizer.Models;

/// <summary>
/// Information about an available memory database file.
/// </summary>
public class DatabaseInfo
{
    /// <summary>
    /// Database file name (e.g., "work.db").
    /// </summary>
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Display name for UI (file name without extension).
    /// </summary>
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Full path to the database file.
    /// </summary>
    [JsonPropertyName("filePath")]
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes.
    /// </summary>
    [JsonPropertyName("fileSize")]
    public long FileSize { get; set; }

    /// <summary>
    /// Human-readable file size (e.g., "1.5 MB").
    /// </summary>
    [JsonPropertyName("fileSizeFormatted")]
    public string FileSizeFormatted { get; set; } = string.Empty;

    /// <summary>
    /// Last modification timestamp.
    /// </summary>
    [JsonPropertyName("lastModified")]
    public DateTime LastModified { get; set; }
}
