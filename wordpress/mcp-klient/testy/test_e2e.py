"""Test całościowy wtyczki i klienta. Tworzy i zmienia treści, więc NIE uruchamiaj go na stronie produkcyjnej."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
# Uruchom TYLKO na stronie testowej: ZE_URL=... ZE_USER=... ZE_APP_PASSWORD=... python testy/test_e2e.py
os.environ.setdefault("NO_PROXY", "127.0.0.1")
import zdalny_edytor_mcp as z

def show(label, x): print(f"--- {label}\n{json.dumps(x, ensure_ascii=False, indent=1)[:1500]}")
ok = lambda c, m: print(("OK   " if c else "FAIL ") + m)

content = """<!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Witaj w sklepie</h1>
<!-- /wp:heading -->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:paragraph -->
<p>Pierwszy akapit. Telefon: 111 222 333</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Drugi akapit</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>Kolumna A</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column"><!-- wp:paragraph -->
<p>Kolumna B</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group"></div>
<!-- /wp:group -->"""

r = z.create_content(title="Test strona", content=content, status="publish", meta={"site-sidebar-layout": "no-sidebar"}); show("create", r)
pid = r["id"]
g = z.get_content(pid, format="outline"); show("outline", g["blocks"])
ok(g["meta"]["site-sidebar-layout"] == "no-sidebar", "meta Astry zapisane")
ok([b["name"] for b in g["blocks"]] == ["core/heading","core/group","core/columns","core/group"], "struktura bloków")

P = lambda t: f"<!-- wp:paragraph -->\n<p>{t}</p>\n<!-- /wp:paragraph -->"
ops = [
  {"op":"set_html","path":"1.1","html":"<p>Drugi akapit ZMIENIONY</p>"},
  {"op":"insert","path":"1.0","position":"after","markup":P("Wstawiony między")},
  {"op":"insert","path":"3","position":"end","markup":P("W pustej grupie")},
  {"op":"remove","path":"2.1"},
  {"op":"update_attrs","path":"1","attrs":{"align":"wide"}},
  {"op":"replace","path":"0","markup":"<!-- wp:heading {\"level\":2} -->\n<h2 class=\"wp-block-heading\">Nowy nagłówek</h2>\n<!-- /wp:heading -->"},
  {"op":"replace_text","find":"111 222 333","replace":"999 888 777"},
  {"op":"move","path":"3","to":"0","position":"after"},
  {"op":"insert","position":"end","markup":P("Na końcu strony")},
]
d = z.block_operations(pid, ops, dry_run=True); ok(d["dry_run"] and "Nowy nagłówek" in d["content"], "dry_run")
ok("Drugi akapit</p>" in z.get_content(pid, format="raw")["content"], "dry_run nic nie zapisał")
r = z.block_operations(pid, ops, reason="test"); show("ops report", r["report"])
c = z.get_content(pid, format="raw")["content"]; print(c)
for frag in ["ZMIENIONY","Wstawiony między","W pustej grupie","Nowy nagłówek","999 888 777","Na końcu strony"]:
    ok(frag in c, "zawiera: "+frag)
ok("Kolumna B" not in c, "usunięta kolumna B")
ok('"align":"wide"' in c, "atrybut align")
# poprawność: ponowne sparsowanie i porównanie serializacji
o = z.get_content(pid, format="outline")["blocks"]
ok([b["name"] for b in o] == ["core/heading","core/group","core/group","core/columns","core/paragraph"], "kolejność po move: "+str([b["name"] for b in o]))
ok(len(o[2]["inner"]) == 3, "grupa ma 3 akapity")

# błędy
try: z.block_operations(pid, [{"op":"remove","path":"9.9"}]); ok(False,"zła ścieżka")
except z.WordPressError as e: ok("9" in str(e), "błąd ścieżki: "+str(e))

# migawki i przywracanie
snaps = z.list_snapshots(type="post", object=str(pid)); ok(len(snaps) >= 1, f"migawki: {len(snaps)}")
rr = z.restore_snapshot(snaps[0]["id"]); ok("Drugi akapit</p>" in z.get_content(pid, format="raw")["content"], "przywrócono treść")
z.restore_snapshot(rr["snapshot_before"]); ok("Nowy nagłówek" in z.get_content(pid, format="raw")["content"], "cofnięto przywrócenie")

# search-replace
sr = z.search_replace("Kolumna A", "Kolumna X"); ok(sr["dry_run"] and sr["posts_changed"]==1, "search dry run")
sr = z.search_replace("Kolumna A", "Kolumna X", dry_run=False); ok("Kolumna X" in z.get_content(pid, format="raw")["content"], "search replace zapisany")
sr = z.search_replace("/Kolumna (X)/u", "Kol. $1", regex=True, dry_run=False); ok("Kol. X" in z.get_content(pid, format="raw")["content"], "regex")

# astra / opcje / css / theme mods
z.update_astra_settings({"theme-color":"#ff0000","site-content-width":1100})
a = z.get_astra_settings(search="theme-color"); ok(a["settings"].get("theme-color")=="#ff0000", "astra settings")
z.update_astra_settings({"theme-color":None}); ok("theme-color" not in z.get_astra_settings()["settings"], "astra usunięcie klucza")
z.update_options({"blogname":"Mój Sklep"}); ok(z.get_options(["blogname"])["options"]["blogname"]=="Mój Sklep","opcja")
try: z.update_options({"siteurl":"http://x"}); ok(False,"ochrona")
except z.WordPressError as e: ok("siteurl" in str(e), "ochrona siteurl")
z.update_custom_css(".a{color:red}", mode="replace"); z.update_custom_css(".b{color:blue}")
css = z.get_custom_css()["css"]; ok(".a" in css and ".b" in css, "css append")
s = z.list_snapshots(type="custom_css")[0]; z.restore_snapshot(s["id"]); ok(z.get_custom_css()["css"].strip()==".a{color:red}", "css restore")
z.update_theme_mods({"moj_mod": 5}); ok(z.get_theme_mods()["mods"]["moj_mod"]==5, "theme mods")

# duplikat, aktualizacja, kosz
dup = z.duplicate_content(pid); ok(z.get_content(dup["id"])["meta"]["site-sidebar-layout"]=="no-sidebar", "duplikat z meta")
z.update_content(dup["id"], title="Kopia nowa", meta={"site-sidebar-layout": None}, template="page-wide")
dc = z.get_content(dup["id"], format="raw"); ok(dc["title"]=="Kopia nowa" and "site-sidebar-layout" not in dc["meta"] and dc["template"]=="page-wide", "update + meta null + template")
ok(z.trash_content(dup["id"])["status"]=="trash", "kosz")
ok(len(z.list_content(search="Test")["items"])>=1, "lista treści")

# menu
m = z.rest_request("POST", "/wp/v2/menus", body={"name":"Test menu " + str(pid)})
it = z.save_menu_item(m["id"], "Test", object_type="page", object_id=pid)
z.save_menu_item(m["id"], "Google", url="https://google.com", parent=it["id"])
mm = z.get_menus(); ok(any(len(x["items"])==2 for x in mm["menus"] if x["id"]==m["id"]), "menu")
ok(z.flush_cache()["flushed"][0]=="object_cache", "cache")
print("info astra:", z.get_site_info()["theme"]["is_astra"])
