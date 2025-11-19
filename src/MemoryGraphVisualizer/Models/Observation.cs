using System.Text.Json.Serialization;

namespace MemoryGraphVisualizer.Models;

/// <summary>
/// Represents an atomic observation/fact associated with an entity.
/// </summary>
public class Observation
{
    /// <summary>
    /// The observation content text.
    /// </summary>
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// When this observation was recorded (ISO 8601 format).
    /// </summary>
    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }

    /// <summary>
    /// Source of the observation (e.g., "code-analysis", "user-input", "documentation").
    /// </summary>
    [JsonPropertyName("source")]
    public string? Source { get; set; }
}
