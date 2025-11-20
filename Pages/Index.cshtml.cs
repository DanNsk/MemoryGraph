using MemoryGraphVisualizer.Configuration;
using MemoryGraphVisualizer.Models;
using MemoryGraphVisualizer.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;

namespace MemoryGraphVisualizer.Pages;

/// <summary>
/// Page model for the main graph visualization page.
/// </summary>
public class IndexModel : PageModel
{
    private readonly IMemoryGraphService memoryGraphService;
    private readonly MemoryGraphOptions options;
    private readonly ILogger<IndexModel> logger;

    /// <summary>
    /// List of available memory databases.
    /// </summary>
    public List<DatabaseInfo> Databases { get; set; } = new();

    /// <summary>
    /// Default layout algorithm from configuration.
    /// </summary>
    public string DefaultLayout { get; set; } = "cose";

    /// <summary>
    /// Error message to display if database loading fails.
    /// </summary>
    public string? ErrorMessage { get; set; }

    public IndexModel(
        IMemoryGraphService memoryGraphService,
        IOptions<MemoryGraphOptions> options,
        ILogger<IndexModel> logger)
    {
        this.memoryGraphService = memoryGraphService;
        this.options = options.Value;
        this.logger = logger;
    }

    public async Task OnGetAsync()
    {
        try
        {
            Databases = await memoryGraphService.GetAvailableDatabasesAsync();
            DefaultLayout = options.DefaultLayout;

            if (Databases.Count == 0)
            {
                logger.LogInformation("No databases found in memory folder");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load available databases");
            ErrorMessage = "Failed to load databases. Please check the configuration and try again.";
        }
    }
}
