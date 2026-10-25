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

function loadScriptOnce(src, id) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.id = id;
  document.body.appendChild(s);
}

function renderEmbed(r) {
  const box = document.getElementById("embed-box");
  if (!box) return;
  const bq = document.createElement("blockquote");
  if (r.embed_platform === "instagram") {
    bq.className = "instagram-media";
    bq.setAttribute("data-instgrm-permalink", r.embed_url);
    bq.setAttribute("data-instgrm-version", "14");
    box.appendChild(bq);
    if (window.instgrm) window.instgrm.Embeds.process();
    else loadScriptOnce("https://www.instagram.com/embed.js", "ig-embed-js");
  } else if (r.embed_platform === "threads") {
    bq.className = "text-post-media";
    bq.setAttribute("data-text-post-permalink", r.embed_url);
    box.appendChild(bq);
    loadScriptOnce("https://www.threads.net/embed.js", "th-embed-js");
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
