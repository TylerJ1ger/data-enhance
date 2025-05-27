import os
import pathlib
from typing import Dict, Any, Set
from dotenv import load_dotenv

# Get the root directory of the project (adjusted for new structure)
# Since config.py is now in app/ directory, we need to go up one more level
ROOT_DIR = pathlib.Path(__file__).parent.parent.resolve()

# Load environment variables from .env file
load_dotenv(ROOT_DIR / ".env")

# =====================================
# Basic Environment Configuration
# =====================================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
APP_NAME = os.getenv("APP_NAME", "CSV & Sitemap Processor Tool")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# =====================================
# API Configuration
# =====================================
# Support both legacy and new API versions
API_VERSION = os.getenv("API_VERSION", "v1")
LEGACY_API_PREFIX = "/api"
V1_API_PREFIX = "/api/v1"

# API rate limiting (if needed in future)
API_RATE_LIMIT = int(os.getenv("API_RATE_LIMIT", 100))  # requests per minute
API_RATE_LIMIT_WINDOW = int(os.getenv("API_RATE_LIMIT_WINDOW", 60))  # seconds

# =====================================
# File Upload Configuration
# =====================================
# File size limits
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 100 * 1024 * 1024))  # 100MB default
MAX_FILES_PER_REQUEST = int(os.getenv("MAX_FILES_PER_REQUEST", 10))

# Allowed file extensions for different modules
ALLOWED_EXTENSIONS = {
    "keywords": {"csv", "xlsx"},
    "backlinks": {"csv", "xlsx"},
    "sitemaps": {"xml", "csv", "xlsx"},
    "seo": {"html", "htm"}
}

# Legacy support - combined all extensions
LEGACY_ALLOWED_EXTENSIONS = {"csv", "xlsx", "xml", "html", "htm"}

# =====================================
# Module-specific Configuration
# =====================================

# Keywords Analysis Configuration
KEYWORDS_CONFIG = {
    "max_rows_per_file": int(os.getenv("KEYWORDS_MAX_ROWS", 50000)),
    "chunk_size": int(os.getenv("KEYWORDS_CHUNK_SIZE", 1000)),
    "default_export_format": os.getenv("KEYWORDS_EXPORT_FORMAT", "csv"),
    "enable_frequency_analysis": os.getenv("KEYWORDS_ENABLE_FREQUENCY", "true").lower() == "true"
}

# Backlinks Analysis Configuration
BACKLINKS_CONFIG = {
    "max_rows_per_file": int(os.getenv("BACKLINKS_MAX_ROWS", 50000)),
    "chunk_size": int(os.getenv("BACKLINKS_CHUNK_SIZE", 1000)),
    "cross_analysis_max_results": int(os.getenv("BACKLINKS_CROSS_ANALYSIS_MAX", 10000)),
    "domain_limit_per_target": int(os.getenv("BACKLINKS_DOMAIN_LIMIT", 3)),
    "default_export_format": os.getenv("BACKLINKS_EXPORT_FORMAT", "csv")
}

# SEO Analysis Configuration
SEO_CONFIG = {
    "default_content_extractor": os.getenv("SEO_CONTENT_EXTRACTOR", "auto"),
    "enable_advanced_analysis": os.getenv("SEO_ENABLE_ADVANCED", "true").lower() == "true",
    "max_html_size": int(os.getenv("SEO_MAX_HTML_SIZE", 10 * 1024 * 1024)),  # 10MB
    "supported_extractors": ["auto", "trafilatura", "newspaper", "readability", "goose3", "custom"],
    "enable_spell_check": os.getenv("SEO_ENABLE_SPELL_CHECK", "true").lower() == "true",
    "enable_grammar_check": os.getenv("SEO_ENABLE_GRAMMAR_CHECK", "true").lower() == "true"
}

# Sitemaps Analysis Configuration
SITEMAPS_CONFIG = {
    "max_urls_per_sitemap": int(os.getenv("SITEMAPS_MAX_URLS", 50000)),
    "max_visualization_nodes": int(os.getenv("SITEMAPS_MAX_VIS_NODES", 500)),
    "max_visualization_depth": int(os.getenv("SITEMAPS_MAX_VIS_DEPTH", 3)),
    "default_visualization_type": os.getenv("SITEMAPS_DEFAULT_VIS", "tree"),
    "supported_formats": ["xml", "csv", "xlsx"],
    "enable_url_validation": os.getenv("SITEMAPS_ENABLE_VALIDATION", "true").lower() == "true"
}

# =====================================
# Logging Configuration
# =====================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
LOG_FILE = os.getenv("LOG_FILE", None)  # If None, logs only to console
ENABLE_REQUEST_LOGGING = os.getenv("ENABLE_REQUEST_LOGGING", "true").lower() == "true"

# =====================================
# Performance Configuration
# =====================================
# Timeout settings
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 300))  # 5 minutes
KEEP_ALIVE_TIMEOUT = int(os.getenv("KEEP_ALIVE_TIMEOUT", 300))  # 5 minutes

# Concurrency settings
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 4))
ENABLE_ASYNC_PROCESSING = os.getenv("ENABLE_ASYNC_PROCESSING", "true").lower() == "true"

# =====================================
# Security Configuration
# =====================================
# CORS settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000").split(",")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"

# Security headers
ENABLE_SECURITY_HEADERS = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"

# =====================================
# Development Configuration
# =====================================
# Static files serving (only in development)
SERVE_STATIC_FILES = os.getenv("SERVE_STATIC_FILES", "true" if ENVIRONMENT == "development" else "false").lower() == "true"
STATIC_DIR = ROOT_DIR / "backend" / "static"

# Debug settings
DEBUG = os.getenv("DEBUG", "true" if ENVIRONMENT == "development" else "false").lower() == "true"
RELOAD_ON_CHANGE = os.getenv("RELOAD_ON_CHANGE", "true" if ENVIRONMENT == "development" else "false").lower() == "true"

# =====================================
# Legacy Configuration (for backward compatibility)
# =====================================
# Main configuration dictionary for easy access (maintains backward compatibility)
config = {
    "environment": ENVIRONMENT,
    "app_name": APP_NAME,
    "api_version": API_VERSION,
    "port": PORT,
    "host": HOST,
    "root_dir": ROOT_DIR,
    "allowed_extensions": LEGACY_ALLOWED_EXTENSIONS,  # Legacy support
    "max_file_size": MAX_FILE_SIZE,
    "cors_origins": CORS_ORIGINS,
    "debug": DEBUG
}

# =====================================
# New Modular Configuration
# =====================================
# Complete configuration structure for new architecture
app_config = {
    # Basic settings
    "app": {
        "name": APP_NAME,
        "environment": ENVIRONMENT,
        "debug": DEBUG,
        "root_dir": ROOT_DIR
    },
    
    # Server settings
    "server": {
        "host": HOST,
        "port": PORT,
        "request_timeout": REQUEST_TIMEOUT,
        "keep_alive_timeout": KEEP_ALIVE_TIMEOUT,
        "max_workers": MAX_WORKERS
    },
    
    # API settings
    "api": {
        "version": API_VERSION,
        "legacy_prefix": LEGACY_API_PREFIX,
        "v1_prefix": V1_API_PREFIX,
        "rate_limit": API_RATE_LIMIT,
        "rate_limit_window": API_RATE_LIMIT_WINDOW
    },
    
    # File upload settings
    "upload": {
        "max_file_size": MAX_FILE_SIZE,
        "max_files_per_request": MAX_FILES_PER_REQUEST,
        "allowed_extensions": ALLOWED_EXTENSIONS
    },
    
    # Module-specific settings
    "modules": {
        "keywords": KEYWORDS_CONFIG,
        "backlinks": BACKLINKS_CONFIG,
        "seo": SEO_CONFIG,
        "sitemaps": SITEMAPS_CONFIG
    },
    
    # Logging settings
    "logging": {
        "level": LOG_LEVEL,
        "format": LOG_FORMAT,
        "file": LOG_FILE,
        "enable_request_logging": ENABLE_REQUEST_LOGGING
    },
    
    # Security settings
    "security": {
        "cors_origins": CORS_ORIGINS,
        "cors_allow_credentials": CORS_ALLOW_CREDENTIALS,
        "enable_security_headers": ENABLE_SECURITY_HEADERS
    },
    
    # Development settings
    "development": {
        "serve_static_files": SERVE_STATIC_FILES,
        "static_dir": STATIC_DIR,
        "reload_on_change": RELOAD_ON_CHANGE
    }
}

# =====================================
# Utility Functions
# =====================================

def is_development() -> bool:
    """Check if the application is running in development mode."""
    return ENVIRONMENT.lower() == "development"

def is_production() -> bool:
    """Check if the application is running in production mode."""
    return ENVIRONMENT.lower() == "production"

def is_testing() -> bool:
    """Check if the application is running in testing mode."""
    return ENVIRONMENT.lower() == "testing"

def get_module_config(module_name: str) -> Dict[str, Any]:
    return app_config["modules"].get(module_name, {})

def get_allowed_extensions(module_name: str = None) -> Set[str]:
    if module_name is None:
        return LEGACY_ALLOWED_EXTENSIONS
    
    return ALLOWED_EXTENSIONS.get(module_name, set())

def is_file_size_valid(file_size: int) -> bool:
    return file_size <= MAX_FILE_SIZE

def get_cors_settings() -> Dict[str, Any]:
    return {
        "allow_origins": CORS_ORIGINS,
        "allow_credentials": CORS_ALLOW_CREDENTIALS,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
        "expose_headers": ["Content-Disposition"]
    }

def get_api_prefix(version: str = None) -> str:
    if version == "legacy":
        return LEGACY_API_PREFIX
    elif version == "v1":
        return V1_API_PREFIX
    else:
        return V1_API_PREFIX  # Default to v1

# =====================================
# Validation Functions
# =====================================

def validate_environment_config() -> Dict[str, Any]:
    validation_results = {
        "valid": True,
        "warnings": [],
        "errors": []
    }
    
    # Check critical settings
    if not ROOT_DIR.exists():
        validation_results["errors"].append(f"Root directory does not exist: {ROOT_DIR}")
        validation_results["valid"] = False
    
    if MAX_FILE_SIZE <= 0:
        validation_results["errors"].append("MAX_FILE_SIZE must be positive")
        validation_results["valid"] = False
    
    if PORT <= 0 or PORT > 65535:
        validation_results["errors"].append("PORT must be between 1 and 65535")
        validation_results["valid"] = False
    
    # Check warnings
    if ENVIRONMENT not in ["development", "production", "testing"]:
        validation_results["warnings"].append(f"Unknown environment: {ENVIRONMENT}")
    
    if is_production() and DEBUG:
        validation_results["warnings"].append("DEBUG is enabled in production environment")
    
    return validation_results

# =====================================
# Initialization
# =====================================

# Validate configuration on import
_validation_results = validate_environment_config()
if not _validation_results["valid"]:
    import sys
    print("Configuration validation failed:")
    for error in _validation_results["errors"]:
        print(f"  ERROR: {error}")
    sys.exit(1)

# Print warnings if any
if _validation_results["warnings"]:
    import warnings
    for warning in _validation_results["warnings"]:
        warnings.warn(f"Configuration warning: {warning}")

# Export commonly used items for easy import
__all__ = [
    # Basic config
    "config", "app_config",
    
    # Environment
    "ENVIRONMENT", "is_development", "is_production", "is_testing",
    
    # Server settings
    "HOST", "PORT", "APP_NAME",
    
    # File settings
    "MAX_FILE_SIZE", "ALLOWED_EXTENSIONS", "get_allowed_extensions",
    
    # Module configs
    "KEYWORDS_CONFIG", "BACKLINKS_CONFIG", "SEO_CONFIG", "SITEMAPS_CONFIG",
    "get_module_config",
    
    # API settings
    "API_VERSION", "LEGACY_API_PREFIX", "V1_API_PREFIX", "get_api_prefix",
    
    # Utility functions
    "get_cors_settings", "is_file_size_valid", "validate_environment_config"
]