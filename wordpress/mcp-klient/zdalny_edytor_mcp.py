"""Serwer MCP do zdalnej edycji stron WordPress z wtyczką „Zdalny Edytor Strony”.

Dzięki niemu Claude (Claude Code, Claude Desktop) może czytać i zmieniać treść
stron, bloki Gutenberga, ustawienia Astry, CSS, menu i WooCommerce.

Konfiguracja stron: plik JSON wskazany w ZE_SITES (domyślnie
~/.config/zdalny-edytor/sites.json) albo zmienne ZE_URL, ZE_USER, ZE_APP_PASSWORD.
Szczegóły w README.md.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

try:  # mcp >= 2
    from mcp.server.mcpserver import MCPServer as _Server
except ImportError:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP as _Server

NAMESPACE = "zdalny-edytor/v1"
TIMEOUT = float(os.environ.get("ZE_TIMEOUT", "60"))


# ---------------------------------------------------------------------------
# Konfiguracja i komunikacja z WordPressem
# ---------------------------------------------------------------------------


def load_sites() -> dict[str, dict[str, str]]:
    sites: dict[str, dict[str, str]] = {}
    path = Path(os.environ.get("ZE_SITES", "~/.config/zdalny-edytor/sites.json")).expanduser()
    if path.is_file():
        sites.update(json.loads(path.read_text(encoding="utf-8")))
    if os.environ.get("ZE_URL"):
        sites[os.environ.get("ZE_SITE_NAME", "domyslna")] = {
            "url": os.environ["ZE_URL"],
            "user": os.environ.get("ZE_USER", ""),
            "app_password": os.environ.get("ZE_APP_PASSWORD", ""),
        }
    return sites


class WordPressError(Exception):
    pass


class Site:
    def __init__(self, name: str, url: str, user: str, app_password: str, verify: bool = True):
        self.name = name
        self.url = url.rstrip("/")
        self.client = httpx.Client(
            auth=(user, app_password.replace(" ", "")),
            timeout=TIMEOUT,
            verify=verify,
            headers={"User-Agent": "zdalny-edytor-mcp/0.1"},
            follow_redirects=True,
        )

    def request(self, method: str, route: str, query: dict | None = None, body: Any = None) -> Any:
        """route np. "/zdalny-edytor/v1/info" albo "/wp/v2/pages".

        Używamy ?rest_route=, bo działa także bez „ładnych” bezpośrednich odnośników.
        """
        params: dict[str, Any] = {"rest_route": "/" + route.lstrip("/")}
        for key, value in (query or {}).items():
            if value is None:
                continue
            if isinstance(value, bool):
                value = "true" if value else "false"
            if isinstance(value, (list, tuple)):
                params[f"{key}[]"] = list(value)
            else:
                params[key] = value
        response = self.client.request(method.upper(), self.url + "/", params=params, json=body)
        try:
            data = response.json()
        except ValueError:
            data = response.text
        if response.status_code >= 400:
            if isinstance(data, dict) and "message" in data:
                raise WordPressError(f"[{self.name}] HTTP {response.status_code} {data.get('code', '')}: {data['message']}")
            raise WordPressError(f"[{self.name}] HTTP {response.status_code}: {str(data)[:500]}")
        return data

    def ze(self, method: str, path: str, query: dict | None = None, body: Any = None) -> Any:
        return self.request(method, f"/{NAMESPACE}/{path.lstrip('/')}", query, body)


_sites: dict[str, Site] = {}


def site(name: str | None = None) -> Site:
    config = load_sites()
    if not config:
        raise WordPressError(
            "Brak skonfigurowanych stron. Utwórz ~/.config/zdalny-edytor/sites.json albo ustaw ZE_URL, ZE_USER, ZE_APP_PASSWORD."
        )
    if not name:
        name = os.environ.get("ZE_DEFAULT_SITE") or ("domyslna" if "domyslna" in config else None)
        if not name:
            if len(config) > 1:
                raise WordPressError("Masz kilka stron, podaj parametr site. Dostępne: " + ", ".join(config))
            name = next(iter(config))
    if name not in config:
        raise WordPressError(f"Nieznana strona '{name}'. Dostępne: " + ", ".join(config))
    if name not in _sites:
        c = config[name]
        _sites[name] = Site(name, c["url"], c["user"], c["app_password"], c.get("verify_ssl", True))
    return _sites[name]


def compact(**kwargs: Any) -> dict[str, Any]:
    return {k: v for k, v in kwargs.items() if v is not None}


# ---------------------------------------------------------------------------
# Serwer MCP
# ---------------------------------------------------------------------------

mcp = _Server(
    "zdalny-edytor",
    instructions=(
        "Narzędzia do edycji stron WordPress (Gutenberg, Astra, WooCommerce). "
        "Zasady: najpierw get_site_info i get_content, żeby poznać strukturę. "
        "Do zmian w treści stron preferuj block_operations (precyzyjne zmiany bloków) zamiast nadpisywania całej treści. "
        "Przy dużych zmianach użyj najpierw dry_run=true. Każda zmiana tworzy migawkę, którą można przywrócić przez restore_snapshot. "
        "Bloki statyczne (np. core/heading, core/paragraph, core/button) mają atrybuty i HTML, które muszą być zgodne; "
        "przy zmianie wyglądu takiego bloku użyj operacji replace z pełnym kodem bloku."
    ),
)


@mcp.tool()
def list_sites() -> dict:
    """Lista skonfigurowanych stron WordPress (bez haseł)."""
    return {name: c["url"] for name, c in load_sites().items()}


@mcp.tool()
def get_site_info(site_name: str | None = None) -> dict:
    """Informacje o stronie: wersje, motyw (czy Astra), wtyczki, WooCommerce, menu, liczby treści, szablony stron."""
    return site(site_name).ze("GET", "info")


# --- Treści ---------------------------------------------------------------


@mcp.tool()
def list_content(
    type: list[str] | None = None,
    search: str | None = None,
    status: list[str] | None = None,
    per_page: int = 50,
    page: int = 1,
    site_name: str | None = None,
) -> dict:
    """Lista treści. type: np. ["page"], ["post"], ["product"], ["wp_block"] (wzorce). Domyślnie strony i wpisy."""
    return site(site_name).ze("GET", "content", compact(type=type, search=search, status=status, per_page=per_page, page=page))


@mcp.tool()
def get_content(id: int, format: str = "full", site_name: str | None = None) -> dict:
    """Pobiera stronę/wpis/produkt: pola, meta (w tym ustawienia Astry dla strony) i drzewo bloków ze ścieżkami.

    format: "full" (kod treści + bloki z HTML), "outline" (tylko drzewo bloków z podglądem tekstu,
    najlepsze na start przy dużych stronach), "raw" (tylko kod treści).
    """
    return site(site_name).ze("GET", f"posts/{id}", {"format": format})


@mcp.tool()
def create_content(
    title: str,
    content: str = "",
    type: str = "page",
    status: str = "draft",
    slug: str | None = None,
    excerpt: str | None = None,
    parent: int | None = None,
    template: str | None = None,
    meta: dict | None = None,
    categories: list[int] | None = None,
    tags: list[int] | None = None,
    site_name: str | None = None,
) -> dict:
    """Tworzy stronę/wpis (domyślnie szkic). content to kod bloków Gutenberga (<!-- wp:... -->).
    meta pozwala od razu ustawić np. układ Astry: {"ast-site-content-layout": "full-width-container", "site-sidebar-layout": "no-sidebar"}."""
    body = compact(
        title=title, content=content, type=type, status=status, slug=slug, excerpt=excerpt,
        parent=parent, template=template, meta=meta, categories=categories, tags=tags,
    )
    return site(site_name).ze("POST", "posts", body=body)


@mcp.tool()
def update_content(
    id: int,
    title: str | None = None,
    content: str | None = None,
    status: str | None = None,
    slug: str | None = None,
    excerpt: str | None = None,
    parent: int | None = None,
    menu_order: int | None = None,
    template: str | None = None,
    featured_media: int | None = None,
    meta: dict | None = None,
    categories: list[int] | None = None,
    tags: list[int] | None = None,
    reason: str | None = None,
    site_name: str | None = None,
) -> dict:
    """Zmienia pola wpisu/strony. Podaj tylko to, co zmieniasz. content nadpisuje CAŁĄ treść
    (do drobnych zmian lepsze block_operations). meta: wartość null usuwa klucz. Tworzy migawkę."""
    body = compact(
        title=title, content=content, status=status, slug=slug, excerpt=excerpt, parent=parent,
        menu_order=menu_order, template=template, featured_media=featured_media, meta=meta,
        categories=categories, tags=tags, reason=reason,
    )
    return site(site_name).ze("POST", f"posts/{id}", body=body)


@mcp.tool()
def trash_content(id: int, site_name: str | None = None) -> dict:
    """Przenosi wpis/stronę do kosza (da się przywrócić z kosza w panelu)."""
    return site(site_name).ze("DELETE", f"posts/{id}")


@mcp.tool()
def duplicate_content(id: int, title: str | None = None, site_name: str | None = None) -> dict:
    """Duplikuje stronę/wpis wraz z meta (np. ustawieniami Astry) jako szkic. Przydatne przed przebudową."""
    return site(site_name).ze("POST", f"posts/{id}/duplicate", body=compact(title=title))


@mcp.tool()
def block_operations(
    id: int,
    ops: list[dict],
    dry_run: bool = False,
    reason: str | None = None,
    site_name: str | None = None,
) -> dict:
    """Precyzyjne zmiany bloków Gutenberga. Bloki wskazuje się ścieżką z get_content, np. "3" albo "3.0.1".
    Operacje wykonują się po kolei; każda widzi efekt poprzednich (ścieżki mogą się przesunąć!).

    Dostępne operacje (elementy listy ops):
    - {"op": "replace", "path": "2", "markup": "<!-- wp:heading -->...<!-- /wp:heading -->"}  zastępuje blok jednym lub kilkoma
    - {"op": "insert", "path": "2", "position": "after", "markup": "..."}  position: before|after (obok), start|end (do środka bloku);
      bez path: start|end całej strony
    - {"op": "remove", "path": "4"}
    - {"op": "move", "path": "4", "to": "1", "position": "before"}  "to" liczone po wyjęciu bloku
    - {"op": "set_html", "path": "2.1", "html": "<p>Nowy tekst</p>"}  tylko bloki bez bloków wewnętrznych
    - {"op": "update_attrs", "path": "0", "attrs": {"align": "full"}}  null usuwa atrybut; "replace": true nadpisuje wszystkie
    - {"op": "replace_text", "path": "3", "find": "stary", "replace": "nowy"}  bez path: cała strona

    dry_run=true zwraca wynik bez zapisu."""
    return site(site_name).ze("POST", f"posts/{id}/blocks", body=compact(ops=ops, dry_run=dry_run, reason=reason))


@mcp.tool()
def search_replace(
    find: str,
    replace: str,
    types: list[str] | None = None,
    fields: list[str] | None = None,
    regex: bool = False,
    dry_run: bool = True,
    site_name: str | None = None,
) -> dict:
    """Wyszukaj i zamień w wielu treściach naraz (domyślnie strony i wpisy; pola: post_content, post_title, post_excerpt).
    Domyślnie dry_run=true (tylko podgląd). regex wymaga ograniczników, np. "/telefon: \\d+/u". Każdy zmieniony wpis dostaje migawkę."""
    body = compact(find=find, replace=replace, types=types, fields=fields, regex=regex, dry_run=dry_run)
    return site(site_name).ze("POST", "search-replace", body=body)


# --- Astra, motyw, CSS, opcje ----------------------------------------------


@mcp.tool()
def get_astra_settings(search: str | None = None, keys: list[str] | None = None, site_name: str | None = None) -> dict:
    """Globalne ustawienia Astry (opcja astra-settings: kolory, typografia, nagłówek, stopka, układy...).
    search filtruje po fragmencie nazwy klucza (np. "header", "color", "font", "footer", "button")."""
    return site(site_name).ze("GET", "astra/settings", compact(search=search, keys=keys))


@mcp.tool()
def update_astra_settings(settings: dict, reason: str | None = None, site_name: str | None = None) -> dict:
    """Zmienia wybrane klucze globalnych ustawień Astry (scalanie; null usuwa klucz). Tworzy migawkę.
    Najpierw odczytaj obecne wartości przez get_astra_settings, żeby zachować ich format (np. tablice responsywne desktop/tablet/mobile)."""
    return site(site_name).ze("POST", "astra/settings", body=compact(settings=settings, reason=reason))


@mcp.tool()
def get_theme_mods(site_name: str | None = None) -> dict:
    """Ustawienia motywu z Customizera (theme mods): logo, menu w lokalizacjach, kolory itp."""
    return site(site_name).ze("GET", "theme-mods")


@mcp.tool()
def update_theme_mods(mods: dict, reason: str | None = None, site_name: str | None = None) -> dict:
    """Zmienia theme mods (null usuwa). Np. {"custom_logo": 123}, {"nav_menu_locations": {"primary": 5}}. Tworzy migawkę."""
    return site(site_name).ze("POST", "theme-mods", body=compact(mods=mods, reason=reason))


@mcp.tool()
def get_custom_css(site_name: str | None = None) -> dict:
    """Dodatkowy CSS (Wygląd → Dostosuj → Dodatkowy CSS)."""
    return site(site_name).ze("GET", "css")


@mcp.tool()
def update_custom_css(css: str, mode: str = "append", reason: str | None = None, site_name: str | None = None) -> dict:
    """Zmienia dodatkowy CSS. mode: "append" (dopisuje na końcu) albo "replace" (nadpisuje całość). Tworzy migawkę."""
    return site(site_name).ze("POST", "css", body=compact(css=css, mode=mode, reason=reason))


@mcp.tool()
def get_options(names: list[str], site_name: str | None = None) -> dict:
    """Odczyt opcji WordPressa, np. ["blogname", "blogdescription", "show_on_front", "page_on_front", "woocommerce_currency"]."""
    return site(site_name).ze("GET", "options", {"names": ",".join(names)})


@mcp.tool()
def update_options(options: dict, reason: str | None = None, site_name: str | None = None) -> dict:
    """Zmiana opcji (null usuwa). Np. strona główna: {"show_on_front": "page", "page_on_front": 12}.
    Opcje krytyczne (siteurl, home, active_plugins, motyw, admin_email, role) są zablokowane. Tworzy migawki."""
    return site(site_name).ze("POST", "options", body=compact(options=options, reason=reason))


# --- Media i menu ------------------------------------------------------------


@mcp.tool()
def upload_media_from_url(
    url: str,
    title: str | None = None,
    alt: str | None = None,
    post_id: int | None = None,
    set_featured: bool = False,
    filename: str | None = None,
    site_name: str | None = None,
) -> dict:
    """Pobiera plik z publicznego URL do biblioteki mediów. set_featured=true ustawia go jako obrazek wyróżniający post_id."""
    body = compact(url=url, title=title, alt=alt, post_id=post_id, set_featured=set_featured, filename=filename)
    return site(site_name).ze("POST", "media/sideload", body=body)


@mcp.tool()
def get_menus(site_name: str | None = None) -> dict:
    """Menu nawigacyjne z pozycjami oraz przypisanie do lokalizacji motywu."""
    s = site(site_name)
    menus = s.request("GET", "/wp/v2/menus", {"per_page": 100, "context": "edit"})
    result = []
    for menu in menus:
        items = s.request("GET", "/wp/v2/menu-items", {"menus": menu["id"], "per_page": 100, "context": "edit"})
        result.append(
            {
                "id": menu["id"],
                "name": menu["name"],
                "locations": menu.get("locations", []),
                "items": [
                    {
                        "id": i["id"],
                        "title": i["title"].get("raw") if isinstance(i["title"], dict) else i["title"],
                        "url": i.get("url"),
                        "type": i.get("type"),
                        "object": i.get("object"),
                        "object_id": i.get("object_id"),
                        "parent": i.get("parent"),
                        "menu_order": i.get("menu_order"),
                    }
                    for i in items
                ],
            }
        )
    return {"menus": result, "locations": s.request("GET", "/wp/v2/menu-locations")}


@mcp.tool()
def save_menu_item(
    menu_id: int,
    title: str,
    item_id: int | None = None,
    url: str | None = None,
    object_type: str | None = None,
    object_id: int | None = None,
    parent: int | None = None,
    menu_order: int | None = None,
    site_name: str | None = None,
) -> dict:
    """Dodaje (bez item_id) albo zmienia pozycję menu. Link do strony: object_type="page", object_id=ID;
    własny link: url="https://...". parent = ID pozycji nadrzędnej (podmenu)."""
    body: dict[str, Any] = compact(title=title, menus=menu_id, parent=parent, menu_order=menu_order, status="publish")
    if object_id:
        body.update(type="post_type", object=object_type or "page", object_id=object_id)
    elif url:
        body.update(type="custom", url=url)
    route = f"/wp/v2/menu-items/{item_id}" if item_id else "/wp/v2/menu-items"
    item = site(site_name).request("POST", route, body=body)
    return {"id": item["id"], "menu": menu_id}


@mcp.tool()
def delete_menu_item(item_id: int, site_name: str | None = None) -> dict:
    """Usuwa pozycję menu."""
    site(site_name).request("DELETE", f"/wp/v2/menu-items/{item_id}", {"force": True})
    return {"deleted": item_id}


# --- WooCommerce ------------------------------------------------------------


def _product_summary(p: dict) -> dict:
    return {
        "id": p["id"],
        "name": p["name"],
        "type": p.get("type"),
        "status": p.get("status"),
        "sku": p.get("sku"),
        "price": p.get("price"),
        "regular_price": p.get("regular_price"),
        "sale_price": p.get("sale_price"),
        "stock_status": p.get("stock_status"),
        "stock_quantity": p.get("stock_quantity"),
        "categories": [c["name"] for c in p.get("categories", [])],
        "permalink": p.get("permalink"),
    }


@mcp.tool()
def woo_list_products(
    search: str | None = None,
    category: int | None = None,
    status: str | None = None,
    sku: str | None = None,
    stock_status: str | None = None,
    per_page: int = 50,
    page: int = 1,
    site_name: str | None = None,
) -> list:
    """Lista produktów WooCommerce (skrócone dane). Pełne dane: woo_get_product."""
    products = site(site_name).request(
        "GET",
        "/wc/v3/products",
        compact(search=search, category=category, status=status, sku=sku, stock_status=stock_status, per_page=per_page, page=page),
    )
    return [_product_summary(p) for p in products]


@mcp.tool()
def woo_get_product(id: int, site_name: str | None = None) -> dict:
    """Pełne dane produktu WooCommerce (opis, ceny, stany, atrybuty, zdjęcia, meta)."""
    return site(site_name).request("GET", f"/wc/v3/products/{id}")


@mcp.tool()
def woo_save_product(data: dict, id: int | None = None, site_name: str | None = None) -> dict:
    """Tworzy (bez id) albo zmienia produkt. Pola jak w WooCommerce REST API, np.
    {"regular_price": "129.00", "sale_price": "99.00", "stock_quantity": 5, "manage_stock": true, "description": "...", "status": "publish"}.
    Przed zmianą istniejącego produktu tworzona jest migawka (z meta: ceny, stany)."""
    s = site(site_name)
    if id:
        snap = s.ze("POST", "snapshots", body={"type": "post", "object": id, "reason": "WooCommerce: zmiana produktu"})
        product = s.request("PUT", f"/wc/v3/products/{id}", body=data)
        return {"product": _product_summary(product), "snapshot": snap.get("snapshot")}
    return {"product": _product_summary(s.request("POST", "/wc/v3/products", body=data))}


@mcp.tool()
def woo_batch_update_products(updates: list[dict], site_name: str | None = None) -> dict:
    """Zbiorcza zmiana wielu produktów: [{"id": 12, "regular_price": "50"}, {"id": 13, "stock_status": "outofstock"}].
    Każdy produkt dostaje migawkę przed zmianą."""
    s = site(site_name)
    snapshots = {}
    for u in updates:
        snapshots[u["id"]] = s.ze("POST", "snapshots", body={"type": "post", "object": u["id"], "reason": "WooCommerce: zmiana zbiorcza"}).get(
            "snapshot"
        )
    result = s.request("POST", "/wc/v3/products/batch", body={"update": updates})
    return {"updated": [_product_summary(p) for p in result.get("update", [])], "snapshots": snapshots}


@mcp.tool()
def woo_list_orders(
    status: str | None = None,
    search: str | None = None,
    after: str | None = None,
    per_page: int = 20,
    page: int = 1,
    site_name: str | None = None,
) -> list:
    """Lista zamówień. status np. processing, on-hold, completed; after w formacie ISO 8601 (2026-01-01T00:00:00)."""
    orders = site(site_name).request(
        "GET", "/wc/v3/orders", compact(status=status, search=search, after=after, per_page=per_page, page=page)
    )
    return [
        {
            "id": o["id"],
            "number": o.get("number"),
            "status": o["status"],
            "date": o.get("date_created"),
            "total": o.get("total"),
            "currency": o.get("currency"),
            "customer": f"{o['billing'].get('first_name', '')} {o['billing'].get('last_name', '')}".strip(),
            "email": o["billing"].get("email"),
            "items": [f"{i['quantity']}× {i['name']}" for i in o.get("line_items", [])],
        }
        for o in orders
    ]


@mcp.tool()
def woo_update_order(id: int, data: dict, site_name: str | None = None) -> dict:
    """Zmienia zamówienie, np. {"status": "completed"}. Notatkę dodaje się przez rest_request POST /wc/v3/orders/{id}/notes."""
    o = site(site_name).request("PUT", f"/wc/v3/orders/{id}", body=data)
    return {"id": o["id"], "status": o["status"]}


# --- Migawki, cache, dowolne zapytanie --------------------------------------------


@mcp.tool()
def list_snapshots(
    type: str | None = None, object: str | None = None, per_page: int = 20, page: int = 1, site_name: str | None = None
) -> list:
    """Historia zmian (migawki). type: post|option|custom_css; object: ID wpisu albo nazwa opcji."""
    return site(site_name).ze("GET", "snapshots", compact(type=type, object=object, per_page=per_page, page=page))


@mcp.tool()
def get_snapshot(id: int, site_name: str | None = None) -> dict:
    """Pełna zawartość migawki (np. poprzednia treść strony)."""
    return site(site_name).ze("GET", f"snapshots/{id}")


@mcp.tool()
def create_snapshot(type: str, object: str | None = None, reason: str | None = None, site_name: str | None = None) -> dict:
    """Ręczna migawka przed ryzykowną zmianą. type: post (object = ID, zapisuje też wszystkie meta), option (object = nazwa), custom_css."""
    return site(site_name).ze("POST", "snapshots", body=compact(type=type, object=object, reason=reason))


@mcp.tool()
def restore_snapshot(id: int, site_name: str | None = None) -> dict:
    """Przywraca stan z migawki (cofnięcie zmiany). Bieżący stan jest wcześniej zapisywany, więc to też da się cofnąć."""
    return site(site_name).ze("POST", f"snapshots/{id}/restore")


@mcp.tool()
def flush_cache(site_name: str | None = None) -> dict:
    """Czyści pamięć podręczną WordPressa i popularnych wtyczek cache (LiteSpeed, WP Rocket, W3TC, WP Super Cache, SG Optimizer...)."""
    return site(site_name).ze("POST", "cache/flush")


@mcp.tool()
def rest_request(
    method: str, route: str, query: dict | None = None, body: dict | list | None = None, site_name: str | None = None
) -> Any:
    """Dowolne zapytanie do REST API strony, gdy brakuje dedykowanego narzędzia.
    route np. "/wp/v2/categories", "/wp/v2/users/me", "/wc/v3/coupons", "/wc/v3/products/categories", "/wp/v2/blocks" (wzorce)."""
    return site(site_name).request(method, route, query, body)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
