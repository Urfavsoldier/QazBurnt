from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QazBurnt API"
    environment: str = "development"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    frontend_origin: str = "http://127.0.0.1:3000"
    allowed_origins: str = "http://127.0.0.1:3000,http://localhost:3000"
    data_dir: Path = Path("./data")
    mock_mode: bool = True
    mock_fallback: bool = True
    ingestion_enabled: bool = False
    ingestion_interval_seconds: int = Field(default=300, ge=30)
    firms_map_key: str | None = None
    firms_source: str = "VIIRS_SNPP_NRT"
    open_meteo_url: AnyHttpUrl = "https://api.open-meteo.com/v1/forecast"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]
        if self.frontend_origin not in origins:
            origins.append(self.frontend_origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings
