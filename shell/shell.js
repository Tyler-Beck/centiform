// Centiform shell: rail by family, filter, hash routing, keys.
// The stage iframe is replaced on every change (never set .src) so history stays one
// entry per design. The shell never reads or styles the design inside the frame.
(() => {
  const D = window.CENTIFORM;
  const $ = (id) => document.getElementById(id);
  const shell = $("shell"), list = $("list"), filter = $("filter");
  const pad = (n) => String(n).padStart(3, "0");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const url = (d) => (d.status === "done" ? `designs/${d.slug}/index.html` : `shell/planned.html#${d.slug}`);

  const families = [...new Set(D.map((d) => d.family))];
  list.innerHTML = families.map((f) => `<section class="fam"><h2>${esc(f)}</h2><ul>${
    D.filter((d) => d.family === f).map((d) => `<li><a class="item${d.status === "done" ? "" : " planned"}" href="#${d.slug}" data-slug="${d.slug}"><span class="n">${pad(d.n)}</span><span class="t">${esc(d.title)}</span><span class="dots">${
      d.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</span></a></li>`).join("")
  }</ul></section>`).join("");
  const done = D.filter((d) => d.status === "done").length;
  $("count").textContent = done === D.length ? `${D.length}` : `${done} / ${D.length}`;

  const current = () => D.find((x) => x.slug === location.hash.slice(1)) || D[0];

  function show() {
    const d = current();
    const f = document.createElement("iframe");
    f.id = "stage";
    f.title = d.title;
    f.src = url(d);
    $("stage").replaceWith(f);
    list.querySelectorAll(".item").forEach((a) => {
      const on = a.dataset.slug === d.slug;
      a.toggleAttribute("aria-current", on);
      if (on) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest" }); }
    });
    $("info").innerHTML = `<b>${pad(d.n)} / ${D.length}</b> · ${esc(d.title)} · ${esc(d.family)} · ${esc(d.thesis)}`;
    $("alone").href = url(d);
    document.title = `${d.title} - Centiform`;
    shell.classList.remove("open");
    $("drawer").setAttribute("aria-expanded", "false");
  }

  function step(k) {
    const i = D.indexOf(current());
    location.hash = D[(i + k + D.length) % D.length].slug;
  }

  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    list.querySelectorAll(".fam").forEach((sec) => {
      let any = false;
      sec.querySelectorAll(".item").forEach((a) => {
        const d = D.find((x) => x.slug === a.dataset.slug);
        const hay = `${pad(d.n)} ${d.title} ${d.family} ${d.thesis}`.toLowerCase();
        const hit = !q || q.split(/\s+/).every((w) => hay.includes(w));
        a.parentElement.hidden = !hit;
        any ||= hit;
      });
      sec.hidden = !any;
    });
  });

  $("drawer").addEventListener("click", () => {
    const open = shell.classList.toggle("open");
    $("drawer").setAttribute("aria-expanded", String(open));
  });

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement === filter) {
      if (e.key === "Escape") { filter.value = ""; filter.dispatchEvent(new Event("input")); filter.blur(); }
      return;
    }
    const k = e.key;
    if (k === "j" || k === "ArrowDown") step(1);
    else if (k === "k" || k === "ArrowUp") step(-1);
    else if (k === "/") filter.focus();
    else if (k === "Escape") { filter.value = ""; filter.dispatchEvent(new Event("input")); }
    else if (k === "f") shell.classList.toggle("full");
    else if (k === "o") open(url(current()), "_blank", "noopener");
    else return;
    e.preventDefault();
  });

  addEventListener("hashchange", show);
  show();
})();
