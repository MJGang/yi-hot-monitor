from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "mysql+aiomysql://user:password@localhost:3306/hotspot_db"

    # AI
    deepseek_api_key: str = ""
    deepseek_api_base: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"

    # Twitter
    twitter_api_key: str = ""
    twitter_api_base: str = "https://api.twitterapi.io"

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    notify_email: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 3001
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
