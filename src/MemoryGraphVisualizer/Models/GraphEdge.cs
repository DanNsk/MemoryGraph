using System.Text.Json.Serialization;

namespace MemoryGraphVisualizer.Models;

/// <summary>
/// Represents a relation (edge) between two entities in the memory graph.
/// </summary>
public class GraphEdge
{
    /// <summary>
    /// Unique identifier for the edge.
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Source entity name (from node).
    /// </summary>
    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// Target entity name (to node).
    /// </summary>
    [JsonPropertyName("target")]
    public string Target { get; set; } = string.Empty;

    /// <summary>
    /// Type of relationship (e.g., "imports", "extends", "uses", "depends_on").
    /// </summary>
    [JsonPropertyName("relationType")]
    public string RelationType { get; set; } = string.Empty;

    /// <summary>
    /// Display label for the edge (typically the relation type).
    /// </summary>
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
}
