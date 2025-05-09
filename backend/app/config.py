import os
import pathlib
from dotenv import load_dotenv

# Get the root directory of the project
ROOT_DIR = pathlib.Path(__file__).parent.parent.resolve()

# Load environment variables from .env file
load_dotenv(ROOT_DIR / ".env")

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
APP_NAME = os.getenv("APP_NAME", "CSV & Sitemap Processor Tool")
API_VERSION = os.getenv("API_VERSION", "v1")
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Constants
ALLOWED_EXTENSIONS = {"csv", "xlsx", "xml"}  # 新增 XML 格式

# Configuration dictionary for easy access
config = {
    "environment": ENVIRONMENT,
    "app_name": APP_NAME,
    "api_version": API_VERSION,
    "port": PORT,
    "host": HOST,
    "root_dir": ROOT_DIR,
    "allowed_extensions": ALLOWED_EXTENSIONS,
}

def is_development():
    """Check if the application is running in development mode."""
    return ENVIRONMENT.lower() == "development"

def is_production():
    """Check if the application is running in production mode."""
    return ENVIRONMENT.lower() == "production"