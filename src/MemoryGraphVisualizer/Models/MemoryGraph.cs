using System.Text.Json.Serialization;

namespace MemoryGraphVisualizer.Models;

/// <summary>
/// Represents a complete memory graph with nodes and edges.
/// </summary>
public class MemoryGraph
{
    /// <summary>
    /// Collection of entity nodes in the graph.
    /// </summary>
    [JsonPropertyName("nodes")]
    public List<GraphNode> Nodes { get; set; } = new();

    /// <summary>
    /// Collection of relation edges in the graph.
    /// </summary>
    [JsonPropertyName("edges")]
    public List<GraphEdge> Edges { get; set; } = new();

    /// <summary>
    /// Name of the database this graph was loaded from.
    /// </summary>
    [JsonPropertyName("databaseName")]
    public string DatabaseName { get; set; } = string.Empty;

    /// <summary>
    /// Total number of nodes in the graph.
    /// </summary>
    [JsonPropertyName("nodeCount")]
    public int NodeCount => Nodes.Count;

    /// <summary>
    /// Total number of edges in the graph.
    /// </summary>
    [JsonPropertyName("edgeCount")]
    public int EdgeCount => Edges.Count;

    /// <summary>
    /// Converts the graph to Cytoscape.js compatible format.
    /// </summary>
    /// <returns>Object formatted for Cytoscape.js initialization.</returns>
    public object ToCytoscapeFormat()
    {
        var cytoscapeNodes = Nodes.Select(node => new
        {
            data = new
            {
                id = node.Id,
                label = node.Label,
                entityType = node.EntityType,
                observations = node.Observations,
                color = node.Color,
                size = node.Size
            }
        });

        var cytoscapeEdges = Edges.Select(edge => new
        {
            data = new
            {
                id = edge.Id,
                source = edge.Source,
                target = edge.Target,
                label = edge.Label,
                relationType = edge.RelationType
            }
        });

        return new
        {
            elements = new
            {
                nodes = cytoscapeNodes,
                edges = cytoscapeEdges
            },
            metadata = new
            {
                databaseName = DatabaseName,
                nodeCount = NodeCount,
                edgeCount = EdgeCount
            }
        };
    }
}
