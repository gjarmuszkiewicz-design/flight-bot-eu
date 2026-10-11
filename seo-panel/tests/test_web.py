import re

from app.db import session_scope
from app.models import Audit


def test_login_required():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        r = c.get("/", follow_redirects=False)
        assert r.status_code == 303 and r.headers["location"].startswith("/login")
        r = c.post("/login", data={"username": "admin", "password": "zle"}, follow_redirects=True)
        assert "Nieprawidłowy login" in r.text


def test_full_flow_with_pdf(client, site_url):
    r = client.post("/klienci", data={"name": "Gabinet Testowy"})
    assert r.status_code == 200
    cid = int(re.search(r"/klienci/(\d+)", str(r.url)).group(1))

    # Projekt bez automatycznego startu – audyt uruchamiamy synchronicznie
    r = client.post(f"/klienci/{cid}/projekty", data={"name": "Strona", "url": site_url, "max_pages": 50})
    pid = int(re.search(r"/projekty/(\d+)", str(r.url)).group(1))

    from app.audit.runner import run_audit

    with session_scope() as db:
        a = Audit(project_id=pid)
        db.add(a)
        db.flush()
        aid = a.id
    run_audit(aid)

    for path in ["", "/audyt", "/ai", "/pozycje", "/zmiany", "/ustawienia"]:
        r = client.get(f"/projekty/{pid}{path}")
        assert r.status_code == 200, path
    r = client.get(f"/projekty/{pid}/audyt")
    assert "Dostęp botów AI" in r.text and "PerplexityBot" in r.text

    r = client.post(f"/projekty/{pid}/ai/prompty", data={"prompts": "dentysta poznań\nimplanty poznań\ndentysta poznań"})
    assert "Dodano zapytania: 2" in r.text
    r = client.post(f"/projekty/{pid}/frazy", data={"phrases": "dentysta poznań, implanty"})
    assert "Dodano frazy: 2" in r.text

    r = client.get(f"/projekty/{pid}/raport?podglad=1")
    assert r.status_code == 200 and "Raport SEO" in r.text
    r = client.get(f"/projekty/{pid}/raport")
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF" and len(r.content) > 20_000

    r = client.get("/")
    assert "Gabinet Testowy" in r.text

    r = client.post(f"/projekty/{pid}/usun")
    assert r.status_code == 200
