/**
 * SeoPlugin — build-time SEO for this static site.
 *
 *  • Renders project cards straight into the HTML (crawlers see real content, no JS needed)
 *  • Injects JSON-LD structured data per page (Person, WebSite, ProfilePage, breadcrumbs, project lists)
 *  • Replaces SITE_URL placeholders so canonical / Open Graph URLs are absolute
 *  • Fills in years of experience, calculated from the career start date
 *  • Emits robots.txt, sitemap.xml, site.webmanifest and the static icons / social image
 */
const fs = require("fs");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { sources } = require("webpack");

const SITE = require("../src/data/site");
const PROJECTS = require("../src/data/projects");

const PLACEHOLDER = "https://site-url.placeholder";
const STATIC_DIR = path.resolve(__dirname, "../src/static");

const siteUrl = () => (process.env.URL || SITE.fallbackUrl).replace(/\/$/, "");

const yearsOfExperience = () => {
  const start = new Date(SITE.careerStart);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  if (now < new Date(now.getFullYear(), start.getMonth(), start.getDate())) years -= 1;
  return years;
};

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Project cards ───────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function card(p, i, cols) {
  const stack = (p.stack || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
  const tag = p.link ? "a" : "article";
  const linkAttrs = p.link ? ` href="${esc(p.link)}" target="_blank" rel="noopener"` : "";
  return `<div class="${cols} d-flex reveal">
  <${tag}${linkAttrs} class="project-card glass glow-border js-tilt">
    <div class="project-card__visual" aria-hidden="true">
      <div class="project-card__grid"></div>
      <i class="fa ${esc(p.icon || "fa-code")} project-card__icon"></i>
      <span class="project-card__num mono glass">${pad(i + 1)}</span>
      ${p.company ? `<span class="project-card__company mono">${esc(p.company)}</span>` : ""}
    </div>
    <div class="project-card__body">
      <p class="eyebrow eyebrow--sm">${esc(p.category || "")}</p>
      <h3 class="project-card__title">${esc(p.name)}</h3>
      ${p.company ? `<p class="sr-only">Built at ${esc(p.company)}</p>` : ""}
      ${p.description ? `<p class="project-card__text">${esc(p.description)}</p>` : ""}
      ${stack ? `<div class="chips">${stack}</div>` : ""}
      ${p.link ? `<span class="project-card__more">View project →</span>` : ""}
    </div>
  </${tag}>
</div>`;
}

function renderProjects(type, cols = "col-md-6 col-lg-4") {
  const items = PROJECTS.filter((p) => p.type === type);
  if (!items.length) return `<p class="empty-note">// more projects coming soon</p>`;
  return items.map((p, i) => card(p, i, cols)).join("\n");
}

// ── Structured data (schema.org JSON-LD) ────────────────────────
function person(url) {
  return {
    "@type": "Person",
    "@id": `${url}/#person`,
    name: SITE.name,
    givenName: "Eihab",
    familyName: "Obeidat",
    jobTitle: SITE.jobTitle,
    description: SITE.description,
    url: `${url}/`,
    image: `${url}/og-image.jpg`,
    email: `mailto:${SITE.email}`,
    telephone: SITE.telephone,
    address: { "@type": "PostalAddress", addressLocality: SITE.city, addressCountry: SITE.country },
    worksFor: { "@type": "Organization", name: SITE.worksFor.name, url: SITE.worksFor.url },
    alumniOf: { "@type": "CollegeOrUniversity", name: SITE.alumniOf },
    hasOccupation: {
      "@type": "Occupation",
      name: SITE.jobTitle,
      skills: SITE.knowsAbout.join(", "),
    },
    knowsAbout: SITE.knowsAbout,
    knowsLanguage: SITE.languages,
    sameAs: SITE.sameAs,
  };
}

function itemList(url, type, pagePath) {
  const items = PROJECTS.filter((p) => p.type === type);
  return {
    "@type": "ItemList",
    "@id": `${url}${pagePath}#projects`,
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        ...(p.category ? { genre: p.category } : {}),
        ...(p.stack ? { keywords: p.stack.join(", ") } : {}),
        ...(p.link ? { url: p.link } : {}),
        creator: { "@id": `${url}/#person` },
      },
    })),
  };
}

function breadcrumbs(url, name, pagePath) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}${pagePath}#breadcrumbs`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${url}/` },
      { "@type": "ListItem", position: 2, name, item: `${url}${pagePath}` },
    ],
  };
}

function jsonLdFor(file) {
  const url = siteUrl();
  const website = {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url: `${url}/`,
    name: `${SITE.name} — ${SITE.jobTitle}`,
    inLanguage: "en",
    publisher: { "@id": `${url}/#person` },
  };
  const graph = [person(url), website];

  if (file === "index.html") {
    graph.push(
      {
        "@type": "ProfilePage",
        "@id": `${url}/#webpage`,
        url: `${url}/`,
        name: `${SITE.name} — ${SITE.jobTitle}`,
        isPartOf: { "@id": `${url}/#website` },
        mainEntity: { "@id": `${url}/#person` },
        about: { "@id": `${url}/#person` },
        inLanguage: "en",
      },
      itemList(url, "full-time", "/")
    );
  } else {
    const page = SITE.pages.find((p) => p.file === file);
    const pagePath = page ? page.path : `/${file}`;
    const name = page ? page.name : file;
    const isProjects = file === "part-time.html" || file === "freelance.html";
    graph.push(
      {
        "@type": isProjects ? "CollectionPage" : "WebPage",
        "@id": `${url}${pagePath}#webpage`,
        url: `${url}${pagePath}`,
        name: `${name} — ${SITE.name}`,
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": `${url}/#person` },
        author: { "@id": `${url}/#person` },
        breadcrumb: { "@id": `${url}${pagePath}#breadcrumbs` },
        ...(isProjects ? { mainEntity: { "@id": `${url}${pagePath}#projects` } } : {}),
        inLanguage: "en",
      },
      breadcrumbs(url, name, pagePath)
    );
    if (isProjects) graph.push(itemList(url, file.replace(".html", ""), pagePath));
  }

  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

// ── Static files ────────────────────────────────────────────────
function sitemap() {
  const url = siteUrl();
  const today = new Date().toISOString().slice(0, 10);
  const urls = SITE.pages
    .map(
      (p) =>
        `  <url>\n    <loc>${url}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl()}/sitemap.xml\n`;

const manifest = () =>
  JSON.stringify(
    {
      name: `${SITE.name} — ${SITE.jobTitle}`,
      short_name: "Eihab",
      description: SITE.description,
      start_url: "/",
      display: "standalone",
      background_color: "#05070d",
      theme_color: "#05070d",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  );

class SeoPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("SeoPlugin", (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap("SeoPlugin", (data) => {
        const file = path.basename(data.outputName);
        let html = data.html;

        // Project cards: <div data-projects="part-time" data-cols="..."></div>
        html = html.replace(
          /(<div\b[^>]*?data-projects=["']?([\w-]+)["']?[^>]*>)\s*(<\/div>)/g,
          (m, open, type, close) => {
            const colsMatch = open.match(/data-cols=["']?([^"'>]+?)["']?(?=\s|>)/);
            return `${open}${renderProjects(type, colsMatch ? colsMatch[1] : undefined)}${close}`;
          }
        );

        // Years of experience (the page script also keeps this live in the browser)
        html = html.replace(/(<span\s+data-years[^>]*>)\d+(<\/span>)/g, `$1${yearsOfExperience()}$2`);

        html = html.split("__YEARS__").join(String(yearsOfExperience()));

        // Absolute URLs
        html = html.split(PLACEHOLDER).join(siteUrl());

        // Structured data
        html = html.replace("</head>", `${jsonLdFor(file)}</head>`);

        data.html = html;
        return data;
      });

      compilation.hooks.processAssets.tap(
        { name: "SeoPlugin", stage: compilation.constructor.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          compilation.emitAsset("robots.txt", new sources.RawSource(robots()));
          compilation.emitAsset("sitemap.xml", new sources.RawSource(sitemap()));
          compilation.emitAsset("site.webmanifest", new sources.RawSource(manifest()));
          if (fs.existsSync(STATIC_DIR)) {
            for (const f of fs.readdirSync(STATIC_DIR)) {
              compilation.emitAsset(f, new sources.RawSource(fs.readFileSync(path.join(STATIC_DIR, f))));
            }
          }
        }
      );
    });
  }
}

module.exports = SeoPlugin;
