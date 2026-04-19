// OS-Erkennung
function getOS() {
    const ua = navigator.userAgent;
    if (/Windows NT/i.test(ua)) return "windows";
    if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
    if (/Linux/i.test(ua)) return "linux";
    if (/Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iOS/i.test(ua)) return "ios";
    return "unknown";
}
document.documentElement.setAttribute("data-os", getOS());

// --------------------------------------------
// Karte initialisieren
// --------------------------------------------
const map = L.map("map").setView([49.8913, 10.8860], 14);

const baseLayers = {
    "osm": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
    "carto-light": L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"),
    "carto-dark": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"),
    "stadia-outdoors": L.tileLayer("https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 20,
        attribution:
            '&copy; <a href="https://www.stadiamaps.com/">Stadia Maps</a>, ' +
            '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
            '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }
)

};

let currentLayer = baseLayers["stadia-outdoors"];
currentLayer.addTo(map);

// Wechsel des Basemaps
document.getElementById("basemap-select").addEventListener("change", (e) => {
    map.removeLayer(currentLayer);
    currentLayer = baseLayers[e.target.value];
    currentLayer.addTo(map);
});

// --------------------------------------------
// Stadtgrenze
// --------------------------------------------
const bambergBoundary = [
    [49.918, 10.835], [49.915, 10.87], [49.909, 10.905],
    [49.900, 10.930], [49.885, 10.930], [49.870, 10.915],
    [49.865, 10.890], [49.865, 10.860], [49.875, 10.835],
    [49.895, 10.820], [49.910, 10.820]
];

L.polygon(bambergBoundary, {
    color: "#ef4444",
    weight: 2.2,
    fill: false,
    dashArray: "8,6"
}).addTo(map);

// --------------------------------------------
// Farben & Icons
// --------------------------------------------
const COLOR = {
    s: "#2563eb",       // Sehenswürdigkeiten
    m: "#7c3aed",       // Museen
    e: "#dc2626",       // Essen
    n: "#16a34a",       //Natur
    sh: "#d97706",      // Shops

    br: "#bbae25",      // Brauereien
    au: "#5b5a5e",      // Aussichtspunkte
    ki: "#7f1d1d",      // Kirchen
    gt: "#ff00c3",      // Geheimtipps
    ti: "#047857"       // Tiere & Beobachtung
};

function pinIcon(hex) {
    return L.divIcon({
        html: `<div class="poi-pin" style="--pin-color:${hex}"></div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
}

function favoriteIcon() {
    return L.divIcon({
        html: `<div class="poi-pin" style="--pin-color:#facc15;transform:scale(1.3) rotate(-45deg)"></div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
}

// --------------------------------------------
// Layer Groups
// --------------------------------------------
const LAYER = {
    s: L.layerGroup().addTo(map),
    m: L.layerGroup().addTo(map),
    e: L.layerGroup().addTo(map),
    n: L.layerGroup().addTo(map),
    sh: L.layerGroup().addTo(map),

    br: L.layerGroup().addTo(map),
    au: L.layerGroup().addTo(map),
    ki: L.layerGroup().addTo(map),
    gt: L.layerGroup().addTo(map),
    ti: L.layerGroup().addTo(map)
};

const FAVORITES_LAYER = L.layerGroup().addTo(map);

// --------------------------------------------
// Favoriten
// --------------------------------------------
function isFavorite(name) {
    return JSON.parse(localStorage.getItem("favorites") || "[]")
        .some(f => f.name === name);
}

function popupHTML(p) {
    const isFav = isFavorite(p.name);

    return `
        ${p.img || ""}
        <div class="poi-title">${p.name}</div>
        ${p.link ? `<a class="poi-link" href="${p.link}" target="_blank">Mehr erfahren</a><br>` : ""}
        <button class="fav-btn" data-name="${p.name}">
            ${isFav ? "⭐ Entfernen" : "⭐ Favorit speichern"}
        </button>
    `;
}

function toggleFavorite(poi) {
    let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
    const exists = favs.find(f => f.name === poi.name);

    if (exists) {
        favs = favs.filter(f => f.name !== poi.name);
    } else {
        favs.push(poi);
    }

    localStorage.setItem("favorites", JSON.stringify(favs));
    renderFavorites();
    showFavoriteMarkers();
}

// --------------------------------------------
// Marker hinzufügen
// --------------------------------------------
const ALL = [];

function addMarker({ lat, lng, name, catKey, link, img, group }) {
    const marker = L.marker([lat, lng], {
        icon: pinIcon(COLOR[catKey])
    })
        .addTo(group)
        .bindTooltip(name, {
            direction: "top",
            className: "poi-tooltip",
            offset: [0, -20],
            sticky: true
        })
        .bindPopup(
            popupHTML({ name, link, img, lat, lng, catKey }),
            { poiData: { name, link, img, lat, lng, catKey } }
        );

    ALL.push({ name, lat, lng, cat: catKey, marker, group });

    marker.on("popupopen", () => {
    const btn = document.querySelector(".fav-btn");

    if (!btn) return;

    btn.addEventListener("click", () => {
        toggleFavorite({
            name,
            lat,
            lng,
            link,
            img
        });

        // Button-Text sofort aktualisieren
        const nowFav = isFavorite(name);
        btn.textContent = nowFav ? "⭐ Entfernen" : "⭐ Favorit speichern";
        });
    });
}

// --------------------------------------------
// POIs
// --------------------------------------------
const POIS = {
    sehenswuerdigkeiten: [
        { name: "Bamberger Dom", lat: 49.89083, lng: 10.88250, link: "https://de.wikipedia.org/wiki/Bamberger_Dom" },
        { name: "Altes Rathaus", lat: 49.89167, lng: 10.88694, link: "https://de.wikipedia.org/wiki/Altes_Rathaus_(Bamberg)" },
        { name: "Neue Residenz", lat: 49.89167, lng: 10.88127, link: "https://de.wikipedia.org/wiki/Neue_Residenz_(Bamberg)" },
        { name: "Kloster Michelsberg", lat: 49.89361, lng: 10.87722, link: "https://de.wikipedia.org/wiki/Kloster_Michaelsberg_(Bamberg)" }
    ],
    museen: [
        { name: "Historisches Museum", lat: 49.89090, lng: 10.88200, link: "https://museum.bamberg.de/" },
        { name: "E.T.A.-Hoffmann-Haus", lat: 49.889912, lng: 10.890881, link: "https://etahoffmann.stadt.bamberg.de/" }
    ],
    essen: [
        { name: "Little Italy", lat: 49.890124, lng: 10.884990, link: "https://www.little-italy-bamberg.de/" },
        { name: "Cafe Krumm & Schief", lat: 49.893680, lng: 10.885581, link: "https://www.krumm-und-schief.de/" }
    ],
    natur: [
        { name: "ERBA-Park", lat: 49.894218, lng: 10.885527, link: "https://www.bamberg.info/poi/der_erba_park-ehemaliges_gelae-5022/" },
        { name: "Hainpark", lat: 49.87806, lng: 10.90333, link: "https://www.bamberg.info/poi/stadtpark_hain-5025/" }
    ],
    shops: [
        { name: "H&M Bamberg", lat: 49.89376, lng: 10.88928, link: "https://www2.hm.com/de_de/index.html" },
        { name: "Müller Drogerie", lat: 49.894241, lng: 10.890557, link: "https://www.mueller.de/" },
        { name: "TK Maxx", lat: 49.91165, lng: 10.87514, link: "https://www.tkmaxx.com/de/de/" },
        { name: "EDEKA", lat: 49.88805, lng: 10.89664, link: "https://www.edeka.de/" }
    ],
    brauereien: [
        { name: "Schlenkerla", lat: 49.89195, lng: 10.88486, link: "https://www.schlenkerla.de/" },
        { name: "Spezial-Keller", lat: 49.88480, lng: 10.88717, link: "https://www.brauerei-spezial.de/" },
        { name: "Klosterbräu", lat: 49.88928, lng: 10.88713, link: "https://klosterbraeu.de/" },
        { name: "Greifenklau", lat: 49.88358, lng: 10.88194, link: "https://www.greifenklau.de/" },
        { name: "Fässla", lat: 49.89713, lng: 10.89279, link: "https://www.faessla.de/" },
        { name: "Keesmann", lat: 49.89261, lng: 10.91283, link: "https://www.bamberg.info/gastronomie/brauerei_keesmann-253/" },
        { name: "Mahr’s Bräu", lat: 49.88993, lng: 10.90668, link: "https://www.mahrs.de/" },
        { name: "Maisel", lat: 49.89261, lng: 10.91283, link: "https://bamberger-brauereien.de/maisel/" }
    ],
    aussicht: [
        { name: "Altenburg", lat: 49.88051, lng: 10.86922, link: "https://www.bamberg.info/poi/altenburg-4647/" },
        { name: "Michaelsberg Aussicht", lat: 49.89361, lng: 10.87722, link: "https://www.visitbamberg.com/poi/aussichtspunkt-michaelsberg/" },
        { name: "Stephansberg Aussicht", lat: 49.88810, lng: 10.88670, link: "https://www.bamberg.info/poi/stephansberg-4649/" },
        { name: "Kaulberg Aussicht", lat: 49.88921, lng: 10.88382, link: "https://www.bamberg.info/poi/jugendgaestehaus_am_kaulberg-7535/" },
        { name: "Gärtnerstadt Aussichtspunkt", lat: 49.89422, lng: 10.88553, link: "https://www.bamberg.info/poi/die_gaertnerstadt-5023/" }
    ],
    kirchen: [
        { name: "St. Jakob", lat: 49.89102, lng: 10.87718, link: "https://www.bamberg.info/poi/st_jakob-4640/" },
        { name: "Obere Pfarre", lat: 49.88935, lng: 10.88442, link: "https://www.bamberg.info/poi/obere_pfarre-4645/" },
        { name: "St. Martin", lat: 49.89361, lng: 10.88670, link: "https://www.bamberg.info/poi/st_martin-4644/" },
        { name: "St. Gangolf", lat: 49.89728, lng: 10.89663, link: "https://www.bamberg.info/poi/st_gangolf-4641/" }
    ],
    tipps: [
        { name: "Villa Remeis", lat: 49.8914452, lng: 10.8710327, link: "https://www.bamberg.info/poi/villa_remeis-4658/" },
        { name: "Klein Venedig", lat: 49.893333, lng: 10.884167, link: "https://www.bamberg.info/poi/klein_venedig-4650/" },
        { name: "Schleuse 100", lat: 49.9065967, lng: 10.8681972, link: "https://www.bamberg.info/poi/schleuse_100-17530/" }
    ],
    tiere: [
        { name: "Tiergehege Troppauplatz", lat: 49.90662545, lng: 10.90779690, link: "https://www.bamberg.info/poi/troppauplatz-4831/" },
        { name: "Hain Teich – Enten", lat: 49.879696, lng: 10.902800, link: "https://www.bamberg.info/poi/stadtpark_hain-5025/" },
        { name: "ERBA-Auen – Wildtiere", lat: 49.8942184, lng: 10.8855267 }
    ]
};

// Rendern
function renderCategory(list, key, layer) {
    list.forEach(p => addMarker({ ...p, catKey: key, group: layer }));
}

renderCategory(POIS.sehenswuerdigkeiten, "s", LAYER.s);
renderCategory(POIS.museen, "m", LAYER.m);
renderCategory(POIS.essen, "e", LAYER.e);
renderCategory(POIS.natur, "n", LAYER.n);
renderCategory(POIS.shops, "sh", LAYER.sh);

renderCategory(POIS.brauereien, "br", LAYER.br);
renderCategory(POIS.aussicht, "au", LAYER.au);
renderCategory(POIS.kirchen, "ki", LAYER.ki);
renderCategory(POIS.tipps, "gt", LAYER.gt);
renderCategory(POIS.tiere, "ti", LAYER.ti);

// --------------------------------------------
// Kategorien ein/aus
// --------------------------------------------
document.getElementById("toggle-sehenswuerdigkeiten").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.s) : map.removeLayer(LAYER.s)
);
document.getElementById("toggle-museen").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.m) : map.removeLayer(LAYER.m)
);
document.getElementById("toggle-essen").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.e) : map.removeLayer(LAYER.e)
);
document.getElementById("toggle-natur").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.n) : map.removeLayer(LAYER.n)
);
document.getElementById("toggle-shops").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.sh) : map.removeLayer(LAYER.sh)
);
document.getElementById("toggle-brauereien").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.br) : map.removeLayer(LAYER.br)
);
document.getElementById("toggle-aussicht").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.au) : map.removeLayer(LAYER.au)
);
document.getElementById("toggle-kirchen").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.ki) : map.removeLayer(LAYER.ki)
);
document.getElementById("toggle-tipps").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.gt) : map.removeLayer(LAYER.gt)
);
document.getElementById("toggle-tiere").addEventListener("change", e =>
    e.target.checked ? map.addLayer(LAYER.ti) : map.removeLayer(LAYER.ti)
);

// Favoriten einblenden/ausblenden

const favToggle = document.getElementById("toggle-favorites");
const favText = document.getElementById("favorites-text");

favToggle.addEventListener("change", () => {
    if (favToggle.checked) {
        showFavoriteMarkers();
        map.addLayer(FAVORITES_LAYER);
        favText.textContent = "Favoriten ausblenden";
    } else {
        map.removeLayer(FAVORITES_LAYER);
        favText.textContent = "Favoriten einblenden";
    }
});

// --------------------------------------------
// Suche
// --------------------------------------------
const input = document.getElementById("search-input");
const btn = document.getElementById("search-btn");
const results = document.getElementById("search-results");

function blink(marker) {
    const pin = marker._icon?.querySelector(".poi-pin");
    if (!pin) return;
    pin.classList.add("highlight");
    setTimeout(() => pin.classList.remove("highlight"), 600);
}

function search(q) {
    const list = ALL.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

    if (!list.length) {
        results.style.display = "none";
        return;
    }

    results.style.display = "block";
    results.innerHTML = list.map((p, i) =>
        `<li data-i="${i}">${p.name}</li>`
    ).join("");

    [...results.children].forEach((li, i) => {
        li.addEventListener("click", () => {
            const poi = list[i];
            map.setView([poi.lat, poi.lng], 17);
            poi.marker.openPopup();
            blink(poi.marker);
            results.style.display = "none";
        });
    });
}

btn.addEventListener("click", () => search(input.value));
input.addEventListener("keydown", e => {
    if (e.key === "Enter") search(input.value);
});
input.addEventListener("input", () => search(input.value));

document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
        results.style.display = "none";
    }
});

// --------------------------------------------
// Sidebar
// --------------------------------------------
const toggleBtn = document.getElementById("sidebar-toggle");
const sidebar = document.getElementById("sidebar");

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 350);
});

// --------------------------------------------
// Favoriten-Render
// --------------------------------------------
function renderFavorites() {
    const list = document.getElementById("favorites-list");
    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");

    if (!list) return;

    list.innerHTML = favs.map(f => `<li>${f.name}</li>`).join("");
}

renderFavorites();
function showFavoriteMarkers() {

    // nur anzeigen, wenn der Toggle aktiv ist
    const favToggle = document.getElementById("toggle-favorites");
    if (!favToggle.checked) {
        FAVORITES_LAYER.clearLayers();
        return;
    }

    FAVORITES_LAYER.clearLayers();

    const favs = JSON.parse(localStorage.getItem("favorites") || "[]");

    favs.forEach(f => {

        // gleichen Popup-Content verwenden
        const popup = popupHTML(f);

        const marker = L.marker([f.lat, f.lng], {
            icon: favoriteIcon()
        })
        .addTo(FAVORITES_LAYER)
        .bindPopup(popup, { poiData: f });

        // Favoriten-Button auch hier aktiv machen
        marker.on("popupopen", () => {
            const btn = document.querySelector(".fav-btn");
            if (!btn) return;

            btn.addEventListener("click", () => {
                toggleFavorite(f);

                // Button sofort aktualisieren
                const nowFav = isFavorite(f.name);
                btn.textContent = nowFav ? "⭐ Entfernen" : "⭐ Favorit speichern";

                // Favoriten-Marker aktualisieren
                showFavoriteMarkers();
            });
        });
    });
}

// --------------------------------------------
// "Alle Kategorien" Button
// --------------------------------------------
let categoriesVisible = true;

document.getElementById("toggle-all-categories").addEventListener("click", () => {
    categoriesVisible = !categoriesVisible;

    const mapping = [
        { id: "toggle-sehenswuerdigkeiten", layer: LAYER.s },
        { id: "toggle-museen", layer: LAYER.m },
        { id: "toggle-essen", layer: LAYER.e },
        { id: "toggle-natur", layer: LAYER.n },
        { id: "toggle-shops", layer: LAYER.sh },

        { id: "toggle-brauereien", layer: LAYER.br },
        { id: "toggle-aussicht", layer: LAYER.au },
        { id: "toggle-kirchen", layer: LAYER.ki },
        { id: "toggle-tipps", layer: LAYER.gt },
        { id: "toggle-tiere", layer: LAYER.ti }
    ];

    mapping.forEach(cat => {
        const box = document.getElementById(cat.id);

        if (categoriesVisible) {
            map.addLayer(cat.layer);
            box.checked = true;
        } else {
            map.removeLayer(cat.layer);
            box.checked = false;
        }
    });

    document.getElementById("toggle-all-categories").innerText =
        categoriesVisible ? 
        "🔄 Alle Kategorien ausblenden" :
        "✅ Alle Kategorien einblenden";
});

// --------------------------------------------
// Barrierefreiheit
// --------------------------------------------
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        sidebar.classList.add("collapsed");
        map.invalidateSize();
    }

    if (document.activeElement === toggleBtn && e.key === "Enter") {
        sidebar.classList.toggle("collapsed");
        map.invalidateSize();
    }
});