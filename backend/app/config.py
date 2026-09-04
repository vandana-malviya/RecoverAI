from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "RecoverAI — Agentic Payment Revenue Recovery"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "recoverai")
    
    # JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "recoverai_razorpay_secret_key_2026_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # OpenAI & AI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Demo & Mock Environment
    DEMO_MODE: bool = True
    MAX_RETRY_LIMIT: int = 3
    
    model_config = ConfigDict(env_file=".env", extra="ignore")


settings = Settings()
