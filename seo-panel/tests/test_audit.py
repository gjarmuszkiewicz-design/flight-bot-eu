import asyncio

from app.audit.crawler import crawl, normalize_url
from app.audit.runner import run_audit
from app.db import session_scope
from app.models import Audit, Client, Project


def test_normalize_url():
    assert normalize_url("HTTPS://Example.COM/a#x") == "https://example.com/a"
    assert normalize_url("https://example.com") == "https://example.com/"
    assert normalize_url("mailto:a@b.pl") == ""


def test_crawl_finds_pages_and_orphans(site_url):
    result = asyncio.run(crawl(site_url, max_pages=50))
    urls = set(result.pages)
    assert site_url in urls
    assert site_url + "oferta/implanty.html" in urls
    assert result.pages[site_url + "nie-istnieje.html"].status == 404
    orphan = result.pages[site_url + "sierota.html"]
    assert orphan.from_sitemap_only and orphan.inlinks == 0
    assert result.sitemap_sources


def _make_project(url: str) -> int:
    with session_scope() as db:
        c = Client(name="Gabinet Uśmiech")
        db.add(c)
        db.flush()
        p = Project(client_id=c.id, name="Strona", url=url, brand_name="Gabinet Uśmiech",
                    competitors="Biały Ząb | bialyzab.pl")
        db.add(p)
        db.flush()
        return p.id


def test_full_audit(site_url):
    pid = _make_project(site_url)
    with session_scope() as db:
        a = Audit(project_id=pid)
        db.add(a)
        db.flush()
        aid = a.id
    run_audit(aid)
    with session_scope() as db:
        a = db.get(Audit, aid)
        assert a.status == "done", a.error
        codes = {i.code for i in a.issues}
        # Technika i on-page
        assert {"status_4xx", "broken_internal_links", "orphan_pages", "noindex", "no_meta_desc", "no_h1",
                "img_no_alt", "dup_title", "no_viewport"} <= codes
        # AEO
        assert "ai_search_bots_blocked" in codes  # PerplexityBot zablokowany w robots.txt
        assert "ai_bots_firewall" in codes  # ClaudeBot dostaje 403 od serwera
        assert "no_llms_txt" in codes and "jsonld_errors" in codes and "article_no_author" in codes
        # Wydajność z (podmienionego) PageSpeed
        assert "lcp" in codes
        assert 0 <= a.score_total <= 100
        bots = {b["token"]: b for b in a.data["aeo"]["bots"]}
        assert bots["GPTBot"]["robots_allowed"] is False
        assert bots["OAI-SearchBot"]["robots_allowed"] is True
        assert bots["ClaudeBot"]["live_ok"] is False
