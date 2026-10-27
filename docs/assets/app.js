"use strict";

const UI = {
  en: {
    brandSub: "Japanese recipes for a deliberate life.",
    toggle: "日本語",
    all: "All",
    recipes: (n) => `${n} recipe${n === 1 ? "" : "s"}`,
    temp: "Temp",
    category: "Category",
    time: "Time",
    min: "min",
    season: "Season",
    region: "Region",
    back: "← All recipes",
    source: "Source",
    originalPost: "Original post",
    footer: "Everyday Japanese recipes and techniques, shared with the world.",
    notFound: "Recipe not found.",
  },
  ja: {
    brandSub: "日本の丁寧な暮らしのレシピ集",
    toggle: "English",
    all: "すべて",
    recipes: (n) => `${n} 件のレシピ`,
    temp: "温度",
    category: "カテゴリー",
    time: "時間",
    min: "分",
    season: "季節",
    region: "地域",
    back: "← レシピ一覧へ",
    source: "出典",
    originalPost: "元投稿",
    footer: "日本の日々のレシピと工夫を、世界へ。",
    notFound: "レシピが見つかりません。",
  },
};

let lang = localStorage.getItem("ikigai-lang") || "en";
let data = null;
let activeCategory = "all";

const $app = document.getElementById("app");
const t = () => UI[lang];

function title(r) { return lang === "en" ? r.title_en : r.title_ja; }
function altTitle(r) { return lang === "en" ? r.title_ja : r.title_en; }
function catLabel(key) {
  const c = data.categories[key];
  return c ? (lang === "en" ? c.en : c.ja) : key;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function badges(r) {
  const parts = [];
  if (r.temp_c != null) parts.push(`🌡 ${esc(r.temp_c)}℃`);
  if (r.minutes != null) parts.push(`⏱ ${esc(r.minutes)} ${t().min}`);
  return parts.length ? `<div class="badges">${parts.join("<span></span>")}</div>` : "";
}

function renderList() {
  const list = data.recipes.filter(
    (r) => activeCategory === "all" || r.category === activeCategory
  );
  const cats = Object.keys(data.categories).filter((k) =>
    data.recipes.some((r) => r.category === k)
  );
  const chips = [
    `<button class="chip ${activeCategory === "all" ? "active" : ""}" data-cat="all">${esc(t().all)}</button>`,
    ...cats.map(
      (k) =>
        `<button class="chip ${activeCategory === k ? "active" : ""}" data-cat="${esc(k)}">${esc(catLabel(k))}</button>`
    ),
  ].join("");
  const cards = list
    .map(
      (r) => `
      <a class="card" href="#/recipe/${encodeURIComponent(r.slug)}">
        <span class="cat">${esc(catLabel(r.category))}</span>
        <h3>${esc(title(r))}</h3>
        <p class="alt-title">${esc(altTitle(r))}</p>
        ${badges(r)}
      </a>`
    )
    .join("");
  $app.innerHTML = `
    <div class="chips">${chips}</div>
    <p class="count">${esc(t().recipes(list.length))}</p>
    <div class="grid">${cards}</div>`;
  $app.querySelectorAll(".chip").forEach((el) => {
    el.addEventListener("click", () => {
      activeCategory = el.dataset.cat;
      renderList();
    });
  });
}

function renderDetail(slug) {
  const r = data.recipes.find((x) => x.slug === slug);
  if (!r) {
    $app.innerHTML = `<p>${esc(t().notFound)}</p><p><a class="back" href="#/">${esc(t().back)}</a></p>`;
    return;
  }
  const meta = [];
  meta.push(`<span>${esc(t().category)}: <b>${esc(catLabel(r.category))}</b></span>`);
  if (r.temp_c != null) meta.push(`<span>${esc(t().temp)}: <b>${esc(r.temp_c)}℃</b></span>`);
  if (r.minutes != null) meta.push(`<span>${esc(t().time)}: <b>${esc(r.minutes)} ${esc(t().min)}</b></span>`);
  if (r.season) meta.push(`<span>${esc(t().season)}: <b>${esc(r.season)}</b></span>`);
  if (r.region) meta.push(`<span>${esc(t().region)}: <b>${esc(r.region)}</b></span>`);
  const source = r.source_url
    ? `<div class="source">${esc(t().source)}: <a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source_author || r.source_url)}</a></div>`
    : "";
  const embed = r.embed_url
    ? `<h2 class="embed-title">${esc(t().originalPost)}</h2><div class="embed" id="embed-box"></div>`
    : "";
  $app.innerHTML = `
    <article class="detail">
      <a class="back" href="#/">${esc(t().back)}</a>
      <h1>${esc(title(r))}</h1>
      <p class="alt-title">${esc(altTitle(r))}</p>
      <div class="meta">${meta.join("")}</div>
      <div class="body">${r.body_html}</div>
      ${embed}
      ${source}
    </article>`;
  if (r.embed_url) renderEmbed(r);
}

function loadScript(src, id) {
  // Returns a promise that resolves when the script has finished loading
  // (or failed), so callers can reliably run follow-up processing.
  return new Promise((resolve) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === "1") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => resolve(), { once: true });
        setTimeout(resolve, 3000);
      }
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.id = id;
    s.addEventListener(
      "load",
      () => {
        s.dataset.loaded = "1";
        resolve();
      },
      { once: true }
    );
    s.addEventListener("error", () => resolve(), { once: true });
    document.body.appendChild(s);
  });
}

function makeEmbedIframe(r) {
  // The platforms' official embed pages (post URL + "embed/") render fine
  // when loaded as an iframe, on every in-app navigation, with no script.
  const iframe = document.createElement("iframe");
  iframe.className =
    r.embed_platform === "instagram"
      ? "embed-frame embed-frame-ig"
      : "embed-frame embed-frame-th";
  iframe.src = r.embed_url.replace(/\/?$/, "/") + "embed/";
  iframe.title = t().originalPost;
  iframe.loading = "lazy";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "auto");
  iframe.setAttribute("allowtransparency", "true");
  return iframe;
}

function useDirectIframe(r, box) {
  if (!box.isConnected) return;
  box.innerHTML = "";
  box.appendChild(makeEmbedIframe(r));
}

function renderEmbed(r) {
  const box = document.getElementById("embed-box");
  if (!box) return;
  if (r.embed_platform === "threads") {
    // Threads' embed.js only processes blockquotes present at its initial
    // run: it exposes no re-processing call, and re-loading the script does
    // not re-scan the page (both verified on the gourmet sites), so embeds
    // added by in-app navigation stayed blank. Use the official /embed/
    // page in an iframe directly instead.
    useDirectIframe(r, box);
    return;
  }
  if (r.embed_platform === "instagram") {
    const bq = document.createElement("blockquote");
    bq.className = "instagram-media";
    bq.setAttribute("data-instgrm-permalink", r.embed_url);
    bq.setAttribute("data-instgrm-version", "14");
    box.appendChild(bq);
    const process = () => {
      if (window.instgrm && box.isConnected) {
        try {
          window.instgrm.Embeds.process();
        } catch (e) {
          /* the fallback below covers this */
        }
      }
    };
    if (window.instgrm) process();
    else loadScript("https://www.instagram.com/embed.js", "ig-embed-js").then(process);
    // Fallback: if the official script did not turn the blockquote into an
    // iframe (e.g. its load finished after this view was rendered), show
    // the official /embed/ page directly so the area never stays blank.
    // The source link under the embed remains as a further fallback.
    setTimeout(() => {
      if (!box.isConnected) return;
      if (box.querySelector("iframe")) return;
      useDirectIframe(r, box);
    }, 5000);
  }
}

function applyLang() {
  document.documentElement.lang = lang;
  document.getElementById("brand-sub").textContent = t().brandSub;
  document.getElementById("lang-toggle").textContent = t().toggle;
  document.getElementById("footer-note").textContent = t().footer;
}

function route() {
  if (!data) return;
  applyLang();
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/recipe\/(.+)$/);
  if (m) renderDetail(decodeURIComponent(m[1]));
  else renderList();
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  lang = lang === "en" ? "ja" : "en";
  localStorage.setItem("ikigai-lang", lang);
  route();
});
window.addEventListener("hashchange", route);

fetch("./data/recipes.json")
  .then((res) => res.json())
  .then((json) => {
    data = json;
    route();
  })
  .catch(() => {
    $app.innerHTML = "<p>Failed to load recipes.</p>";
  });
