// Panel SEO/AEO – drobne interakcje interfejsu
(function () {
  const root = document.documentElement;
  const stored = (() => { try { return localStorage.getItem("theme"); } catch (e) { return null; } })();
  if (stored) root.dataset.theme = stored;

  document.addEventListener("DOMContentLoaded", () => {
    // Przełącznik motywu
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const dark = root.dataset.theme
          ? root.dataset.theme === "dark"
          : window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.dataset.theme = dark ? "light" : "dark";
        try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
        document.dispatchEvent(new Event("themechange"));
      })
    );

    // Menu na telefonie
    const sidebar = document.querySelector(".sidebar");
    document.querySelectorAll("[data-menu]").forEach((b) => b.addEventListener("click", () => sidebar.classList.toggle("open")));

    // Komunikaty znikają po chwili
    document.querySelectorAll(".flash").forEach((f) => setTimeout(() => { f.style.transition = "opacity .4s"; f.style.opacity = 0; setTimeout(() => f.remove(), 400); }, 5000));

    // Potwierdzenie usuwania
    document.querySelectorAll("form[data-confirm]").forEach((form) =>
      form.addEventListener("submit", (e) => { if (!confirm(form.dataset.confirm)) e.preventDefault(); })
    );

    // Przycisk zajęty po wysłaniu formularza
    document.querySelectorAll("form[data-busy]").forEach((form) =>
      form.addEventListener("submit", () => {
        const b = form.querySelector("button[type=submit]");
        if (b) { b.disabled = true; b.innerHTML = '<span class="spinner"></span> ' + form.dataset.busy; }
      })
    );

    // Filtry problemów audytu
    const list = document.querySelector("[data-issues]");
    if (list) {
      const state = { cat: "all", sev: "all" };
      const apply = () => {
        let shown = 0;
        list.querySelectorAll(".issue").forEach((el) => {
          const ok = (state.cat === "all" || el.dataset.cat === state.cat) && (state.sev === "all" || el.dataset.sev === state.sev);
          el.classList.toggle("hidden", !ok);
          if (ok) shown++;
        });
        const empty = document.querySelector("[data-issues-empty]");
        if (empty) empty.classList.toggle("hidden", shown > 0);
      };
      document.querySelectorAll("[data-filter]").forEach((chip) =>
        chip.addEventListener("click", () => {
          const [key, val] = chip.dataset.filter.split(":");
          state[key] = val;
          document.querySelectorAll(`[data-filter^="${key}:"]`).forEach((c) => c.classList.toggle("on", c === chip));
          apply();
        })
      );
    }

    // Wyszukiwarka w tabelach
    document.querySelectorAll("[data-table-search]").forEach((input) => {
      const table = document.querySelector(input.dataset.tableSearch);
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        table.querySelectorAll("tbody tr").forEach((tr) => tr.classList.toggle("hidden", !tr.textContent.toLowerCase().includes(q)));
      });
    });
  });
})();

// Wykres liniowy (Chart.js) z kolorami z tokenów CSS
window.lineChart = function (canvasId, labels, series, opts = {}) {
  const el = document.getElementById(canvasId);
  if (!el || !window.Chart) return;
  let chart;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const build = () => {
    if (chart) chart.destroy();
    chart = new Chart(el, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label, data: s.data, borderColor: css(s.color), backgroundColor: css(s.color),
          borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, tension: 0.25, spanGaps: true,
          pointBorderColor: css("--surface"), pointBorderWidth: 2,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: css("--surface"), titleColor: css("--text"), bodyColor: css("--text-2"),
            borderColor: css("--border-strong"), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
            callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y ?? "—"}${opts.suffix || ""}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: css("--muted") }, border: { color: css("--grid") } },
          y: {
            reverse: !!opts.reverse, min: opts.min, max: opts.max, grid: { color: css("--grid") }, border: { display: false },
            ticks: { color: css("--muted"), callback: (v) => v + (opts.suffix || "") },
          },
        },
      },
    });
  };
  build();
  document.addEventListener("themechange", build);
};
