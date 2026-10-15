(function () {
  "use strict";
  var KEY = "sdfg-progress-v1";
  var state = { done: {}, grades: {}, last: null, theme: null };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") state = Object.assign(state, saved);
  } catch (e) { /* storage unavailable: progress lives for this visit only */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var root = document.documentElement;
  if (state.theme) root.setAttribute("data-theme", state.theme);

  var main = document.getElementById("main");
  var home = document.getElementById("home");
  var pager = document.getElementById("pager");
  var pages = [home].concat(Array.prototype.slice.call(main.querySelectorAll(":scope > section.part, :scope > section.chapter")));
  var byId = {};
  pages.forEach(function (p) { byId[p.id] = p; });

  // NAV rows: [level, id, num, title]; group chapters under parts.
  var groups = [], cur = { part: null, items: [] };
  groups.push(cur);
  NAV.forEach(function (row) {
    if (row[0] === "part") { cur = { part: row, items: [] }; groups.push(cur); }
    else cur.items.push(row);
  });
  var chapters = NAV.filter(function (r) { return r[0] === "chapter" && byId[r[1]]; });
  var trackable = chapters.filter(function (r) { return r[1] !== "answers"; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function quizItems(sec) { return sec ? sec.querySelectorAll(".quiz li[data-q]") : []; }
  function quizScore(sec) {
    var items = quizItems(sec), got = 0;
    for (var i = 0; i < items.length; i++) if (state.grades[items[i].dataset.q] === "got") got++;
    return { got: got, total: items.length };
  }
  function label(row) { return row[2] ? row[2] + ". " + row[3] : row[3]; }

  // ------------------------------------------------------------ sidebar
  var navEl = document.getElementById("toc-nav");
  function renderNav() {
    var html = "";
    groups.forEach(function (g) {
      if (!g.items.length && !g.part) return;
      html += g.part
        ? '<div class="nav-part"><a href="#' + g.part[1] + '">Part ' + esc(g.part[2]) + " · " + esc(g.part[3]) + "</a></div>"
        : '<div class="nav-part">Start here</div>';
      g.items.forEach(function (r) {
        if (!byId[r[1]]) return;
        var sc = quizScore(byId[r[1]]);
        var done = !!state.done[r[1]];
        var st = done ? "✓" : (sc.total ? sc.got + "/" + sc.total : "");
        html += '<a class="nav-link' + (done ? " done" : "") + '" href="#' + r[1] + '" data-id="' + r[1] + '">' +
          '<span class="nav-num">' + esc(r[2] || "·") + '</span><span>' + esc(r[3]) + '</span>' +
          '<span class="nav-state" title="' + (done ? "Read" : "Quiz answers you got right") + '">' + st + "</span></a>";
      });
    });
    navEl.innerHTML = html;
    var n = trackable.filter(function (r) { return state.done[r[1]]; }).length;
    document.getElementById("sp-count").textContent = n + " / " + trackable.length + " read";
    document.getElementById("sp-fill").style.width = (100 * n / trackable.length) + "%";
    markCurrent();
  }
  function markCurrent() {
    var links = navEl.querySelectorAll(".nav-link");
    for (var i = 0; i < links.length; i++) {
      var on = links[i].dataset.id === currentId;
      links[i].classList.toggle("current", on);
      if (on) links[i].setAttribute("aria-current", "page"); else links[i].removeAttribute("aria-current");
    }
  }

  // ------------------------------------------------------------ home
  function renderHome() {
    var figs = main.querySelectorAll("figure.dia").length;
    var qs = main.querySelectorAll(".quiz li[data-q]").length;
    var numbered = chapters.filter(function (r) { return r[2]; }).length;
    var lastRow = state.last && chapters.filter(function (r) { return r[1] === state.last; })[0];
    var startId = "ch-1";
    var h = '<div class="home-hero"><div class="eyebrow">A complete course in one volume</div>' +
      "<h1>System Design <span>from first principles to planet scale</span></h1>" +
      "<p>The concepts, patterns and trade-offs behind systems that serve millions of people. Every chapter goes from problem to mechanism to diagram to trade-offs, and ends with a quiz.</p>" +
      '<div class="hero-actions">' +
      (lastRow ? '<a class="btn btn-primary" href="#' + lastRow[1] + '">Continue: ' + esc(label(lastRow)) + " →</a>" +
                 '<a class="btn btn-ghost" href="#' + startId + '">Start from Chapter 1</a>'
               : '<a class="btn btn-primary" href="#' + startId + '">Start reading →</a>' +
                 '<a class="btn btn-ghost" href="#ap-preface">Read the preface</a>') +
      "</div>" +
      '<div class="stats">' +
      '<div class="stat"><b>' + (numbered - 4) + "</b><span>chapters</span></div>" +
      '<div class="stat"><b>4</b><span>case studies</span></div>' +
      '<div class="stat"><b>' + figs + "</b><span>diagrams</span></div>" +
      '<div class="stat"><b>' + qs + "</b><span>quiz questions</span></div></div></div>" +
      '<h2 class="sec">The eight parts</h2><div class="parts-grid">';
    groups.forEach(function (g) {
      if (!g.part) return;
      var sec = byId[g.part[1]];
      var sub = sec ? sec.querySelector(".part-sub") : null;
      var ids = g.items.map(function (r) { return r[1]; }).filter(function (id) { return byId[id] && id !== "answers"; });
      var done = ids.filter(function (id) { return state.done[id]; }).length;
      h += '<a class="part-card" href="#' + g.part[1] + '"><span class="pc-num">Part ' + esc(g.part[2]) + "</span>" +
        '<span class="pc-title">' + esc(g.part[3]) + "</span>" +
        '<span class="pc-sub">' + (sub ? sub.innerHTML : "") + "</span>" +
        '<span class="pc-meta"><span>' + done + " / " + ids.length + ' read</span><span class="pc-bar"><span style="width:' +
        (ids.length ? 100 * done / ids.length : 0) + '%"></span></span></span></a>';
    });
    h += '</div><h2 class="sec">Reference</h2><div class="parts-grid">';
    chapters.filter(function (r) { return r[1].indexOf("ap-") === 0 && r[1] !== "ap-preface"; }).forEach(function (r) {
      h += '<a class="part-card" href="#' + r[1] + '"><span class="pc-num">Appendix</span><span class="pc-title">' + esc(r[3]) + "</span></a>";
    });
    h += "</div>";
    home.innerHTML = h;
  }

  // ------------------------------------------------------------ parts and chapters
  groups.forEach(function (g) {
    if (!g.part || !byId[g.part[1]]) return;
    var ul = document.createElement("ul");
    ul.className = "part-chapters";
    ul.innerHTML = g.items.filter(function (r) { return byId[r[1]]; }).map(function (r) {
      var nsec = byId[r[1]].querySelectorAll("h2").length;
      return '<li><a href="#' + r[1] + '"><span class="n">' + esc(r[2]) + '</span><span class="t">' + esc(r[3]) +
        '</span><span class="s">' + nsec + " sections</span></a></li>";
    }).join("");
    byId[g.part[1]].querySelector(".part-inner").appendChild(ul);
  });

  chapters.forEach(function (r) {
    var sec = byId[r[1]];
    var q = sec.querySelector(".quiz-head");
    if (q) {
      var s = document.createElement("span");
      s.className = "quiz-score";
      q.appendChild(s);
    }
    quizItems(sec).forEach(function (li) { if (state.grades[li.dataset.q]) li.dataset.state = state.grades[li.dataset.q]; });
    var end = document.createElement("div");
    end.className = "chapter-end";
    end.innerHTML = "<span>Finished this chapter? Mark it so your progress shows in the sidebar.</span>" +
      '<button type="button" class="done-btn" data-done="' + r[1] + '" aria-pressed="false">Mark as read</button>';
    sec.appendChild(end);
  });
  function refreshChapterUI(sec) {
    if (!sec || !sec.classList.contains("chapter")) return;
    var sc = quizScore(sec), s = sec.querySelector(".quiz-score");
    if (s) s.textContent = sc.got + " of " + sc.total + " answered correctly";
    var b = sec.querySelector(".done-btn");
    if (b) {
      var d = !!state.done[sec.id];
      b.setAttribute("aria-pressed", d ? "true" : "false");
      b.textContent = d ? "✓ Read" : "Mark as read";
    }
  }

  main.addEventListener("click", function (e) {
    var g = e.target.closest("button[data-grade]");
    if (g) {
      var li = g.closest("li[data-q]"), v = g.dataset.grade;
      if (state.grades[li.dataset.q] === v) { delete state.grades[li.dataset.q]; delete li.dataset.state; }
      else { state.grades[li.dataset.q] = v; li.dataset.state = v; }
      save(); refreshChapterUI(li.closest("section")); renderNav();
      return;
    }
    var d = e.target.closest("button[data-done]");
    if (d) {
      var id = d.dataset.done;
      if (state.done[id]) delete state.done[id]; else state.done[id] = true;
      save(); refreshChapterUI(byId[id]); renderNav();
    }
  });

  // ------------------------------------------------------------ routing
  var currentId = null;
  var order = ["home"].concat(pages.slice(1).map(function (p) { return p.id; }));
  function titleOf(id) {
    if (id === "home") return "Home";
    var p = byId[id];
    if (p.classList.contains("part")) return "Part " + p.querySelector(".part-num").textContent.replace("Part ", "") + ": " + p.querySelector(".part-title").textContent;
    var row = chapters.filter(function (r) { return r[1] === id; })[0];
    return row ? label(row) : id;
  }
  function show(id, anchor) {
    if (!byId[id]) id = "home";
    pages.forEach(function (p) { p.hidden = p.id !== id; });
    currentId = id;
    if (id === "home") renderHome();
    refreshChapterUI(byId[id]);
    var i = order.indexOf(id), prev = order[i - 1], next = order[i + 1];
    pager.innerHTML = (prev ? '<a class="prev" href="#' + prev + '"><span class="dir">← Previous</span><span class="ttl">' + esc(titleOf(prev)) + "</span></a>" : "") +
      (next ? '<a class="next" href="#' + next + '"><span class="dir">Next →</span><span class="ttl">' + esc(titleOf(next)) + "</span></a>" : "");
    if (id !== "home" && byId[id].classList.contains("chapter")) { state.last = id; save(); }
    markCurrent();
    closeMenu();
    if (anchor) anchor.scrollIntoView(); else window.scrollTo(0, 0);
    updateBar();
  }
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return show("home");
    var el = document.getElementById(h);
    if (!el) return show("home");
    if (byId[h]) return show(h);
    var sec = el.closest("main > section");
    if (sec) { show(sec.id, el); if (el.tagName === "LI") el.querySelector("details") && (el.querySelector("details").open = true); }
  }
  window.addEventListener("hashchange", route);

  // ------------------------------------------------------------ search
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");
  var index = [];
  pages.slice(1).forEach(function (sec) {
    var where = titleOf(sec.id), heading = "";
    sec.querySelectorAll("h2, p, li, td, figcaption, dd, dt").forEach(function (el) {
      if (el.tagName === "H2") { heading = el.textContent.replace(/^[\d.]+/, "").trim(); }
      if (el.closest(".grade")) return;
      var t = el.textContent.replace(/\s+/g, " ").trim();
      if (t.length < 3) return;
      if (!el.id) el.id = "x" + index.length;
      index.push({ id: el.id, sec: sec.id, where: where, heading: el.tagName === "H2" ? "" : heading, text: t, low: t.toLowerCase(), h2: el.tagName === "H2" });
    });
  });
  var active = -1;
  function doSearch() {
    var q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.hidden = true; return; }
    var hits = [];
    for (var i = 0; i < index.length && hits.length < 40; i++) {
      var it = index[i], at = it.low.indexOf(q);
      if (at < 0) continue;
      var s = Math.max(0, at - 50), snip = (s ? "…" : "") + it.text.slice(s, at + q.length + 90) + (at + q.length + 90 < it.text.length ? "…" : "");
      var k = snip.toLowerCase().indexOf(q);
      snip = esc(snip.slice(0, k)) + "<mark>" + esc(snip.slice(k, k + q.length)) + "</mark>" + esc(snip.slice(k + q.length));
      hits.push((it.h2 ? 0 : 1) + "|" + '<a class="sr-item" href="#' + it.id + '"><div class="sr-where">' + esc(it.where) +
        (it.heading ? " · " + esc(it.heading) : "") + '</div><div class="sr-snip">' + snip + "</div></a>");
    }
    hits.sort();
    results.innerHTML = hits.length ? hits.map(function (h) { return h.slice(2); }).join("") : '<div class="sr-empty">No matches for "' + esc(input.value) + '".</div>';
    results.hidden = false; active = -1;
  }
  var t;
  input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(doSearch, 120); });
  input.addEventListener("focus", function () { if (input.value.trim().length > 1) doSearch(); });
  input.addEventListener("keydown", function (e) {
    var items = results.querySelectorAll(".sr-item");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(0, Math.min(items.length - 1, active + (e.key === "ArrowDown" ? 1 : -1)));
      items.forEach(function (x, i) { x.classList.toggle("active", i === active); });
      if (items[active]) items[active].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && items.length) {
      (items[active] || items[0]).click();
    } else if (e.key === "Escape") { results.hidden = true; input.blur(); }
  });
  results.addEventListener("click", function (e) { if (e.target.closest(".sr-item")) { results.hidden = true; input.blur(); } });
  document.addEventListener("click", function (e) { if (!e.target.closest(".search")) results.hidden = true; });

  // ------------------------------------------------------------ theme, menu, keys, reading bar
  document.getElementById("theme-btn").addEventListener("click", function () {
    var dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    state.theme = dark ? "light" : "dark";
    root.setAttribute("data-theme", state.theme);
    save();
  });
  var sidebar = document.getElementById("sidebar"), scrim = document.getElementById("scrim"), menuBtn = document.getElementById("menu-btn");
  function closeMenu() { sidebar.classList.remove("open"); scrim.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    var open = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", open); scrim.hidden = !open; menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  scrim.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); input.focus(); }
    var i = order.indexOf(currentId);
    if (e.key === "ArrowRight" && order[i + 1]) location.hash = order[i + 1];
    if (e.key === "ArrowLeft" && order[i - 1]) location.hash = order[i - 1];
    if (e.key === "Escape") closeMenu();
  });
  var bar = document.getElementById("readbar");
  function updateBar() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? Math.min(100, 100 * scrollY / h) : 0) + "%";
  }
  addEventListener("scroll", updateBar, { passive: true });

  renderNav();
  route();
})();
