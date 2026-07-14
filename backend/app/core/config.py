import os
import urllib.parse
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = None
    GUARDIAN_API_KEY: str = "guardian-admin-secret"
    ENVIRONMENT: str = "dev"
    
    # Supabase credentials (SUPABASE_URL in .env is the postgres connection string,
    # and SUPABASE_Publishable_URL is the HTTP API URL)
    SUPABASE_URL: Optional[str] = None  # Raw postgres URL
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_Publishable_URL: Optional[str] = None  # Supabase HTTPS API URL
    
    HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @computed_field
    @property
    def database_url(self) -> str:
        """
        Determines the database connection URL.
        Converts postgresql:// to postgresql+asyncpg:// for async compatibility,
        and URL-encodes passwords with special characters (like @ or $).
        Falls back to a local SQLite database if SUPABASE_URL is not set.
        """
        if not self.SUPABASE_URL or not self.SUPABASE_URL.startswith(("postgresql://", "postgres://")):
            # Fallback to local SQLite database
            return "sqlite+aiosqlite:///./guardian_ai.db"
        
        url = self.SUPABASE_URL
        # Replace postgres:// with postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        try:
            # Parse credentials to URL-encode password if it contains special characters
            # Format: postgresql://username:password@host:port/database
            prefix = "postgresql://"
            body = url[len(prefix):]
            
            # Find the userinfo and host separator '@'
            # Note: password might contain '@', so we split from the right side for the actual host separator
            if "@" in body:
                # The host divider is the last '@' before port/db path
                parts = body.rsplit("@", 1)
                userinfo = parts[0]
                host_db = parts[1]
                
                if ":" in userinfo:
                    username, password = userinfo.split(":", 1)
                    # URL-encode the password to escape special characters like @, $, !, etc.
                    encoded_password = urllib.parse.quote_plus(password)
                    # Reconstruct the connection URL
                    url = f"postgresql+asyncpg://{username}:{encoded_password}@{host_db}"
                else:
                    url = f"postgresql+asyncpg://{body}"
            else:
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        except Exception:
            # Fallback to appending asyncpg directly if parsing fails
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        return url

settings = Settings()
