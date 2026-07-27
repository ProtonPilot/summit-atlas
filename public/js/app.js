import {
  createDetailUrl,
  formatAnnualSnowfall,
  formatDate,
  formatPassAccess,
  formatSnowDepth,
  getAllResorts,
  getContinentColor,
  getFeaturedResorts,
  getPassColor,
  getSummaryStatsForResorts,
  filterResortsByPass,
  searchResorts
} from "./resorts-api.js";

const GlobeFactory = window.Globe;
const THREE = window.THREE;
const globeElement = document.getElementById("globe");
const popupCard = document.getElementById("popup-card");
const popupContent = document.getElementById("popup-content");
const popupClose = document.getElementById("popup-close");
const searchInput = document.getElementById("resort-search");
const searchResults = document.getElementById("search-results");
const featuredList = document.getElementById("featured-list");
const summaryChips = document.getElementById("summary-chips");
const passLegend = document.getElementById("pass-legend");
const passFilter = document.getElementById("pass-filter");
const rotationToggle = document.getElementById("rotation-toggle");
const zoomSlider = document.getElementById("zoom-slider");
const topojson = window.topojson;
const COUNTRY_BORDERS_URL = "https://unpkg.com/world-atlas@2/countries-110m.json";

const resorts = getAllResorts();

let selectedResortId = resorts[0]?.id ?? null;
let globe = null;
let isAutoRotating = false;
let controls = null;
let currentMarkerZoomBand = "far";
let borderGroup = null;
let activePassFilter = "all";
let visibleResorts = getVisibleResorts();

if (!GlobeFactory || !THREE) {
  globeElement.innerHTML = "<p class='detail-copy'>The globe library could not be loaded.</p>";
} else {
  initialize();
}

function initialize() {
  visibleResorts = getVisibleResorts();
  updatePassFilterCounts();
  renderSummary();
  renderPassLegend();
  renderFeatured();
  renderSearchResults(searchResorts("", 7, visibleResorts));
  buildGlobe();
  loadCountryBorders();
  syncRotationState();
  attachEvents();
  selectResortById(selectedResortId, true);
}

function buildGlobe() {
  globe = GlobeFactory()(globeElement);

  globe
    .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereColor("#7be1ff")
    .atmosphereAltitude(0.18)
    .ringsData(resorts.filter((resort) => resort.id === selectedResortId))
    .ringLat("lat")
    .ringLng("lng")
    .ringColor(() => ["rgba(123,225,255,0.5)", "rgba(123,225,255,0.06)"])
    .ringMaxRadius(6)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1500)
    .objectsData([...visibleResorts])
    .objectLat("lat")
    .objectLng("lng")
    .objectAltitude((resort) => resort.id === selectedResortId ? 0.08 : 0.06)
    .objectFacesSurface(true)
    .objectThreeObject((resort) => createMarkerObject(resort))
    .objectLabel((resort) => `
      <div class="canvas-tooltip" style="padding:10px 12px;border-radius:14px;background:rgba(4,14,22,0.92);border:1px solid rgba(123,225,255,0.18);color:#eef8ff;">
        <strong>${resort.name}</strong>
        <div style="margin-top:4px;color:#a7bdce;">${resort.region}, ${resort.country}</div>
        <div style="margin-top:6px;color:#d8f5ff;">Annual snowfall: ${formatAnnualSnowfall(resort.snow.averageAnnualSnowfall)}</div>
        <div style="margin-top:6px;color:#7be1ff;">Snowiest month: ${resort.snow.highestHistoricalMonth}</div>
      </div>
    `)
    .onObjectClick((resort) => {
      selectResortById(resort.id);
    })
    .onObjectHover((resort) => {
      globeElement.style.cursor = resort ? "pointer" : "grab";
    });

  controls = globe.controls();
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.42;
  controls.enablePan = false;
  controls.minDistance = 130;
  controls.maxDistance = 500;
  controls.addEventListener("change", handleControlChange);

  addSceneLighting();

  globe.pointOfView({ lat: 18, lng: 12, altitude: 2.35 }, 0);
  currentMarkerZoomBand = getMarkerZoomBand();
  syncZoomSliderFromControls();

  resizeGlobe();
  window.addEventListener("resize", resizeGlobe);
}

function resizeGlobe() {
  if (!globe) return;
  globe.width(globeElement.clientWidth);
  globe.height(globeElement.clientHeight);
}

function addSceneLighting() {
  if (!globe || !THREE) return;

  const scene = globe.scene();
  const ambientLight = new THREE.AmbientLight("#9ed8ff", 1.15);
  const keyLight = new THREE.DirectionalLight("#d9f3ff", 1.6);
  const fillLight = new THREE.DirectionalLight("#7fc8ff", 0.55);

  ambientLight.name = "summit-atlas-ambient";
  keyLight.name = "summit-atlas-key";
  fillLight.name = "summit-atlas-fill";

  keyLight.position.set(220, 140, 260);
  fillLight.position.set(-180, -60, -120);

  scene.add(ambientLight);
  scene.add(keyLight);
  scene.add(fillLight);
}

async function loadCountryBorders() {
  if (!globe || !THREE || !topojson) return;

  try {
    const response = await fetch(COUNTRY_BORDERS_URL);
    if (!response.ok) {
      throw new Error(`Border dataset request failed with ${response.status}`);
    }

    const topology = await response.json();
    const borderMesh = topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b);
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
      color: "#f8fdff",
      transparent: true,
      opacity: 0.88
    });

    borderMesh.coordinates.forEach((lineCoords) => {
      const points = lineCoords.map(([lng, lat]) => {
        const point = globe.getCoords(lat, lng, 0.006);
        return new THREE.Vector3(point.x, point.y, point.z);
      });

      if (points.length < 2) return;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      group.add(line);
    });

    if (borderGroup) {
      globe.scene().remove(borderGroup);
    }

    borderGroup = group;
    globe.scene().add(borderGroup);
  } catch (error) {
    console.warn("Country borders could not be loaded.", error);
  }
}

function renderSummary() {
  const stats = getSummaryStatsForResorts(visibleResorts);
  summaryChips.innerHTML = "";
  [
    `${visibleResorts.length} resorts`,
    `${stats.totalCountries} countries`,
    `Updated ${formatDate(stats.latestUpdate)}`
  ].forEach((label) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = label;
    summaryChips.appendChild(chip);
  });
}

function renderPassLegend() {
  if (!passLegend) return;
  const items = [
    { label: "Ikon", color: getPassColor(["ikon"]) },
    { label: "Epic", color: getPassColor(["epic"]) },
    { label: "Independent", color: getPassColor([]) }
  ];

  passLegend.innerHTML = items.map((item) => `
    <span class="legend-chip">
      <span class="legend-dot" style="background:${item.color}"></span>${item.label}
    </span>
  `).join("");
}

function renderFeatured() {
  featuredList.innerHTML = "";
  getFeaturedResorts(6, visibleResorts).forEach((resort) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "featured-card resort-item";
    button.innerHTML = `
      <strong>${resort.name}</strong>
      <span class="featured-meta">${resort.region}, ${resort.country}</span>
      <span class="snow-pill">Summit depth ${formatSnowDepth(resort.snow.currentDepthSummit)}</span>
    `;
    button.addEventListener("click", () => selectResortById(resort.id));
    featuredList.appendChild(button);
  });
}

function renderSearchResults(items) {
  searchResults.innerHTML = "";
  if (!items.length) {
    searchResults.innerHTML = "<div class='item-meta'>No resorts matched that search.</div>";
    return;
  }

  items.forEach((resort) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "resort-item";
    button.innerHTML = `
      <strong>${resort.name}</strong>
      <span class="item-meta"><span class="continent-dot" style="background:${getContinentColor(resort.continent)}"></span>${resort.region}, ${resort.country}</span>
    `;
    button.addEventListener("click", () => selectResortById(resort.id));
    searchResults.appendChild(button);
  });
}

function attachEvents() {
  popupClose.addEventListener("click", () => {
    popupCard.classList.add("is-hidden");
    selectedResortId = null;
    refreshGlobeSelection();
  });

  searchInput.addEventListener("input", () => {
    renderSearchResults(searchResorts(searchInput.value));
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const firstResult = searchResorts(searchInput.value, 1, visibleResorts)[0];
    if (firstResult) selectResortById(firstResult.id);
  });

  passFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pass-filter]");
    if (!button) return;

    activePassFilter = button.dataset.passFilter;
    visibleResorts = getVisibleResorts();
    updatePassFilterUi();
    updatePassFilterCounts();
    renderSummary();
    renderFeatured();
    renderSearchResults(searchResorts(searchInput.value, 7, visibleResorts));

    const visibleResortIds = new Set(visibleResorts.map((resort) => resort.id));
    if (!visibleResortIds.has(selectedResortId)) {
      selectedResortId = visibleResorts[0]?.id ?? null;
      if (selectedResortId) {
        selectResortById(selectedResortId, true);
      } else {
        popupCard.classList.add("is-hidden");
        refreshGlobeSelection();
      }
    } else {
      refreshGlobeSelection();
    }
  });

  rotationToggle.addEventListener("click", () => {
    isAutoRotating = !isAutoRotating;
    syncRotationState();
  });

  zoomSlider.addEventListener("input", () => {
    if (!controls) return;
    controls.object.position.setLength(Number(zoomSlider.value));
    controls.update();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") popupCard.classList.add("is-hidden");
  });
}

function selectResortById(id, immediate = false) {
  const resort = resorts.find((entry) => entry.id === id);
  if (!resort) return;

  selectedResortId = id;
  popupCard.classList.remove("is-hidden");
  popupContent.innerHTML = `
    <p class="eyebrow">Selected resort</p>
    <h2>${resort.name}</h2>
    <p class="lede">${resort.region}, ${resort.country}</p>
    <p class="pass-copy">Pass access: <strong>${formatPassAccess(resort.passes)}</strong></p>
    <div class="popup-stats">
      <div class="popup-stat"><span class="popup-micro">Base depth</span><strong>${formatSnowDepth(resort.snow.currentDepthBase)}</strong></div>
      <div class="popup-stat"><span class="popup-micro">Summit depth</span><strong>${formatSnowDepth(resort.snow.currentDepthSummit)}</strong></div>
      <div class="popup-stat"><span class="popup-micro">Annual snowfall</span><strong>${formatAnnualSnowfall(resort.snow.averageAnnualSnowfall)}</strong></div>
      <div class="popup-stat"><span class="popup-micro">Snowiest month</span><strong>${resort.snow.highestHistoricalMonth}</strong></div>
      <div class="popup-stat"><span class="popup-micro">Last updated</span><strong>${formatDate(resort.snow.lastUpdated)}</strong></div>
    </div>
    <p class="pass-copy">Snow source: <strong>${resort.snow.currentSnowSource || "Model estimate"}</strong></p>
    ${resort.snow.averageAnnualSnowfallSource ? `<p class="pass-copy">Annual snowfall source: <strong>${resort.snow.averageAnnualSnowfallSource}</strong></p>` : ""}
    <p class="detail-copy">${resort.summary}</p>
    <a class="button-link" href="${createDetailUrl(resort.id)}" target="_blank" rel="noreferrer noopener">Open resort page</a>
  `;

  if (globe) {
    const currentView = globe.pointOfView();
    globe.pointOfView(
      {
        lat: resort.lat,
        lng: resort.lng,
        altitude: currentView?.altitude ?? 2.45
      },
      immediate ? 0 : 1200
    );
  }

  refreshGlobeSelection();
}

function refreshGlobeSelection() {
  if (!globe) return;
  globe
    .ringsData(visibleResorts.filter((resort) => resort.id === selectedResortId))
    .objectsData([]);

  globe
    .objectsData([...visibleResorts]);
}

function handleControlChange() {
  syncZoomSliderFromControls();

  const nextBand = getMarkerZoomBand();
  if (nextBand !== currentMarkerZoomBand) {
    currentMarkerZoomBand = nextBand;
    refreshGlobeSelection();
  }
}

function syncRotationState() {
  rotationToggle.setAttribute("aria-pressed", String(isAutoRotating));
  rotationToggle.textContent = isAutoRotating ? "Stop rotation" : "Start rotation";

  if (globe) {
    globe.controls().autoRotate = isAutoRotating;
  }
}

function syncZoomSliderFromControls() {
  if (!controls || !zoomSlider) return;
  const distance = controls.getDistance ? controls.getDistance() : controls.object.position.length();
  zoomSlider.value = String(Math.round(distance));
}

function getVisibleResorts() {
  return filterResortsByPass(resorts, activePassFilter);
}

function updatePassFilterUi() {
  passFilter.querySelectorAll("[data-pass-filter]").forEach((button) => {
    const isActive = button.dataset.passFilter === activePassFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updatePassFilterCounts() {
  const counts = {
    all: resorts.length,
    ikon: filterResortsByPass(resorts, "ikon").length,
    epic: filterResortsByPass(resorts, "epic").length,
    independent: filterResortsByPass(resorts, "independent").length
  };

  passFilter.querySelectorAll("[data-pass-count]").forEach((element) => {
    const key = element.dataset.passCount;
    element.textContent = String(counts[key] ?? 0);
  });
}

function getMarkerZoomBand() {
  if (!controls) return "far";
  const distance = controls.getDistance ? controls.getDistance() : controls.object.position.length();
  if (distance <= 195) return "near";
  if (distance <= 320) return "mid";
  return "far";
}

function getMarkerAltitude(resort) {
  return resort.id === selectedResortId ? 0.18 : 0.11;
}

function getMarkerRadius(resort) {
  return resort.id === selectedResortId ? 0.56 : 0.36;
}

function createMarkerCap(resort) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `resort-cap${resort.id === selectedResortId ? " is-selected" : ""}`;
  button.title = `${resort.name} — ${resort.region}, ${resort.country}`;
  button.setAttribute("aria-label", `Open ${resort.name}`);
  button.addEventListener("mouseenter", () => {
    globeElement.style.cursor = "pointer";
  });
  button.addEventListener("mouseleave", () => {
    globeElement.style.cursor = "grab";
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    selectResortById(resort.id);
  });
  return button;
}

function createMarkerObject(resort) {
  const isSelected = resort.id === selectedResortId;
  const zoomBand = currentMarkerZoomBand;
  const markerColor = getPassColor(resort.passes);
  const markerProfile = getMarkerProfile(isSelected, zoomBand);

  const group = new THREE.Group();

  const visibleStem = new THREE.Mesh(
    new THREE.CylinderGeometry(markerProfile.visibleRadius, markerProfile.visibleRadius, markerProfile.height, 10),
    new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: markerProfile.opacity
    })
  );
  visibleStem.rotation.x = Math.PI / 2;
  visibleStem.position.z = markerProfile.height / 2;

  const hitStem = new THREE.Mesh(
    new THREE.CylinderGeometry(markerProfile.hitRadius, markerProfile.hitRadius, markerProfile.height, 10),
    new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: true,
      opacity: 0
    })
  );
  hitStem.rotation.x = Math.PI / 2;
  hitStem.position.z = markerProfile.height / 2;

  group.add(hitStem);
  group.add(visibleStem);
  return group;
}

function getMarkerProfile(isSelected, zoomBand) {
  if (zoomBand === "near") {
    return isSelected
      ? { height: 6.5, visibleRadius: 0.08, hitRadius: 0.52, opacity: 0.98 }
      : { height: 4.2, visibleRadius: 0.045, hitRadius: 0.4, opacity: 0.88 };
  }

  if (zoomBand === "mid") {
    return isSelected
      ? { height: 8.5, visibleRadius: 0.1, hitRadius: 0.56, opacity: 0.98 }
      : { height: 5.8, visibleRadius: 0.06, hitRadius: 0.44, opacity: 0.9 };
  }

  return isSelected
    ? { height: 11.5, visibleRadius: 0.15, hitRadius: 0.72, opacity: 0.98 }
    : { height: 8.2, visibleRadius: 0.1, hitRadius: 0.58, opacity: 0.9 };
}
