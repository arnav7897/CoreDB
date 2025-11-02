"""
Configuration settings for Mini SQL Playground backend.
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_TITLE: str = "Mini SQL Playground"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    # Database Settings
    DB_PATH: str = "coredb_data"
    DB_PERSISTENCE: bool = True
    # Storage mode: 'json' or 'indexed'
    STORAGE_MODE: str = "indexed"
    
    # Session Settings
    SESSION_TIMEOUT: int = 3600  # 1 hour
    MAX_QUERY_HISTORY: int = 100
    
    # Logging Settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Security Settings
    MAX_QUERY_LENGTH: int = 10000
    MAX_RESULT_ROWS: int = 1000
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
