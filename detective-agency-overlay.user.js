// ==UserScript==
// @name         CatWar: досье агентства в игровой
// @namespace    catwar-detective
// @version      1.2.2
// @description  Сворачиваемое досье искомого кота и окрас поверх поля cw3. Обновляется само.
// @author       local
// @match        https://catwar.su/cw3
// @match        https://catwar.su/cw3/
// @match        https://catwar.su/cw3?*
// @match        https://catwar.su/cw3/*
// @match        https://catwar.net/cw3
// @match        https://catwar.net/cw3/
// @match        https://catwar.net/cw3?*
// @match        https://catwar.net/cw3/*
// @updateURL    https://cw-mod.github.io/detectiveagency/detective-agency-overlay.meta.js
// @downloadURL  https://cw-mod.github.io/detectiveagency/detective-agency-overlay.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

const GITHUB_PAGES_BASE = "https://cw-mod.github.io/detectiveagency";

(function () {
  "use strict";

  const ORIGIN = location.origin;
  const AGENCY_PATH = "/event/detectiveagency/";
  const AGENCY_URL = ORIGIN + AGENCY_PATH;
  const ASSET_BASE = AGENCY_URL;
  const LS_KEY = "cwa-da-ui-v1";
  const POLL_MS = 12000;
  const WS_DEBOUNCE_MS = 1800;

  const defaults = {
    panel: { x: 12, y: 72, collapsed: false, scale: 0.48 },
    coat: { x: null, y: null, hidden: false, scale: 1.6 },
  };

  let settings = loadSettings();
  let lastFingerprint = "";
  let refreshTimer = 0;
  let pollTimer = 0;
  let inFlight = false;
  let ui = null;

  hookWebSocket();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  function loadSettings() {
    try {
      return Object.assign(
        { panel: { ...defaults.panel }, coat: { ...defaults.coat } },
        JSON.parse(localStorage.getItem(LS_KEY) || "{}")
      );
    } catch (e) {
      return { panel: { ...defaults.panel }, coat: { ...defaults.coat } };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function hookWebSocket() {
    const install = function () {
      const Orig = window.WebSocket;
      if (!Orig || Orig.__cwaDaWrapped) return;

      function Wrapped(url, protocols) {
        const ws =
          protocols === undefined ? new Orig(url) : new Orig(url, protocols);
        ws.addEventListener("message", function (ev) {
          const data = ev.data;
          if (typeof data !== "string") return;
          if (
            /зацепк|подтверд|личность|детектив|Задание получено|успешно раскрыть/i.test(
              data
            )
          ) {
            window.dispatchEvent(new CustomEvent("cwa-da-refresh"));
          }
        });
        return ws;
      }

      Wrapped.prototype = Orig.prototype;
      Wrapped.CONNECTING = Orig.CONNECTING;
      Wrapped.OPEN = Orig.OPEN;
      Wrapped.CLOSING = Orig.CLOSING;
      Wrapped.CLOSED = Orig.CLOSED;
      Wrapped.__cwaDaWrapped = true;
      window.WebSocket = Wrapped;
    };

    try {
      install();
    } catch (e) {}

    const script = document.createElement("script");
    script.textContent = "(" + install.toString() + ")();";
    const host = document.documentElement || document.head;
    if (host) host.appendChild(script);
    script.remove();
  }

  function boot() {
    if (document.getElementById("cwa-da-root")) return;
    injectStyles();
    ui = buildUi();
    document.documentElement.appendChild(ui.root);
    placeCoatDefault();
    applyUiState();
    bindUi();
    window.addEventListener("cwa-da-refresh", () => scheduleRefresh(WS_DEBOUNCE_MS));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleRefresh(400);
    });
    refresh();
    pollTimer = window.setInterval(refresh, POLL_MS);
  }

  function injectStyles() {
    const css = `
#cwa-da-root { all: initial; }
#cwa-da-root, #cwa-da-root * { box-sizing: border-box; }
#cwa-da-panel, #cwa-da-coat {
  position: fixed;
  z-index: 99990;
  font: 13px/1.35 Verdana, sans-serif;
  color: #22180f;
  user-select: none;
}
#cwa-da-panel {
  width: max-content;
  max-width: calc(100vw - 16px);
  background: rgba(42, 28, 16, .92);
  border: 1px solid #7e592e;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
  overflow: hidden;
}
#cwa-da-bar, #cwa-da-coat-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: linear-gradient(#5a3d22, #3b2716);
  color: #f3e4c8;
  cursor: grab;
}
#cwa-da-bar:active, #cwa-da-coat-bar:active { cursor: grabbing; }
#cwa-da-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: bold;
}
#cwa-da-status { opacity: .75; font-size: 11px; }
#cwa-da-bar button, #cwa-da-coat-bar button {
  appearance: none;
  background: #2a1c10;
  color: #f3e4c8;
  border: 1px solid #8a6a3c;
  border-radius: 4px;
  padding: 2px 7px;
  font: 12px Verdana, sans-serif;
  cursor: pointer;
}
#cwa-da-bar button[aria-pressed="true"] { background: #916947; color: #fff; }
#cwa-da-body {
  padding: 8px;
  background: #1c140c;
}
#cwa-da-board {
  width: 720px;
  height: 490px;
  transform-origin: top left;
  position: relative;
}
#cwa-da-board #investigation {
  background-image: url(${ASSET_BASE}investigation.png);
  color: black;
  box-shadow: 0 0 1em 1px #7e592e inset;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  word-break: break-word;
  height: 490px;
  width: 720px;
}
#cwa-da-board .note {
  position: absolute;
  background-repeat: no-repeat;
  box-sizing: border-box;
  padding: 55px 2em 2em;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
#cwa-da-board .note1 {
  width: 324px; height: 137px;
  background-image: url(${ASSET_BASE}note1.png);
  transform: rotate(2deg);
  padding-top: 45px; font-size: 16px;
  top: 15px; left: 24px;
}
#cwa-da-board .note2 {
  width: 280px; height: 294px;
  background-image: url(${ASSET_BASE}note2.png);
  justify-content: center; align-items: center;
  top: 0; left: 341px; transform: rotate(3deg);
}
#cwa-da-board .note3 {
  width: 278px; height: 312px;
  background-image: url(${ASSET_BASE}note3.png);
  transform: rotate(-2deg); padding-top: 65px;
  top: 150px; left: 23px;
}
#cwa-da-board .note4 {
  height: 198px; font-size: 13px; font-style: italic;
  background-image: url(${ASSET_BASE}note4.png);
  top: 265px; left: 318px; width: 380px; transform: rotate(-3.5deg);
}
#cwa-da-board .note4 .note_line { margin-left: .4em; margin-right: .4em; }
#cwa-da-board .picture { transform: rotate(-2deg); width: 100px; height: 150px; position: relative; }
#cwa-da-board .picture > div {
  background-repeat: no-repeat; position: absolute; width: 100px; height: 150px;
}
#cwa-da-board .note3 > .note_line:not(.note_amt) { min-height: 25px; }
#cwa-da-board .note_line { margin-bottom: .7em; }
#cwa-da-board .note_amt { min-height: 45px; }
#cwa-da-board .note_name { min-height: 40px; }
#cwa-da-board .line { height: 100%; width: 100%; background-repeat: no-repeat; }
#cwa-da-board .line1 { background-image: url(${ASSET_BASE}line1.png); }
#cwa-da-board .line2 { background-image: url(${ASSET_BASE}line2.png); right: 0; }
#cwa-da-board .no_extra .note4, #cwa-da-board .no_extra .line2 { display: none; }
#cwa-da-empty, #cwa-da-error {
  color: #f3e4c8;
  max-width: 420px;
  padding: 8px;
}
#cwa-da-error { white-space: pre-wrap; }
#cwa-da-empty .event_wrap,
#cwa-da-empty .event_wrap_nocolor {
  background: #faeedd;
  color: #22180f;
  border-radius: .3em;
  padding: .5em;
  margin-bottom: 8px;
  overflow: hidden;
}
#cwa-da-empty .event_float { float: right; }
#cwa-da-empty .av_right { margin-left: .5em; max-height: 72px; }
#cwa-da-empty .av_left { margin-right: .5em; max-height: 72px; }
#cwa-da-empty a { color: #916947; }
#cwa-da-empty hr, #cwa-da-empty br.clear { clear: both; }
#cwa-da-empty form { margin: 10px 0 4px; }
#cwa-da-empty button[name="start"] {
  appearance: none;
  background: #333;
  color: #fff;
  border: 1px solid #000;
  font: 13px Verdana, sans-serif;
  padding: 6px 12px;
  cursor: pointer;
}
#cwa-da-empty button[name="start"]:disabled {
  opacity: .6;
  cursor: wait;
}
#cwa-da-coat {
  z-index: 40;
  background: rgba(20, 14, 8, .25);
  border: 1px solid rgba(126, 89, 46, .7);
  border-radius: 8px;
  padding: 0 0 6px;
}
#cwa-da-coat.pass-through { pointer-events: none; }
#cwa-da-coat.pass-through #cwa-da-coat-bar { pointer-events: auto; }
#cwa-da-coat-pic {
  position: relative;
  margin: 4px 10px 0;
}
#cwa-da-coat-pic .picture {
  position: relative;
  transform: none;
}
#cwa-da-coat-pic .picture > div {
  position: absolute;
  left: 0; top: 0;
  background-repeat: no-repeat;
  background-size: contain;
}
#cwa-da-root.collapsed #cwa-da-body { display: none; }
#cwa-da-root.coat-hidden #cwa-da-coat { display: none; }
`;
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function buildUi() {
    const root = document.createElement("div");
    root.id = "cwa-da-root";

    const panel = document.createElement("div");
    panel.id = "cwa-da-panel";
    panel.innerHTML = `
      <div id="cwa-da-bar">
        <span id="cwa-da-title">Детективное агентство</span>
        <span id="cwa-da-status">…</span>
        <button type="button" id="cwa-da-toggle" title="Свернуть">−</button>
        <button type="button" id="cwa-da-coat-btn" title="Окрас на поле">окрас</button>
        <button type="button" id="cwa-da-refresh" title="Обновить">↻</button>
      </div>
      <div id="cwa-da-body">
        <div id="cwa-da-viewport"><div id="cwa-da-board"></div></div>
        <div id="cwa-da-empty" hidden></div>
        <div id="cwa-da-error" hidden></div>
      </div>`;

    const coat = document.createElement("div");
    coat.id = "cwa-da-coat";
    coat.className = "pass-through";
    coat.innerHTML = `
      <div id="cwa-da-coat-bar">
        <span>Искомый окрас</span>
        <button type="button" id="cwa-da-coat-scale" title="Масштаб">×1.6</button>
        <button type="button" id="cwa-da-coat-hide" title="Скрыть">✕</button>
      </div>
      <div id="cwa-da-coat-pic"></div>`;

    root.append(panel, coat);
    return {
      root,
      panel,
      coat,
      bar: panel.querySelector("#cwa-da-bar"),
      coatBar: coat.querySelector("#cwa-da-coat-bar"),
      title: panel.querySelector("#cwa-da-title"),
      status: panel.querySelector("#cwa-da-status"),
      toggle: panel.querySelector("#cwa-da-toggle"),
      coatBtn: panel.querySelector("#cwa-da-coat-btn"),
      refreshBtn: panel.querySelector("#cwa-da-refresh"),
      board: panel.querySelector("#cwa-da-board"),
      viewport: panel.querySelector("#cwa-da-viewport"),
      empty: panel.querySelector("#cwa-da-empty"),
      error: panel.querySelector("#cwa-da-error"),
      coatPic: coat.querySelector("#cwa-da-coat-pic"),
      coatScale: coat.querySelector("#cwa-da-coat-scale"),
      coatHide: coat.querySelector("#cwa-da-coat-hide"),
    };
  }

  function bindUi() {
    ui.toggle.addEventListener("click", () => {
      settings.panel.collapsed = !settings.panel.collapsed;
      applyUiState();
      saveSettings();
    });
    ui.coatBtn.addEventListener("click", () => {
      settings.coat.hidden = !settings.coat.hidden;
      applyUiState();
      saveSettings();
    });
    ui.coatHide.addEventListener("click", () => {
      settings.coat.hidden = true;
      applyUiState();
      saveSettings();
    });
    ui.refreshBtn.addEventListener("click", () => refresh(true));
    ui.coatScale.addEventListener("click", () => {
      const steps = [1, 1.3, 1.6, 2, 2.5];
      const i = steps.indexOf(settings.coat.scale);
      settings.coat.scale = steps[(i + 1) % steps.length];
      applyCoatScale();
      saveSettings();
    });
    makeDraggable(ui.bar, ui.panel, "panel");
    makeDraggable(ui.coatBar, ui.coat, "coat");
  }

  function applyUiState() {
    ui.root.classList.toggle("collapsed", !!settings.panel.collapsed);
    ui.root.classList.toggle("coat-hidden", !!settings.coat.hidden);
    ui.toggle.textContent = settings.panel.collapsed ? "+" : "−";
    ui.coatBtn.setAttribute("aria-pressed", String(!settings.coat.hidden));
    ui.panel.style.left = settings.panel.x + "px";
    ui.panel.style.top = settings.panel.y + "px";
    if (settings.coat.x != null) ui.coat.style.left = settings.coat.x + "px";
    if (settings.coat.y != null) ui.coat.style.top = settings.coat.y + "px";
    applyBoardScale();
    applyCoatScale();
  }

  function applyBoardScale() {
    const s = settings.panel.scale;
    ui.board.style.transform = "scale(" + s + ")";
    ui.viewport.style.width = 720 * s + "px";
    ui.viewport.style.height = 490 * s + "px";
    ui.viewport.style.overflow = "hidden";
  }

  function applyCoatScale() {
    const s = settings.coat.scale;
    ui.coatScale.textContent = "×" + s;
    const w = Math.round(100 * s);
    const h = Math.round(150 * s);
    const pic = ui.coatPic.querySelector(".picture");
    if (!pic) {
      ui.coatPic.style.width = w + "px";
      ui.coatPic.style.height = h + "px";
      return;
    }
    pic.style.width = w + "px";
    pic.style.height = h + "px";
    pic.querySelectorAll("div").forEach((d) => {
      d.style.width = w + "px";
      d.style.height = h + "px";
    });
  }

  function placeCoatDefault() {
    const apply = (x, y) => {
      settings.coat.x = x;
      settings.coat.y = y;
      ui.coat.style.left = x + "px";
      ui.coat.style.top = y + "px";
    };

    if (settings.coat.x != null && settings.coat.y != null) {
      apply(settings.coat.x, settings.coat.y);
      return;
    }

    const fromField = () => {
      const field =
        document.getElementById("cages_overflow") ||
        document.getElementById("cages_div");
      if (!field) return false;
      const r = field.getBoundingClientRect();
      if (r.width < 40) return false;
      apply(Math.max(8, Math.round(r.right - 160)), Math.max(8, Math.round(r.top + 24)));
      return true;
    };

    if (fromField()) return;
    apply(380, 90);
    const obs = new MutationObserver(() => {
      if (fromField()) obs.disconnect();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => obs.disconnect(), 15000);
  }

  function makeDraggable(handle, box, key) {
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let dragging = false;

    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button")) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = box.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const x = Math.max(0, origX + e.clientX - startX);
      const y = Math.max(0, origY + e.clientY - startY);
      box.style.left = x + "px";
      box.style.top = y + "px";
      settings[key].x = x;
      settings[key].y = y;
    });

    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      saveSettings();
    });
  }

  function scheduleRefresh(delay) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => refresh(false), delay);
  }

  async function refresh(force) {
    if (inFlight) return;
    inFlight = true;
    ui.status.textContent = "обновляю…";
    try {
      const res = await fetch(AGENCY_URL + "?_=" + Date.now(), {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      const data = parseAgency(html);
      if (!force && data.fingerprint === lastFingerprint) {
        ui.status.textContent = timeNow();
        ui.error.hidden = true;
        return;
      }
      lastFingerprint = data.fingerprint;
      render(data);
      ui.status.textContent = timeNow();
      ui.error.hidden = true;
    } catch (err) {
      ui.status.textContent = "ошибка";
      ui.error.hidden = false;
      ui.error.textContent = "Не удалось обновить досье: " + err.message;
    } finally {
      inFlight = false;
    }
  }

  function parseAgency(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const investigation = doc.querySelector("#investigation");
    const main = doc.querySelector("#main") || doc.body;
    const logWraps = [...main.querySelectorAll(".event_wrap_nocolor, .event_wrap")];
    const statusBits = logWraps
      .map((n) => n.innerText.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    // Completed / empty case: no #investigation, success text + POST form
    // <form method='POST'><button type='submit' name='start' value='<unix>'>Начать поиски!</button></form>
    const startBtn = main.querySelector(
      "form button[name='start'], form input[name='start']"
    );
    const startForm = startBtn ? startBtn.closest("form") : null;

    if (!investigation) {
      const statusNodes = logWraps.map((n) => n.cloneNode(true));
      statusNodes.forEach(rewriteSubtreeUrls);
      let startFormClone = null;
      if (startForm) {
        startFormClone = startForm.cloneNode(true);
        startFormClone.setAttribute("action", AGENCY_URL);
        startFormClone.setAttribute("method", "POST");
        rewriteSubtreeUrls(startFormClone);
      }
      return {
        hasCase: false,
        fingerprint:
          "none:" +
          statusBits.join("|").slice(0, 400) +
          "|start=" +
          ((startBtn && startBtn.value) || ""),
        title: "Нет активного дела",
        statusHtml:
          statusBits.join("\n\n") ||
          "Дела нет. Открой агентство, если хочешь взять новое.",
        statusNodes,
        startForm: startFormClone,
        startValue: (startBtn && startBtn.value) || "",
        investigation: null,
        picture: null,
      };
    }

    rewriteSubtreeUrls(investigation);
    const picture = investigation.querySelector(".picture");
    if (picture) rewriteSubtreeUrls(picture);

    const fields = {};
    investigation.querySelectorAll(".note_line").forEach((line) => {
      const m = line.innerText.match(/^\s*([^:]+):\s*(.*)$/);
      if (m) fields[m[1].trim()] = m[2].trim();
    });

    const titleParts = [fields["Имя"] || "???", fields["ID"] || ""].filter(Boolean);
    return {
      hasCase: true,
      fingerprint: investigation.outerHTML,
      title: titleParts.join(" · "),
      fields,
      investigation,
      picture,
      statusHtml: "",
      statusNodes: [],
      startForm: null,
      startValue: "",
    };
  }

  function rewriteSubtreeUrls(root) {
    if (!root) return;
    if (root.nodeType !== 1) return;
    rewriteElUrls(root);
    root.querySelectorAll("[style], [src], [href]").forEach(rewriteElUrls);
  }

  function rewriteElUrls(el) {
    if (el.hasAttribute && el.hasAttribute("style")) {
      el.setAttribute("style", absolutizeCss(el.getAttribute("style") || ""));
    }
    if (el.getAttribute) {
      const src = el.getAttribute("src");
      if (src) el.setAttribute("src", absolutizeUrl(src));
      const href = el.getAttribute("href");
      if (href) el.setAttribute("href", absolutizeUrl(href));
    }
  }

  function absolutizeCss(css) {
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_, q, raw) => {
      return "url(" + q + absolutizeUrl(raw.trim()) + q + ")";
    });
  }

  function absolutizeUrl(url) {
    const raw = (url || "").trim();
    if (!raw) return raw;
    if (/^(https?:|data:|blob:|javascript:|mailto:|#)/i.test(raw)) return raw;
    if (raw.startsWith("//")) return location.protocol + raw;
    if (raw.startsWith("/")) return ORIGIN + raw;
    return ASSET_BASE + raw;
  }

  function render(data) {
    ui.title.textContent = data.title;
    if (!data.hasCase) {
      ui.board.innerHTML = "";
      ui.coatPic.innerHTML = "";
      ui.viewport.hidden = true;
      ui.empty.hidden = false;
      ui.empty.innerHTML = "";
      if (data.statusNodes && data.statusNodes.length) {
        data.statusNodes.forEach((n) => ui.empty.appendChild(document.importNode(n, true)));
      } else {
        ui.empty.textContent = data.statusHtml;
      }
      if (data.startForm) {
        const form = document.importNode(data.startForm, true);
        bindStartForm(form, data.startValue);
        ui.empty.appendChild(form);
      }
      return;
    }

    ui.empty.hidden = true;
    ui.empty.innerHTML = "";
    ui.viewport.hidden = false;
    ui.board.innerHTML = "";
    ui.board.appendChild(data.investigation);

    ui.coatPic.innerHTML = "";
    if (data.picture) {
      ui.coatPic.appendChild(data.picture.cloneNode(true));
    }
    applyBoardScale();
    applyCoatScale();
  }

  function bindStartForm(form, startValue) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("[name='start']");
      const value = (btn && btn.value) || startValue;
      startNewCase(form, value);
    });
  }

  async function startNewCase(form, startValue) {
    if (!startValue) {
      ui.error.hidden = false;
      ui.error.textContent = "Не найден параметр start для начала поисков.";
      return;
    }
    if (inFlight) return;
    inFlight = true;
    const btn = form.querySelector("[name='start']");
    if (btn) btn.disabled = true;
    ui.status.textContent = "начинаю поиски…";
    try {
      const res = await fetch(AGENCY_URL, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html",
        },
        body: "start=" + encodeURIComponent(startValue),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const html = await res.text();
      const data = parseAgency(html);
      lastFingerprint = data.fingerprint;
      render(data);
      ui.status.textContent = timeNow();
      ui.error.hidden = true;
      if (!data.hasCase) {
        scheduleRefresh(600);
      }
    } catch (err) {
      ui.status.textContent = "ошибка";
      ui.error.hidden = false;
      ui.error.textContent = "Не удалось начать поиски: " + err.message;
      if (btn) btn.disabled = false;
    } finally {
      inFlight = false;
    }
  }

  function timeNow() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  }
})();
