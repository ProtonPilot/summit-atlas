import {
  createDetailUrl,
  formatAnnualSnowfall,
  formatDate,
  formatPassAccess,
  formatSnowDepth,
  getContinentColor,
  getResortById
} from "./resorts-api.js";

const root = document.getElementById("resort-detail-root");
const params = new URLSearchParams(window.location.search);
const resortId = params.get("id");
const resort = resortId ? getResortById(resortId) : null;

if (!resort) {
  root.innerHTML = `
    <section class="empty-state">
      <p class="eyebrow">Resort not found</p>
      <h1>That mountain is not in the current directory.</h1>
      <p>
        The link may be incomplete, or the resort has not been added to this static
        dataset yet. Jump back to the globe to pick another destination.
      </p>
      <a class="button-link" href="./index.html">Back to Summit Atlas</a>
    </section>
  `;
} else {
  document.title = `${resort.name} | Summit Atlas`;
  root.className = "detail-layout";
  root.innerHTML = `
    <section class="detail-panel">
      <div class="detail-hero">
        <p class="eyebrow">${resort.continent} mountain profile</p>
        <h1>${resort.name}</h1>
        <p class="detail-copy">${resort.summary}</p>
        <div class="hero-badges">
          <span class="badge">${resort.region}, ${resort.country}</span>
          <span class="badge">${formatPassAccess(resort.passes)} access</span>
          <span class="badge">${resort.size}</span>
          <span class="badge">Peak elevation ${resort.elevationMeters.toLocaleString()} m</span>
        </div>
      </div>

      <div class="stat-grid">
        <article class="stat-card"><span class="stat-label">Current base depth</span><strong>${formatSnowDepth(resort.snow.currentDepthBase)}</strong></article>
        <article class="stat-card"><span class="stat-label">Current summit depth</span><strong>${formatSnowDepth(resort.snow.currentDepthSummit)}</strong></article>
        <article class="stat-card"><span class="stat-label">Annual snowfall</span><strong>${formatAnnualSnowfall(resort.snow.averageAnnualSnowfall)}</strong></article>
        <article class="stat-card"><span class="stat-label">Snowiest month</span><strong>${resort.snow.highestHistoricalMonth}</strong></article>
        <article class="stat-card"><span class="stat-label">Snow record updated</span><strong>${formatDate(resort.snow.lastUpdated)}</strong></article>
      </div>

      <section class="detail-section">
        <p class="eyebrow">Mountain read</p>
        <h2>Snow context</h2>
        <p>
          ${resort.notes}
          The current snow fields in this first release are structured so we can swap
          in live reporting later without changing the page design.
        </p>
        <p>Annual snowfall is shown only when we have a trusted resort-specific figure. If we do not have one yet, the site will say so rather than show a weak estimate.</p>
        <p>This month label is intended to mean the strongest monthly snowfall signal, not the month with the deepest accumulated base.</p>
        <p>Current snow source: <strong>${resort.snow.currentSnowSource || "Model estimate"}</strong></p>
        ${resort.snow.averageAnnualSnowfallSource ? `<p>Annual snowfall source: <strong>${resort.snow.averageAnnualSnowfallSource}</strong></p>` : ""}
      </section>

      <section class="detail-section">
        <p class="eyebrow">Recent photo sources</p>
        <h2>Curated visual jump-off points</h2>
        <div class="photo-grid">
          ${resort.photos.map((photo) => `
            <a class="photo-card" href="${photo.href}" target="_blank" rel="noreferrer noopener" data-mark="${photo.mark}">
              <span class="eyebrow">External source</span>
              <h3>${photo.title}</h3>
              <p>${photo.caption}</p>
            </a>
          `).join("")}
        </div>
      </section>
    </section>

    <aside class="detail-panel">
      <section class="detail-section">
        <p class="eyebrow">Resort links</p>
        <h2>Open the live sources</h2>
        <div class="detail-links">
          <a class="detail-link" href="${resort.links.official}" target="_blank" rel="noreferrer noopener"><span>Official resort</span><strong>Visit main site</strong></a>
          <a class="detail-link" href="${resort.links.snowReport}" target="_blank" rel="noreferrer noopener"><span>Snow source</span><strong>Open snow report</strong></a>
          <div class="detail-link"><span>Coordinates</span><strong>${resort.lat.toFixed(3)}, ${resort.lng.toFixed(3)}</strong></div>
          <div class="detail-link"><span>Region color</span><strong><span class="continent-dot" style="background:${getContinentColor(resort.continent)}"></span>${resort.continent}</strong></div>
        </div>
      </section>

      <section class="detail-section">
        <p class="eyebrow">Explorer flow</p>
        <h2>Keep moving</h2>
        <p>
          Use the main globe to compare mountain personalities across continents, then
          open detail pages like this one in separate tabs when a resort deserves a closer look.
        </p>
        <a class="button-link" href="./index.html">Return to the globe</a>
        <a class="button-link" href="${createDetailUrl(resort.id)}">Copyable resort URL</a>
      </section>
    </aside>
  `;
}
