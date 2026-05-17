var app = new Framework7({
    el: '#app',
    theme: 'dark'
});

// GLOBAL STATE
// =====================
let lastLat = null;
let lastLng = null;

let lastGeoTime = 0; // ⬅️ throttle за reverse geocoding

// ORIENTATION
// =====================
function detectOrientation(ax, ay, az) {
    if (az > 8) return "Към небето ☁️";
    if (az < -8) return "Към земята 🌍";
    return "Наклонен 📱";
}

// SENSOR
// =====================
window.addEventListener("devicemotion", function (event) {
    let acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const ax = document.getElementById("ax");
    const ay = document.getElementById("ay");
    const az = document.getElementById("az");
    const ori = document.getElementById("orientation");

    if (ax && ay && az && ori) {
        ax.innerText = acc.x?.toFixed(2);
        ay.innerText = acc.y?.toFixed(2);
        az.innerText = acc.z?.toFixed(2);

        ori.innerText = detectOrientation(acc.x, acc.y, acc.z);
    }
});

// GPS
// =====================
function updateGPS() {
    if (!navigator.geolocation) {
        console.log("No GPS support");
        return;
    }

    navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude, altitude, speed } = pos.coords;

        lastLat = latitude;
        lastLng = longitude;

        const latEl = document.getElementById("lat");
        const lngEl = document.getElementById("lng");
        const altEl = document.getElementById("alt");
        const speedEl = document.getElementById("speed");

        if (latEl) latEl.innerText = latitude.toFixed(6);
        if (lngEl) lngEl.innerText = longitude.toFixed(6);
        if (altEl) altEl.innerText = altitude ?? "--";
        if (speedEl) speedEl.innerText = speed ?? "--";

        updateMap(latitude, longitude);

        // ⬇️ THROTTLE (ВАЖНО)
        if (shouldUpdateGeo()) {
            reverseGeocode(latitude, longitude);
        }

    }, err => console.log("GPS error:", err),
        { enableHighAccuracy: true });
}

// THROTTLE FUNCTION
// =====================
function shouldUpdateGeo() {
    const now = Date.now();

    // ⬇️ минимум 10 секунди между заявки
    if (now - lastGeoTime < 10000) return false;

    lastGeoTime = now;
    return true;
}

// MAP
// =====================
function updateMap(lat, lng) {
    const key = "YOUR_GOOGLE_MAPS_API_KEY";

    const url =
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red|${lat},${lng}&key=${key}`;

    const map = document.getElementById("map");
    if (map) map.src = url;
}


// REVERSE GEOCODING
// =====================
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();

        const el = document.getElementById("address");
        if (el) {
            el.innerText = data.display_name || "Не е намерен адрес";
        }

    } catch (e) {
        console.log("GEOCODE ERROR:", e);

        const el = document.getElementById("address");
        if (el) el.innerText = "Грешка при адрес";
    }
}

// =====================
// START
// =====================
document.addEventListener("DOMContentLoaded", function () {
    updateGPS();
});