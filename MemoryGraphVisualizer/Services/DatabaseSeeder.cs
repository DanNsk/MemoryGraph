using MemoryGraphVisualizer.Configuration;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace MemoryGraphVisualizer.Services;

/// <summary>
/// Service for creating test databases with sample data.
/// </summary>
public class DatabaseSeeder
{
    private readonly MemoryGraphOptions options;
    private readonly ILogger<DatabaseSeeder> logger;

    public DatabaseSeeder(IOptions<MemoryGraphOptions> options, ILogger<DatabaseSeeder> logger)
    {
        this.options = options.Value;
        this.logger = logger;
    }

    /// <summary>
    /// Seeds the memory folder with test databases if they don't exist.
    /// </summary>
    public async Task SeedAsync()
    {
        var folderPath = Path.GetFullPath(options.MemoryFolderPath);

        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        await CreateSoftwareProjectDatabaseAsync(Path.Combine(folderPath, "software-project.db"));
        await CreateTeamKnowledgeDatabaseAsync(Path.Combine(folderPath, "team-knowledge.db"));
        await CreateEmptyDatabaseAsync(Path.Combine(folderPath, "empty.db"));
        await CreateNodesOnlyDatabaseAsync(Path.Combine(folderPath, "nodes-only.db"));
    }

    private async Task CreateDatabaseSchema(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS entities (
                name TEXT PRIMARY KEY,
                entityType TEXT NOT NULL,
                observations TEXT
            );

            CREATE TABLE IF NOT EXISTS relations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fromEntity TEXT NOT NULL,
                toEntity TEXT NOT NULL,
                relationType TEXT NOT NULL,
                fromType TEXT DEFAULT '',
                toType TEXT DEFAULT '',
                FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
                FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entityType);
            CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(fromEntity);
            CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(toEntity);
        ";
        await command.ExecuteNonQueryAsync();
    }

    private async Task CreateSoftwareProjectDatabaseAsync(string dbPath)
    {
        if (File.Exists(dbPath))
        {
            logger.LogDebug("Database already exists: {Path}", dbPath);
            return;
        }

        logger.LogInformation("Creating test database: {Path}", dbPath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();

        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        await CreateDatabaseSchema(connection);

        // Insert entities
        var entities = new[]
        {
            ("AuthModule", "module", "[{\"text\": \"Handles user authentication and authorization\", \"timestamp\": \"2025-01-15T10:30:00Z\", \"source\": \"code-analysis\"}, {\"text\": \"Uses JWT tokens for session management\", \"timestamp\": \"2025-01-15T10:31:00Z\", \"source\": \"documentation\"}]"),
            ("UserService", "service", "[{\"text\": \"Core service for user management\", \"timestamp\": \"2025-01-15T11:00:00Z\", \"source\": \"code-analysis\"}, {\"text\": \"Implements caching for performance\", \"source\": \"code-review\"}]"),
            ("UserController", "class", "[{\"text\": \"REST API controller for user operations\", \"timestamp\": \"2025-01-16T09:00:00Z\"}]"),
            ("User", "class", "[{\"text\": \"Domain entity representing a user\", \"timestamp\": \"2025-01-14T14:00:00Z\", \"source\": \"documentation\"}]"),
            ("UserRepository", "class", "[{\"text\": \"Data access layer for User entities\", \"source\": \"code-analysis\"}]"),
            ("DatabaseContext", "class", "[{\"text\": \"Entity Framework DbContext\", \"timestamp\": \"2025-01-14T14:30:00Z\"}]"),
            ("AuthController", "class", "[{\"text\": \"Handles login, logout, and token refresh\", \"timestamp\": \"2025-01-15T10:45:00Z\", \"source\": \"code-analysis\"}]"),
            ("TokenService", "service", "[{\"text\": \"JWT token generation and validation\", \"timestamp\": \"2025-01-15T10:35:00Z\"}]"),
            ("EmailService", "service", "[{\"text\": \"Sends transactional emails\", \"source\": \"documentation\"}]"),
            ("NotificationModule", "module", "[{\"text\": \"Manages all notification channels\", \"timestamp\": \"2025-01-17T08:00:00Z\"}]"),
            ("CacheService", "service", "[{\"text\": \"Redis-based caching implementation\", \"timestamp\": \"2025-01-16T10:00:00Z\", \"source\": \"code-analysis\"}]"),
            ("LoggingModule", "module", "[{\"text\": \"Centralized logging with Serilog\", \"source\": \"documentation\"}]"),
            ("ConfigService", "service", "[{\"text\": \"Configuration management from appsettings\", \"timestamp\": \"2025-01-14T09:00:00Z\"}]"),
            ("HealthCheckController", "class", "[{\"text\": \"Exposes health check endpoints\", \"source\": \"code-analysis\"}]"),
            ("MetricsService", "service", "[{\"text\": \"Application metrics and monitoring\", \"timestamp\": \"2025-01-18T11:00:00Z\"}]"),
            ("DataModule", "module", "[{\"text\": \"Database access and migrations\", \"source\": \"documentation\"}]"),
            ("MigrationService", "service", "[{\"text\": \"Handles database schema migrations\"}]"),
            ("ValidationService", "service", "[{\"text\": \"Input validation and sanitization\", \"timestamp\": \"2025-01-15T15:00:00Z\", \"source\": \"security-review\"}]"),
            ("PasswordHasher", "class", "[{\"text\": \"BCrypt password hashing implementation\", \"timestamp\": \"2025-01-15T10:40:00Z\", \"source\": \"security-review\"}]"),
            ("RoleService", "service", "[{\"text\": \"Role-based access control\", \"source\": \"documentation\"}]"),
            ("Permission", "class", "[{\"text\": \"Permission entity for RBAC\"}]"),
            ("Role", "class", "[{\"text\": \"Role entity with permission collection\", \"timestamp\": \"2025-01-15T11:30:00Z\"}]"),
            ("AuditService", "service", "[{\"text\": \"Audit logging for compliance\", \"source\": \"compliance-review\"}]"),
            ("AuditLog", "class", "[{\"text\": \"Audit log entry entity\"}]"),
            ("ApiModule", "module", "[{\"text\": \"REST API layer\", \"timestamp\": \"2025-01-14T08:00:00Z\", \"source\": \"documentation\"}]"),
            ("ErrorHandler", "class", "[{\"text\": \"Global exception handling middleware\", \"source\": \"code-analysis\"}]"),
            ("RequestLogger", "class", "[{\"text\": \"HTTP request/response logging\", \"timestamp\": \"2025-01-16T14:00:00Z\"}]"),
            ("RateLimiter", "class", "[{\"text\": \"API rate limiting implementation\", \"source\": \"security-review\"}]"),
            ("CorsPolicyService", "service", "[{\"text\": \"CORS configuration management\"}]"),
            ("SwaggerConfig", "config", "[{\"text\": \"OpenAPI documentation setup\", \"timestamp\": \"2025-01-14T10:00:00Z\"}]")
        };

        foreach (var (name, entityType, observations) in entities)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO entities (name, entityType, observations) VALUES (@name, @type, @obs)";
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@type", entityType);
            cmd.Parameters.AddWithValue("@obs", observations);
            await cmd.ExecuteNonQueryAsync();
        }

        // Insert relations (from, fromType, to, toType, relationType)
        var relations = new[]
        {
            ("AuthModule", "module", "UserService", "service", "depends_on"),
            ("AuthModule", "module", "TokenService", "service", "contains"),
            ("AuthModule", "module", "PasswordHasher", "class", "contains"),
            ("AuthModule", "module", "RoleService", "service", "depends_on"),
            ("UserService", "service", "UserRepository", "class", "uses"),
            ("UserService", "service", "CacheService", "service", "uses"),
            ("UserService", "service", "ValidationService", "service", "uses"),
            ("UserService", "service", "EmailService", "service", "uses"),
            ("UserController", "class", "UserService", "service", "calls"),
            ("UserController", "class", "ValidationService", "service", "calls"),
            ("UserRepository", "class", "DatabaseContext", "class", "uses"),
            ("UserRepository", "class", "User", "class", "manages"),
            ("AuthController", "class", "TokenService", "service", "calls"),
            ("AuthController", "class", "UserService", "service", "calls"),
            ("AuthController", "class", "AuditService", "service", "calls"),
            ("TokenService", "service", "ConfigService", "service", "uses"),
            ("EmailService", "service", "ConfigService", "service", "uses"),
            ("NotificationModule", "module", "EmailService", "service", "contains"),
            ("CacheService", "service", "ConfigService", "service", "uses"),
            ("LoggingModule", "module", "ConfigService", "service", "uses"),
            ("HealthCheckController", "class", "MetricsService", "service", "calls"),
            ("HealthCheckController", "class", "DatabaseContext", "class", "calls"),
            ("DataModule", "module", "DatabaseContext", "class", "contains"),
            ("DataModule", "module", "MigrationService", "service", "contains"),
            ("MigrationService", "service", "DatabaseContext", "class", "uses"),
            ("RoleService", "service", "Role", "class", "manages"),
            ("RoleService", "service", "Permission", "class", "manages"),
            ("RoleService", "service", "CacheService", "service", "uses"),
            ("AuditService", "service", "AuditLog", "class", "manages"),
            ("AuditService", "service", "DatabaseContext", "class", "uses"),
            ("ApiModule", "module", "AuthController", "class", "contains"),
            ("ApiModule", "module", "UserController", "class", "contains"),
            ("ApiModule", "module", "HealthCheckController", "class", "contains"),
            ("ApiModule", "module", "ErrorHandler", "class", "contains"),
            ("ApiModule", "module", "RequestLogger", "class", "contains"),
            ("ApiModule", "module", "RateLimiter", "class", "contains"),
            ("ErrorHandler", "class", "LoggingModule", "module", "uses"),
            ("RequestLogger", "class", "LoggingModule", "module", "uses"),
            ("RateLimiter", "class", "CacheService", "service", "uses"),
            ("SwaggerConfig", "config", "ApiModule", "module", "documents")
        };

        foreach (var (from, fromType, to, toType, relationType) in relations)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO relations (fromEntity, toEntity, relationType, fromType, toType) VALUES (@from, @to, @type, @fromType, @toType)";
            cmd.Parameters.AddWithValue("@from", from);
            cmd.Parameters.AddWithValue("@to", to);
            cmd.Parameters.AddWithValue("@type", relationType);
            cmd.Parameters.AddWithValue("@fromType", fromType);
            cmd.Parameters.AddWithValue("@toType", toType);
            await cmd.ExecuteNonQueryAsync();
        }

        logger.LogInformation("Created software-project.db with {EntityCount} entities and {RelationCount} relations", entities.Length, relations.Length);
    }

    private async Task CreateTeamKnowledgeDatabaseAsync(string dbPath)
    {
        if (File.Exists(dbPath))
        {
            logger.LogDebug("Database already exists: {Path}", dbPath);
            return;
        }

        logger.LogInformation("Creating test database: {Path}", dbPath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();

        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        await CreateDatabaseSchema(connection);

        var entities = new[]
        {
            ("Alice Chen", "person", "[{\"text\": \"Senior backend developer\", \"source\": \"hr-system\"}, {\"text\": \"Expert in distributed systems\", \"timestamp\": \"2025-01-10T09:00:00Z\"}]"),
            ("Bob Smith", "person", "[{\"text\": \"Frontend lead\", \"source\": \"hr-system\"}, {\"text\": \"React and TypeScript specialist\"}]"),
            ("Carol Davis", "person", "[{\"text\": \"DevOps engineer\", \"source\": \"hr-system\"}]"),
            ("David Lee", "person", "[{\"text\": \"Product manager\", \"timestamp\": \"2025-01-05T10:00:00Z\"}]"),
            ("Authentication System", "project", "[{\"text\": \"OAuth2 and OIDC implementation\", \"source\": \"confluence\"}, {\"text\": \"Critical security component\"}]"),
            ("Dashboard Redesign", "project", "[{\"text\": \"New analytics dashboard\", \"timestamp\": \"2025-01-08T14:00:00Z\"}]"),
            ("CI/CD Pipeline", "project", "[{\"text\": \"GitHub Actions workflow\", \"source\": \"documentation\"}]"),
            ("Microservices Migration", "project", "[{\"text\": \"Monolith to microservices\", \"source\": \"architecture-review\"}]"),
            ("React", "technology", "[{\"text\": \"Frontend framework\"}]"),
            ("Kubernetes", "technology", "[{\"text\": \"Container orchestration\", \"source\": \"tech-radar\"}]"),
            ("PostgreSQL", "technology", "[{\"text\": \"Primary database\"}]"),
            ("Redis", "technology", "[{\"text\": \"Caching layer\"}]"),
            ("Sprint 23", "concept", "[{\"text\": \"Current sprint\", \"timestamp\": \"2025-01-15T08:00:00Z\"}]"),
            ("Technical Debt", "concept", "[{\"text\": \"Accumulated shortcuts in codebase\"}]"),
            ("Security Review", "document", "[{\"text\": \"Q1 2025 security audit findings\", \"source\": \"security-team\"}]")
        };

        foreach (var (name, entityType, observations) in entities)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO entities (name, entityType, observations) VALUES (@name, @type, @obs)";
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@type", entityType);
            cmd.Parameters.AddWithValue("@obs", observations);
            await cmd.ExecuteNonQueryAsync();
        }

        var relations = new[]
        {
            ("Alice Chen", "person", "Authentication System", "project", "leads"),
            ("Alice Chen", "person", "PostgreSQL", "technology", "expert_in"),
            ("Alice Chen", "person", "Redis", "technology", "expert_in"),
            ("Bob Smith", "person", "Dashboard Redesign", "project", "leads"),
            ("Bob Smith", "person", "React", "technology", "expert_in"),
            ("Carol Davis", "person", "CI/CD Pipeline", "project", "leads"),
            ("Carol Davis", "person", "Kubernetes", "technology", "expert_in"),
            ("David Lee", "person", "Sprint 23", "concept", "manages"),
            ("David Lee", "person", "Dashboard Redesign", "project", "owns"),
            ("Authentication System", "project", "Microservices Migration", "project", "part_of"),
            ("Authentication System", "project", "PostgreSQL", "technology", "uses"),
            ("Authentication System", "project", "Redis", "technology", "uses"),
            ("Dashboard Redesign", "project", "React", "technology", "uses"),
            ("CI/CD Pipeline", "project", "Kubernetes", "technology", "uses"),
            ("Microservices Migration", "project", "Technical Debt", "concept", "addresses"),
            ("Security Review", "document", "Authentication System", "project", "audits")
        };

        foreach (var (from, fromType, to, toType, relationType) in relations)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO relations (fromEntity, toEntity, relationType, fromType, toType) VALUES (@from, @to, @type, @fromType, @toType)";
            cmd.Parameters.AddWithValue("@from", from);
            cmd.Parameters.AddWithValue("@to", to);
            cmd.Parameters.AddWithValue("@type", relationType);
            cmd.Parameters.AddWithValue("@fromType", fromType);
            cmd.Parameters.AddWithValue("@toType", toType);
            await cmd.ExecuteNonQueryAsync();
        }

        logger.LogInformation("Created team-knowledge.db with {EntityCount} entities and {RelationCount} relations", entities.Length, relations.Length);
    }

    private async Task CreateEmptyDatabaseAsync(string dbPath)
    {
        if (File.Exists(dbPath))
        {
            logger.LogDebug("Database already exists: {Path}", dbPath);
            return;
        }

        logger.LogInformation("Creating test database: {Path}", dbPath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();

        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        await CreateDatabaseSchema(connection);

        logger.LogInformation("Created empty.db with 0 entities and 0 relations");
    }

    private async Task CreateNodesOnlyDatabaseAsync(string dbPath)
    {
        if (File.Exists(dbPath))
        {
            logger.LogDebug("Database already exists: {Path}", dbPath);
            return;
        }

        logger.LogInformation("Creating test database: {Path}", dbPath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();

        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync();

        await CreateDatabaseSchema(connection);

        var entities = new[]
        {
            ("Concept A", "concept", "[{\"text\": \"Standalone concept A\"}]"),
            ("Concept B", "concept", "[{\"text\": \"Standalone concept B\"}]"),
            ("Concept C", "concept", "[{\"text\": \"Standalone concept C\"}]"),
            ("Concept D", "concept", "[{\"text\": \"Standalone concept D\"}]"),
            ("Concept E", "concept", "[{\"text\": \"Standalone concept E\"}]")
        };

        foreach (var (name, entityType, observations) in entities)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO entities (name, entityType, observations) VALUES (@name, @type, @obs)";
            cmd.Parameters.AddWithValue("@name", name);
            cmd.Parameters.AddWithValue("@type", entityType);
            cmd.Parameters.AddWithValue("@obs", observations);
            await cmd.ExecuteNonQueryAsync();
        }

        logger.LogInformation("Created nodes-only.db with {EntityCount} entities and 0 relations", entities.Length);
    }
}
