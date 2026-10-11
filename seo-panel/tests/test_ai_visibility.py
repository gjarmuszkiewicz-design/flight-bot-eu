from types import SimpleNamespace

from app.models import Project
from app.monitoring.ai_visibility import ProviderAnswer, analyze_answer, compute_metrics, first_mention


def _project():
    return Project(name="x", url="https://usmiech.pl/", brand_name="Gabinet Uśmiech", brand_aliases="Uśmiech Dental",
                   competitors="Biały Ząb | bialyzab.pl\nDentysta Nowak | nowak.pl")


def test_first_mention_ignores_case_and_diacritics():
    assert first_mention("Polecam GABINET USMIECH w centrum", ["Gabinet Uśmiech"]) == 8
    assert first_mention("Nic tu nie ma", ["Gabinet Uśmiech"]) is None
    assert first_mention("łódź", ["Lodz"]) == 0


def test_analyze_answer_position_and_citation():
    ans = ProviderAnswer(
        text="1. Biały Ząb – świetne opinie.\n2. Gabinet Uśmiech – implanty.\n3. Ktoś inny.",
        citations=[{"url": "https://www.usmiech.pl/implanty", "title": "", "domain": "usmiech.pl"}],
        model="m",
    )
    r = analyze_answer(ans, _project())
    assert r["mentioned"] and r["cited"]
    assert r["position"] == 2
    assert [c["name"] for c in r["competitors_mentioned"]] == ["Biały Ząb"]


def test_compute_metrics():
    p = _project()
    prompt = SimpleNamespace(text="dentysta poznań")
    rows = [
        SimpleNamespace(error="", provider="claude", mentioned=True, cited=True, position=1, prompt_id=1, prompt=prompt,
                        competitors_mentioned=[{"name": "Biały Ząb", "mentioned": True}], citations=[{"domain": "usmiech.pl"}],
                        run_id="20261001080000"),
        SimpleNamespace(error="", provider="chatgpt", mentioned=False, cited=False, position=None, prompt_id=1, prompt=prompt,
                        competitors_mentioned=[{"name": "Biały Ząb", "mentioned": True}], citations=[{"domain": "znanylekarz.pl"}],
                        run_id="20261001080000"),
    ]
    m = compute_metrics(rows, p)
    assert m["overall"]["mention"] == 50
    assert m["overall"]["citation"] == 50
    assert m["by_provider"]["claude"]["mention"] == 100
    shares = {s["name"]: s["share"] for s in m["sov"]}
    assert shares == {"Biały Ząb": 67, "Gabinet Uśmiech": 33}
