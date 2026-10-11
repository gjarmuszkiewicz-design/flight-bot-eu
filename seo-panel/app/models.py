from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _now() -> datetime:
    return datetime.utcnow()


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str] = mapped_column(String(200), default="")
    contact_email: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    projects: Mapped[list["Project"]] = relationship(
        back_populates="client", cascade="all, delete-orphan", order_by="Project.name"
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    name: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(500))
    brand_name: Mapped[str] = mapped_column(String(200), default="")
    brand_aliases: Mapped[str] = mapped_column(Text, default="")  # po przecinku
    competitors: Mapped[str] = mapped_column(Text, default="")  # jeden na linię: Nazwa | domena.pl
    max_pages: Mapped[int] = mapped_column(Integer, default=200)
    country: Mapped[str] = mapped_column(String(5), default="pl")
    language: Mapped[str] = mapped_column(String(5), default="pl")
    monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_samples: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    client: Mapped[Client] = relationship(back_populates="projects")
    audits: Mapped[list["Audit"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Audit.id.desc()"
    )
    prompts: Mapped[list["AIPrompt"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="AIPrompt.id"
    )
    keywords: Mapped[list["Keyword"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Keyword.id"
    )
    changes: Mapped[list["ChangeEvent"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ChangeEvent.id.desc()"
    )

    @property
    def domain(self) -> str:
        from urllib.parse import urlparse

        host = urlparse(self.url).hostname or self.url
        return host.removeprefix("www.")

    @property
    def brand_terms(self) -> list[str]:
        terms = [self.brand_name] + self.brand_aliases.split(",")
        return [t.strip() for t in terms if t and t.strip()]

    @property
    def competitor_list(self) -> list[dict]:
        out = []
        for line in self.competitors.splitlines():
            if not line.strip():
                continue
            name, _, domain = line.partition("|")
            out.append({"name": name.strip(), "domain": domain.strip().removeprefix("www.")})
        return out

    @property
    def last_audit(self) -> "Audit | None":
        done = [a for a in self.audits if a.status == "done"]
        return done[0] if done else None


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued/running/done/error
    progress: Mapped[str] = mapped_column(String(200), default="W kolejce")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0)
    score_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_technical: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_onpage: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_performance: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_aeo: Mapped[float | None] = mapped_column(Float, nullable=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)  # robots, sitemap, boty AI, CWV itd.
    ai_review: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    project: Mapped[Project] = relationship(back_populates="audits")
    pages: Mapped[list["Page"]] = relationship(back_populates="audit", cascade="all, delete-orphan")
    issues: Mapped[list["Issue"]] = relationship(back_populates="audit", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(primary_key=True)
    audit_id: Mapped[int] = mapped_column(ForeignKey("audits.id"), index=True)
    url: Mapped[str] = mapped_column(String(1000))
    status_code: Mapped[int] = mapped_column(Integer, default=0)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(Text, default="")
    meta_description: Mapped[str] = mapped_column(Text, default="")
    h1: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    response_ms: Mapped[int] = mapped_column(Integer, default=0)
    size_kb: Mapped[int] = mapped_column(Integer, default=0)
    inlinks: Mapped[int] = mapped_column(Integer, default=0)
    indexable: Mapped[bool] = mapped_column(Boolean, default=True)
    schema_types: Mapped[str] = mapped_column(Text, default="")

    audit: Mapped[Audit] = relationship(back_populates="pages")


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    audit_id: Mapped[int] = mapped_column(ForeignKey("audits.id"), index=True)
    category: Mapped[str] = mapped_column(String(30))  # technical/onpage/performance/aeo
    code: Mapped[str] = mapped_column(String(60))
    severity: Mapped[str] = mapped_column(String(20))  # critical/warning/notice
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    urls: Mapped[list] = mapped_column(JSON, default=list)
    count: Mapped[int] = mapped_column(Integer, default=0)

    audit: Mapped[Audit] = relationship(back_populates="issues")


class AIPrompt(Base):
    __tablename__ = "ai_prompts"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    text: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    project: Mapped[Project] = relationship(back_populates="prompts")


class AIResult(Base):
    __tablename__ = "ai_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    prompt_id: Mapped[int] = mapped_column(ForeignKey("ai_prompts.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str] = mapped_column(String(40), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    model: Mapped[str] = mapped_column(String(80), default="")
    sample: Mapped[int] = mapped_column(Integer, default=1)
    answer: Mapped[str] = mapped_column(Text, default="")
    mentioned: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cited: Mapped[bool] = mapped_column(Boolean, default=False)
    citations: Mapped[list] = mapped_column(JSON, default=list)
    competitors_mentioned: Mapped[list] = mapped_column(JSON, default=list)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    prompt: Mapped[AIPrompt] = relationship()


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    phrase: Mapped[str] = mapped_column(String(300))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    project: Mapped[Project] = relationship(back_populates="keywords")
    checks: Mapped[list["RankCheck"]] = relationship(
        back_populates="keyword", cascade="all, delete-orphan", order_by="RankCheck.id.desc()"
    )

    @property
    def last(self) -> "RankCheck | None":
        return self.checks[0] if self.checks else None

    @property
    def previous(self) -> "RankCheck | None":
        return self.checks[1] if len(self.checks) > 1 else None


class RankCheck(Base):
    __tablename__ = "rank_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword_id: Mapped[int] = mapped_column(ForeignKey("keywords.id"), index=True)
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    url: Mapped[str] = mapped_column(String(1000), default="")
    ai_overview: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_overview_cited: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    keyword: Mapped[Keyword] = relationship(back_populates="checks")


class PageSnapshot(Base):
    __tablename__ = "page_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    url: Mapped[str] = mapped_column(String(1000), index=True)
    fields: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ChangeEvent(Base):
    __tablename__ = "change_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    url: Mapped[str] = mapped_column(String(1000))
    field: Mapped[str] = mapped_column(String(60))
    old_value: Mapped[str] = mapped_column(Text, default="")
    new_value: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default="notice")
    seen: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    project: Mapped[Project] = relationship(back_populates="changes")
