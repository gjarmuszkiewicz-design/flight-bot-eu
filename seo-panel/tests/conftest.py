import os
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/test.db")
os.environ.setdefault("ADMIN_PASSWORD", "test-haslo")
os.environ.setdefault("SCHEDULER_ENABLED", "0")
for key in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "PERPLEXITY_API_KEY", "GEMINI_API_KEY",
            "DATAFORSEO_LOGIN", "SERPER_API_KEY", "TELEGRAM_BOT_TOKEN"):
    os.environ.pop(key, None)

SITE = Path(__file__).parent / "site"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        host = self.headers.get("Host")
        if self.path == "/sitemap.xml":
            urls = ["/", "/oferta/implanty.html", "/sierota.html", "/kontakt.html"]
            body = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            body += "".join(f"<url><loc>http://{host}{u}</loc></url>" for u in urls) + "</urlset>"
            return self._send(200, body.encode(), "application/xml")
        if self.path == "/stara-oferta.html":
            self.send_response(301)
            self.send_header("Location", "/oferta/implanty.html")
            self.end_headers()
            return
        # Symulacja zapory blokującej ClaudeBot
        if "ClaudeBot" in self.headers.get("User-Agent", ""):
            return self._send(403, b"Forbidden", "text/plain")
        return super().do_GET()

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


@pytest.fixture(scope="session", autouse=True)
def database():
    from app.db import init_db

    init_db()


@pytest.fixture(scope="session")
def site_url():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(SITE)))
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{server.server_address[1]}/"
    server.shutdown()


@pytest.fixture(autouse=True)
def no_pagespeed(monkeypatch):
    async def fake(url):
        return {"score": 72, "lcp_ms": 3100, "cls": 0.02, "inp_ms": 150, "fcp_ms": 1200, "tbt_ms": 210, "field_data": True}

    monkeypatch.setattr("app.audit.runner.pagespeed", fake)


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        c.post("/login", data={"username": "admin", "password": "test-haslo"})
        yield c
