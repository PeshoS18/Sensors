const appState = {
    apiKey: '',
    watchId: null,
    motionActive: false,
    lastAccelTimestamp: null,
    velocity: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
    lastLocation: null,
};

const dom = {};

function safeNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '-';
    }
    return value.toFixed(2);
}

function formatDistance(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '-';
    }
    return `${value.toFixed(2)} m`;
}

function formatSpeed(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '-';
    }
    return `${(value * 3.6).toFixed(1)} km/h`;
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function getOrientationLabel(acc) {
    if (!acc) {
        return 'не е налично';
    }
    const { x, y, z } = acc;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude < 1) {
        return 'наклонен';
    }
    const tilt = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
    if (tilt < -50) {
        return 'към небето';
    }
    if (tilt > 50) {
        return 'към земята';
    }
    return 'наклонен';
}

function updateSensorStatus(text) {
    setText('sensorStatus', text);
}

function updateLocationStatus(text) {
    setText('locationStatus', text);
}

function updateAccelDisplay(acc) {
    setText('accelX', safeNumber(acc.x));
    setText('accelY', safeNumber(acc.y));
    setText('accelZ', safeNumber(acc.z));
    setText('orientationStatus', getOrientationLabel(acc));
}

function updateOrientationAngles(beta, gamma) {
    if (beta === null || gamma === null || beta === undefined || gamma === undefined) {
        setText('orientationAngles', '-');
        return;
    }
    setText('orientationAngles', `${beta.toFixed(1)}°, ${gamma.toFixed(1)}°`);
}

function updateCompass(heading) {
    if (heading === null || heading === undefined || Number.isNaN(heading)) {
        setText('compassData', '-');
        return;
    }
    const rounded = ((heading % 360) + 360) % 360;
    setText('compassData', `${rounded.toFixed(1)}°`);
}

function updatePositionDisplay() {
    setText('accelPosition', `x ${formatDistance(appState.position.x)}, y ${formatDistance(appState.position.y)}, z ${formatDistance(appState.position.z)}`);
}

function resetAccelerationPosition() {
    appState.lastAccelTimestamp = null;
    appState.velocity = { x: 0, y: 0, z: 0 };
    appState.position = { x: 0, y: 0, z: 0 };
    updatePositionDisplay();
    alert('Позицията е нулирана.');
}

function handleMotion(event) {
    const raw = event.acceleration || event.accelerationIncludingGravity;
    if (!raw) {
        return;
    }

    const acceleration = {
        x: raw.x || 0,
        y: raw.y || 0,
        z: raw.z || 0,
    };

    updateAccelDisplay(acceleration);

    const timeStamp = event.timeStamp || Date.now();
    if (appState.lastAccelTimestamp && timeStamp > appState.lastAccelTimestamp) {
        let dt = (timeStamp - appState.lastAccelTimestamp) / 1000;
        if (dt > 0 && dt < 0.5) {
            const ax = Math.abs(acceleration.x) < 0.05 ? 0 : acceleration.x;
            const ay = Math.abs(acceleration.y) < 0.05 ? 0 : acceleration.y;
            const az = Math.abs(acceleration.z) < 0.05 ? 0 : acceleration.z;
            appState.position.x += appState.velocity.x * dt + 0.5 * ax * dt * dt;
            appState.position.y += appState.velocity.y * dt + 0.5 * ay * dt * dt;
            appState.position.z += appState.velocity.z * dt + 0.5 * az * dt * dt;
            appState.velocity.x += ax * dt;
            appState.velocity.y += ay * dt;
            appState.velocity.z += az * dt;
            updatePositionDisplay();
        }
    }

    appState.lastAccelTimestamp = timeStamp;
}

function handleOrientation(event) {
    const beta = event.beta;
    const gamma = event.gamma;
    let heading = null;
    if (event.absolute === true && typeof event.alpha === 'number') {
        heading = event.alpha;
    }
    if (typeof event.webkitCompassHeading === 'number') {
        heading = event.webkitCompassHeading;
    }
    updateOrientationAngles(beta, gamma);
    updateCompass(heading);
}

async function requestSensorPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const response = await DeviceMotionEvent.requestPermission();
        if (response !== 'granted') {
            throw new Error('Достъпът до акселерометъра е отказан.');
        }
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response !== 'granted') {
            throw new Error('Достъпът до ориентацията е отказан.');
        }
    }
}

async function initSensors() {
    try {
        await requestSensorPermission();
    } catch (err) {
        updateSensorStatus('отказано разрешение');
        console.warn(err);
        return;
    }

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion, true);
    }
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    appState.motionActive = true;
    updateSensorStatus('активен');
}

function updateApiNotice() {
    const info = appState.apiKey ? 'Използва се Google API ключ.' : 'Без ключ: използва се открит адрес и карта.';
    setText('apiNotice', info);
}

function buildMapUrl(lat, lng) {
    const googleKey = appState.apiKey.trim();
    if (googleKey) {
        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x320&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${encodeURIComponent(googleKey)}`;
    }
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=640x320&markers=${lat},${lng},red-pushpin`;
}

function renderMap(lat, lng) {
    const container = document.getElementById('mapContainer');
    container.innerHTML = '';
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) {
        placeholder.remove();
    }
    const image = document.createElement('img');
    image.alt = 'GPS карта';
    image.src = buildMapUrl(lat, lng);
    image.loading = 'lazy';
    container.appendChild(image);
}

async function reverseGeocode(lat, lng) {
    try {
        if (appState.apiKey) {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(appState.apiKey)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.status === 'OK' && data.results && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
            return 'Адресът не може да бъде намерен.';
        }

        const nominatim = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const response = await fetch(nominatim, { headers: { 'Accept-Language': 'bg' } });
        const data = await response.json();
        if (data && data.display_name) {
            return data.display_name;
        }
        return 'Адресът не може да бъде намерен.';
    } catch (error) {
        console.warn(error);
        return 'Грешка при търсене на адрес.';
    }
}

async function handlePosition(position) {
    const coords = position.coords;
    appState.lastLocation = coords;
    setText('latitudeValue', coords.latitude.toFixed(6));
    setText('longitudeValue', coords.longitude.toFixed(6));
    setText('altitudeValue', coords.altitude === null ? '-' : `${coords.altitude.toFixed(1)} m`);
    setText('speedValue', coords.speed === null ? '-' : formatSpeed(coords.speed));
    updateLocationStatus('активен');
    renderMap(coords.latitude, coords.longitude);
    const address = await reverseGeocode(coords.latitude, coords.longitude);
    setText('addressResult', address);
}

function handleLocationError(error) {
    updateLocationStatus('грешка');
    let message = 'Грешка при GPS.';
    if (error && error.message) {
        message = error.message;
    }
    setText('addressResult', message);
}

function initLocation() {
    if (!navigator.geolocation) {
        updateLocationStatus('не поддържа GPS');
        setText('addressResult', 'Вашият браузър не поддържа геолокация.');
        return;
    }
    if (appState.watchId !== null) {
        return;
    }
    appState.watchId = navigator.geolocation.watchPosition(handlePosition, handleLocationError, {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
    });
    updateLocationStatus('стартирано');
}

function setApiKey(value) {
    appState.apiKey = value.trim();
    localStorage.setItem('sensorApiKey', appState.apiKey);
    updateApiNotice();
    if (appState.lastLocation) {
        renderMap(appState.lastLocation.latitude, appState.lastLocation.longitude);
        reverseGeocode(appState.lastLocation.latitude, appState.lastLocation.longitude).then(address => setText('addressResult', address));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    dom.btnRequestSensors = document.getElementById('btnRequestSensors');
    dom.btnRequestLocation = document.getElementById('btnRequestLocation');
    dom.btnResetAccel = document.getElementById('btnResetAccel');
    dom.btnEnableAll = document.getElementById('btnEnableAll');
    dom.apiKeyInput = document.getElementById('apiKeyInput');

    if (dom.btnRequestSensors) {
        dom.btnRequestSensors.addEventListener('click', initSensors);
    }
    if (dom.btnRequestLocation) {
        dom.btnRequestLocation.addEventListener('click', initLocation);
    }
    if (dom.btnResetAccel) {
        dom.btnResetAccel.addEventListener('click', resetAccelerationPosition);
    }
    if (dom.btnEnableAll) {
        dom.btnEnableAll.addEventListener('click', () => {
            initSensors();
            initLocation();
        });
    }
    if (dom.apiKeyInput) {
        dom.apiKeyInput.addEventListener('change', (event) => setApiKey(event.target.value));
    }

    const savedKey = localStorage.getItem('sensorApiKey');
    if (savedKey) {
        appState.apiKey = savedKey;
        dom.apiKeyInput.value = savedKey;
    }
    updateApiNotice();
});
