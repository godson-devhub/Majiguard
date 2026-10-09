from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-level settings for the FastAPI foundation."""

    app_name: str = "MajiGuard AI API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    debug: bool = False
    database_url: str | None = None
    # Sign-in: secret used to sign access tokens (set it in backend/.env) and their lifetime.
    auth_secret_key: str | None = None
    auth_token_ttl_minutes: int = 480

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
