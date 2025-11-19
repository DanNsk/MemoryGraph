#!/bin/bash

# Create test databases for Memory Graph Visualizer
# Usage: ./create-test-databases.sh [output_directory]

OUTPUT_DIR="${1:-../src/MemoryGraphVisualizer/.memory}"

mkdir -p "$OUTPUT_DIR"

echo "Creating test databases in: $OUTPUT_DIR"

# ==============================================================================
# Database 1: Software Project (Medium - ~50 nodes)
# ==============================================================================
DB_FILE="$OUTPUT_DIR/software-project.db"
rm -f "$DB_FILE"

sqlite3 "$DB_FILE" << 'EOF'
-- Create schema
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT
);

CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL,
    FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
    FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
);

CREATE INDEX idx_entities_type ON entities(entityType);
CREATE INDEX idx_relations_from ON relations(fromEntity);
CREATE INDEX idx_relations_to ON relations(toEntity);

-- Insert entities
INSERT INTO entities (name, entityType, observations) VALUES
('AuthModule', 'module', '[{"text": "Handles user authentication and authorization", "timestamp": "2025-01-15T10:30:00Z", "source": "code-analysis"}, {"text": "Uses JWT tokens for session management", "timestamp": "2025-01-15T10:31:00Z", "source": "documentation"}]'),
('UserService', 'service', '[{"text": "Core service for user management", "timestamp": "2025-01-15T11:00:00Z", "source": "code-analysis"}, {"text": "Implements caching for performance", "source": "code-review"}]'),
('UserController', 'class', '[{"text": "REST API controller for user operations", "timestamp": "2025-01-16T09:00:00Z"}]'),
('User', 'class', '[{"text": "Domain entity representing a user", "timestamp": "2025-01-14T14:00:00Z", "source": "documentation"}]'),
('UserRepository', 'class', '[{"text": "Data access layer for User entities", "source": "code-analysis"}]'),
('DatabaseContext', 'class', '[{"text": "Entity Framework DbContext", "timestamp": "2025-01-14T14:30:00Z"}]'),
('AuthController', 'class', '[{"text": "Handles login, logout, and token refresh", "timestamp": "2025-01-15T10:45:00Z", "source": "code-analysis"}]'),
('TokenService', 'service', '[{"text": "JWT token generation and validation", "timestamp": "2025-01-15T10:35:00Z"}]'),
('EmailService', 'service', '[{"text": "Sends transactional emails", "source": "documentation"}]'),
('NotificationModule', 'module', '[{"text": "Manages all notification channels", "timestamp": "2025-01-17T08:00:00Z"}]'),
('CacheService', 'service', '[{"text": "Redis-based caching implementation", "timestamp": "2025-01-16T10:00:00Z", "source": "code-analysis"}]'),
('LoggingModule', 'module', '[{"text": "Centralized logging with Serilog", "source": "documentation"}]'),
('ConfigService', 'service', '[{"text": "Configuration management from appsettings", "timestamp": "2025-01-14T09:00:00Z"}]'),
('HealthCheckController', 'class', '[{"text": "Exposes health check endpoints", "source": "code-analysis"}]'),
('MetricsService', 'service', '[{"text": "Application metrics and monitoring", "timestamp": "2025-01-18T11:00:00Z"}]'),
('DataModule', 'module', '[{"text": "Database access and migrations", "source": "documentation"}]'),
('MigrationService', 'service', '[{"text": "Handles database schema migrations"}]'),
('ValidationService', 'service', '[{"text": "Input validation and sanitization", "timestamp": "2025-01-15T15:00:00Z", "source": "security-review"}]'),
('PasswordHasher', 'class', '[{"text": "BCrypt password hashing implementation", "timestamp": "2025-01-15T10:40:00Z", "source": "security-review"}]'),
('RoleService', 'service', '[{"text": "Role-based access control", "source": "documentation"}]'),
('Permission', 'class', '[{"text": "Permission entity for RBAC"}]'),
('Role', 'class', '[{"text": "Role entity with permission collection", "timestamp": "2025-01-15T11:30:00Z"}]'),
('AuditService', 'service', '[{"text": "Audit logging for compliance", "source": "compliance-review"}]'),
('AuditLog', 'class', '[{"text": "Audit log entry entity"}]'),
('ApiModule', 'module', '[{"text": "REST API layer", "timestamp": "2025-01-14T08:00:00Z", "source": "documentation"}]'),
('ErrorHandler', 'class', '[{"text": "Global exception handling middleware", "source": "code-analysis"}]'),
('RequestLogger', 'class', '[{"text": "HTTP request/response logging", "timestamp": "2025-01-16T14:00:00Z"}]'),
('RateLimiter', 'class', '[{"text": "API rate limiting implementation", "source": "security-review"}]'),
('CorsPolicyService', 'service', '[{"text": "CORS configuration management"}]'),
('SwaggerConfig', 'config', '[{"text": "OpenAPI documentation setup", "timestamp": "2025-01-14T10:00:00Z"}]');

-- Insert relations
INSERT INTO relations (fromEntity, toEntity, relationType) VALUES
('AuthModule', 'UserService', 'depends_on'),
('AuthModule', 'TokenService', 'contains'),
('AuthModule', 'PasswordHasher', 'contains'),
('AuthModule', 'RoleService', 'depends_on'),
('UserService', 'UserRepository', 'uses'),
('UserService', 'CacheService', 'uses'),
('UserService', 'ValidationService', 'uses'),
('UserService', 'EmailService', 'uses'),
('UserController', 'UserService', 'calls'),
('UserController', 'ValidationService', 'calls'),
('UserRepository', 'DatabaseContext', 'uses'),
('UserRepository', 'User', 'manages'),
('AuthController', 'TokenService', 'calls'),
('AuthController', 'UserService', 'calls'),
('AuthController', 'AuditService', 'calls'),
('TokenService', 'ConfigService', 'uses'),
('EmailService', 'ConfigService', 'uses'),
('NotificationModule', 'EmailService', 'contains'),
('CacheService', 'ConfigService', 'uses'),
('LoggingModule', 'ConfigService', 'uses'),
('HealthCheckController', 'MetricsService', 'calls'),
('HealthCheckController', 'DatabaseContext', 'calls'),
('DataModule', 'DatabaseContext', 'contains'),
('DataModule', 'MigrationService', 'contains'),
('MigrationService', 'DatabaseContext', 'uses'),
('RoleService', 'Role', 'manages'),
('RoleService', 'Permission', 'manages'),
('RoleService', 'CacheService', 'uses'),
('AuditService', 'AuditLog', 'manages'),
('AuditService', 'DatabaseContext', 'uses'),
('ApiModule', 'AuthController', 'contains'),
('ApiModule', 'UserController', 'contains'),
('ApiModule', 'HealthCheckController', 'contains'),
('ApiModule', 'ErrorHandler', 'contains'),
('ApiModule', 'RequestLogger', 'contains'),
('ApiModule', 'RateLimiter', 'contains'),
('ErrorHandler', 'LoggingModule', 'uses'),
('RequestLogger', 'LoggingModule', 'uses'),
('RateLimiter', 'CacheService', 'uses'),
('SwaggerConfig', 'ApiModule', 'documents');
EOF

echo "Created: software-project.db (29 entities, 40 relations)"

# ==============================================================================
# Database 2: Team Knowledge (Small - ~15 nodes)
# ==============================================================================
DB_FILE="$OUTPUT_DIR/team-knowledge.db"
rm -f "$DB_FILE"

sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT
);

CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL,
    FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
    FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
);

INSERT INTO entities (name, entityType, observations) VALUES
('Alice Chen', 'person', '[{"text": "Senior backend developer", "source": "hr-system"}, {"text": "Expert in distributed systems", "timestamp": "2025-01-10T09:00:00Z"}]'),
('Bob Smith', 'person', '[{"text": "Frontend lead", "source": "hr-system"}, {"text": "React and TypeScript specialist"}]'),
('Carol Davis', 'person', '[{"text": "DevOps engineer", "source": "hr-system"}]'),
('David Lee', 'person', '[{"text": "Product manager", "timestamp": "2025-01-05T10:00:00Z"}]'),
('Authentication System', 'project', '[{"text": "OAuth2 and OIDC implementation", "source": "confluence"}, {"text": "Critical security component"}]'),
('Dashboard Redesign', 'project', '[{"text": "New analytics dashboard", "timestamp": "2025-01-08T14:00:00Z"}]'),
('CI/CD Pipeline', 'project', '[{"text": "GitHub Actions workflow", "source": "documentation"}]'),
('Microservices Migration', 'project', '[{"text": "Monolith to microservices", "source": "architecture-review"}]'),
('React', 'technology', '[{"text": "Frontend framework"}]'),
('Kubernetes', 'technology', '[{"text": "Container orchestration", "source": "tech-radar"}]'),
('PostgreSQL', 'technology', '[{"text": "Primary database"}]'),
('Redis', 'technology', '[{"text": "Caching layer"}]'),
('Sprint 23', 'concept', '[{"text": "Current sprint", "timestamp": "2025-01-15T08:00:00Z"}]'),
('Technical Debt', 'concept', '[{"text": "Accumulated shortcuts in codebase"}]'),
('Security Review', 'document', '[{"text": "Q1 2025 security audit findings", "source": "security-team"}]');

INSERT INTO relations (fromEntity, toEntity, relationType) VALUES
('Alice Chen', 'Authentication System', 'leads'),
('Alice Chen', 'PostgreSQL', 'expert_in'),
('Alice Chen', 'Redis', 'expert_in'),
('Bob Smith', 'Dashboard Redesign', 'leads'),
('Bob Smith', 'React', 'expert_in'),
('Carol Davis', 'CI/CD Pipeline', 'leads'),
('Carol Davis', 'Kubernetes', 'expert_in'),
('David Lee', 'Sprint 23', 'manages'),
('David Lee', 'Dashboard Redesign', 'owns'),
('Authentication System', 'Microservices Migration', 'part_of'),
('Authentication System', 'PostgreSQL', 'uses'),
('Authentication System', 'Redis', 'uses'),
('Dashboard Redesign', 'React', 'uses'),
('CI/CD Pipeline', 'Kubernetes', 'uses'),
('Microservices Migration', 'Technical Debt', 'addresses'),
('Security Review', 'Authentication System', 'audits');
EOF

echo "Created: team-knowledge.db (15 entities, 16 relations)"

# ==============================================================================
# Database 3: Empty Database (Edge case)
# ==============================================================================
DB_FILE="$OUTPUT_DIR/empty.db"
rm -f "$DB_FILE"

sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT
);

CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL,
    FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
    FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
);
EOF

echo "Created: empty.db (0 entities, 0 relations)"

# ==============================================================================
# Database 4: Nodes Only (No relations - edge case)
# ==============================================================================
DB_FILE="$OUTPUT_DIR/nodes-only.db"
rm -f "$DB_FILE"

sqlite3 "$DB_FILE" << 'EOF'
CREATE TABLE entities (
    name TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    observations TEXT
);

CREATE TABLE relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromEntity TEXT NOT NULL,
    toEntity TEXT NOT NULL,
    relationType TEXT NOT NULL,
    FOREIGN KEY (fromEntity) REFERENCES entities(name) ON DELETE CASCADE,
    FOREIGN KEY (toEntity) REFERENCES entities(name) ON DELETE CASCADE
);

INSERT INTO entities (name, entityType, observations) VALUES
('Concept A', 'concept', '[{"text": "Standalone concept A"}]'),
('Concept B', 'concept', '[{"text": "Standalone concept B"}]'),
('Concept C', 'concept', '[{"text": "Standalone concept C"}]'),
('Concept D', 'concept', '[{"text": "Standalone concept D"}]'),
('Concept E', 'concept', '[{"text": "Standalone concept E"}]');
EOF

echo "Created: nodes-only.db (5 entities, 0 relations)"

echo ""
echo "Test databases created successfully!"
echo "Location: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
