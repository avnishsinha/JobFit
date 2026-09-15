import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./api/jobfit.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "development-only-change-me")
    jwt_expiry_hours: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    stripe_secret_key: str = os.getenv("STRIPE_SECRET_KEY", "")
    stripe_webhook_secret: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    stripe_pro_price_id: str = os.getenv("STRIPE_PRO_PRICE_ID", "")
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))


settings = Settings()


def validate_production_settings() -> None:
    if os.getenv("ENVIRONMENT", "development") == "production":
        required = {
            "DATABASE_URL": settings.database_url,
            "JWT_SECRET": settings.jwt_secret,
            "FRONTEND_ORIGIN": settings.frontend_origin,
            "STRIPE_SECRET_KEY": settings.stripe_secret_key,
            "STRIPE_WEBHOOK_SECRET": settings.stripe_webhook_secret,
            "STRIPE_PRO_PRICE_ID": settings.stripe_pro_price_id,
        }
        missing = [name for name, value in required.items() if not value or "development-only" in value]
        if missing:
            raise RuntimeError(f"Missing production configuration: {', '.join(missing)}")
        if not settings.database_url.startswith("postgresql"):
            raise RuntimeError("Production DATABASE_URL must use PostgreSQL.")
