var app = new Framework7({
    el: '#app',
    theme: 'dark'
});

let lastLat = null;
let lastLng = null;

function detectOrientation(ax, ay, az) {
    if (az > 8) return "Към небето ☁️";
    if (az < -8) return "Към земята 🌍";
    return "Наклонен 📱";
}

window.addEventListener("devicemotion", function (event) {
    let acc = event.accelerationIncludingGravity;
    if (!acc) return;

    if (document.getElementById("ax")) {
        document.getElementById("ax").innerText = acc.x?.toFixed(2);
        document.getElementById("ay").innerText = acc.y?.toFixed(2);
        document.getElementById("az").innerText = acc.z?.toFixed(2);

        document.getElementById("orientation").innerText =
            detectOrientation(acc.x, acc.y, acc.z);
    }
});

function updateGPS() {
    if (!navigator.geolocation) {
        console.log("No GPS support");
        return;
    }

    navigator.geolocation.watchPosition(async (pos) => {
        const { latitude, longitude, altitude, speed } = pos.coords;

        lastLat = latitude;
        lastLng = longitude;

        document.getElementById("lat").innerText = latitude.toFixed(6);
        document.getElementById("lng").innerText = longitude.toFixed(6);
        document.getElementById("alt").innerText = altitude ?? "--";
        document.getElementById("speed").innerText = speed ?? "--";

        updateMap(latitude, longitude);
        reverseGeocode(latitude, longitude);

    }, err => console.log("GPS error:", err),
        { enableHighAccuracy: true });
}

function updateMap(lat, lng) {
    const key = "YOUR_GOOGLE_MAPS_API_KEY";

    const url =
        `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red|${lat},${lng}&key=${key}`;

    const map = document.getElementById("map");
    if (map) map.src = url;
}

async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );

        const data = await res.json();

        const el = document.getElementById("address");
        if (el) {
            el.innerText = data.display_name || "Не е намерен адрес";
        }

    } catch (e) {
        console.log(e);
        const el = document.getElementById("address");
        if (el) el.innerText = "Грешка при адрес";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    updateGPS();
});