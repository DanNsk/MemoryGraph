using System.ComponentModel.DataAnnotations;

namespace MemoryGraphVisualizer.Configuration;

/// <summary>
/// Configuration options for the Memory Graph Visualizer.
/// </summary>
public class MemoryGraphOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "MemoryGraph";

    /// <summary>
    /// Path to the folder containing memory database files.
    /// </summary>
    [Required(ErrorMessage = "MemoryFolderPath is required")]
    public string MemoryFolderPath { get; set; } = "./.memory/";

    /// <summary>
    /// Maximum number of nodes to load for performance protection.
    /// </summary>
    [Range(100, 100000, ErrorMessage = "MaxGraphNodes must be between 100 and 100000")]
    public int MaxGraphNodes { get; set; } = 10000;

    /// <summary>
    /// Default layout algorithm for graph visualization.
    /// </summary>
    public string DefaultLayout { get; set; } = "cose";
}
