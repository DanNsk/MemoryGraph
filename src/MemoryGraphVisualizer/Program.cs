using MemoryGraphVisualizer.Configuration;
using MemoryGraphVisualizer.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddRazorPages();

// Configure strongly-typed options
builder.Services.Configure<MemoryGraphOptions>(
    builder.Configuration.GetSection(MemoryGraphOptions.SectionName));

// Register application services
builder.Services.AddSingleton<ISqliteDataService, SqliteDataService>();
builder.Services.AddSingleton<IMemoryGraphService, MemoryGraphService>();
builder.Services.AddTransient<DatabaseSeeder>();

var app = builder.Build();

// Seed test databases in Development mode
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();
}

// Validate configuration on startup
var memoryGraphOptions = builder.Configuration
    .GetSection(MemoryGraphOptions.SectionName)
    .Get<MemoryGraphOptions>();

if (memoryGraphOptions != null)
{
    var resolvedPath = Path.GetFullPath(memoryGraphOptions.MemoryFolderPath);
    if (!Directory.Exists(resolvedPath))
    {
        Log.Warning("Memory folder path does not exist: {Path}. Creating directory.", resolvedPath);
        Directory.CreateDirectory(resolvedPath);
    }
    Log.Information("Memory Graph Visualizer configured with folder: {Path}", resolvedPath);
}

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapRazorPages();

// API endpoints
app.MapGet("/api/databases", async (IMemoryGraphService graphService) =>
{
    try
    {
        var databases = await graphService.GetAvailableDatabasesAsync();
        return Results.Ok(databases);
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error retrieving available databases");
        return Results.Problem("Failed to retrieve databases", statusCode: 500);
    }
});

app.MapGet("/api/graph", async (string database, IMemoryGraphService graphService) =>
{
    if (string.IsNullOrWhiteSpace(database))
    {
        return Results.BadRequest("Database name is required");
    }

    try
    {
        var graph = await graphService.LoadGraphAsync(database);
        if (graph == null)
        {
            return Results.NotFound($"Database '{database}' not found");
        }
        return Results.Ok(graph.ToCytoscapeFormat());
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error loading graph from database: {Database}", database);
        return Results.Problem($"Failed to load graph: {ex.Message}", statusCode: 500);
    }
});

Log.Information("Memory Graph Visualizer starting up");

try
{
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
