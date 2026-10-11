"""Ustawienia aplikacji czytane ze zmiennych środowiskowych."""
import os
import secrets


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


class Settings:
    # Dostęp do panelu (tylko właściciel)
    admin_user: str = _env("ADMIN_USER", "admin")
    admin_password: str = _env("ADMIN_PASSWORD", "")
    secret_key: str = _env("SECRET_KEY") or secrets.token_hex(32)
    # Na produkcji (HTTPS) ustaw COOKIE_SECURE=1
    cookie_secure: bool = _env("COOKIE_SECURE", "0") == "1"

    # Baza danych: SQLite lokalnie, PostgreSQL na produkcji
    database_url: str = _env("DATABASE_URL", "sqlite:///./seo_panel.db")

    # Branding raportów PDF
    brand_name: str = _env("BRAND_NAME", "Twoja Agencja SEO/AEO")
    brand_email: str = _env("BRAND_EMAIL", "")
    brand_website: str = _env("BRAND_WEBSITE", "")
    brand_color: str = _env("BRAND_COLOR", "#2a78d6")

    # Klucze API (wszystkie opcjonalne – moduł bez klucza jest pomijany)
    anthropic_api_key: str = _env("ANTHROPIC_API_KEY")
    anthropic_model: str = _env("ANTHROPIC_MODEL", "claude-opus-5-5")
    openai_api_key: str = _env("OPENAI_API_KEY")
    openai_model: str = _env("OPENAI_MODEL", "gpt-5-mini")
    perplexity_api_key: str = _env("PERPLEXITY_API_KEY")
    perplexity_model: str = _env("PERPLEXITY_MODEL", "sonar")
    gemini_api_key: str = _env("GEMINI_API_KEY")
    gemini_model: str = _env("GEMINI_MODEL", "gemini-2.5-flash")
    pagespeed_api_key: str = _env("PAGESPEED_API_KEY")
    dataforseo_login: str = _env("DATAFORSEO_LOGIN")
    dataforseo_password: str = _env("DATAFORSEO_PASSWORD")
    serper_api_key: str = _env("SERPER_API_KEY")

    # Alerty
    telegram_bot_token: str = _env("TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str = _env("TELEGRAM_CHAT_ID")

    # Crawler
    crawler_user_agent: str = _env(
        "CRAWLER_USER_AGENT",
        "Mozilla/5.0 (compatible; SeoPanelBot/1.0; audyt SEO na zlecenie wlasciciela strony)",
    )
    crawler_concurrency: int = int(_env("CRAWLER_CONCURRENCY", "5"))

    # Harmonogram (można wyłączyć np. w testach)
    scheduler_enabled: bool = _env("SCHEDULER_ENABLED", "1") == "1"

    @property
    def ai_providers(self) -> dict[str, bool]:
        return {
            "chatgpt": bool(self.openai_api_key),
            "claude": bool(self.anthropic_api_key),
            "perplexity": bool(self.perplexity_api_key),
            "gemini": bool(self.gemini_api_key),
        }

    @property
    def serp_provider(self) -> str | None:
        if self.dataforseo_login and self.dataforseo_password:
            return "dataforseo"
        if self.serper_api_key:
            return "serper"
        return None


settings = Settings()
