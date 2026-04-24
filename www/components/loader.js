const GOOGLE_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

const state = {
  lastAccelTime: null,
  velocity: { x: 0, y: 0, z: 0 },
  displacement: { x: 0, y: 0, z: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnStart').addEventListener('click', startSensors);
});

async function startSensors() {
  const statusEl = document.getElementById('sensorStatus');
  statusEl.textContent = 'Изчакване за разрешения...';

  const motionPermitted = await requestDeviceMotionPermission();
  if (!motionPermitted) {
    statusEl.textContent = 'Нямате достъп до акселерометър/компас.';
    return;
  }

  window.addEventListener('devicemotion', handleMotion, true);
  window.addEventListener('deviceorientation', handleOrientation, true);

  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(handleGeo, handleGeoError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000
    });
  } else {
    document.getElementById('geoStatus').textContent = 'GPS не е наличен.';
  }

  statusEl.textContent = 'Сензорите са активирани.';
  document.getElementById('btnStart').disabled = true;
}

async function requestDeviceMotionPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const response = await DeviceMotionEvent.requestPermission();
      return response === 'granted';
    } catch (error) {
      return false;
    }
  }
  return true;
}

function handleMotion(event) {
  const acceleration = event.acceleration || event.accelerationIncludingGravity;
  if (!acceleration) {
    document.getElementById('accStatus').textContent = 'Акселерометърът не подава данни.';
    return;
  }

  const now = event.timeStamp || performance.now();
  const dt = state.lastAccelTime ? Math.max((now - state.lastAccelTime) / 1000, 0) : 0;
  state.lastAccelTime = now;

  const ax = acceleration.x ?? 0;
  const ay = acceleration.y ?? 0;
  const az = acceleration.z ?? 0;

  updateText('accX', ax);
  updateText('accY', ay);
  updateText('accZ', az);

  if (dt > 0 && event.acceleration) {
    state.velocity.x += ax * dt;
    state.velocity.y += ay * dt;
    state.velocity.z += az * dt;
    state.displacement.x += state.velocity.x * dt;
    state.displacement.y += state.velocity.y * dt;
    state.displacement.z += state.velocity.z * dt;
  }

  updateText('velX', state.velocity.x);
  updateText('velY', state.velocity.y);
  updateText('velZ', state.velocity.z);
  updateText('dispX', state.displacement.x);
  updateText('dispY', state.displacement.y);
  updateText('dispZ', state.displacement.z);

  determineScreenOrientation(az);
}

function updateText(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = typeof value === 'number' ? value.toFixed(2) : value;
}

function determineScreenOrientation(z) {
  const orientationEl = document.getElementById('orientationState');
  const tiltText = document.getElementById('orientationDetails');

  let orientation = 'Наклонен';
  if (z > 7) {
    orientation = 'към небето';
  } else if (z < -7) {
    orientation = 'към земята';
  }

  orientationEl.textContent = orientation;
  tiltText.textContent = `Ориентация на екрана според Z-ос: ${z.toFixed(2)} m/s²`;
}

function handleOrientation(event) {
  const alpha = event.alpha;
  const beta = event.beta;
  const gamma = event.gamma;
  const heading = event.webkitCompassHeading || alpha;

  document.getElementById('heading').textContent = heading != null ? `${heading.toFixed(0)}°` : 'Няма данни';
  document.getElementById('orientationValues').textContent = `α=${alpha?.toFixed(0) ?? '—'}°, β=${beta?.toFixed(0) ?? '—'}°, γ=${gamma?.toFixed(0) ?? '—'}°`;
}

function handleGeo(position) {
  const { latitude, longitude, altitude, speed, accuracy } = position.coords;

  document.getElementById('geoStatus').textContent = 'GPS данни налични.';
  updateText('lat', latitude);
  updateText('lon', longitude);
  updateText('alt', altitude ?? 0);
  updateText('speed', speed != null ? speed * 3.6 : 0);
  updateText('accuracy', accuracy);
  document.getElementById('gpsTimestamp').textContent = new Date(position.timestamp).toLocaleTimeString();

  updateMap(latitude, longitude);
  reverseGeocode(latitude, longitude);
}

function handleGeoError(error) {
  document.getElementById('geoStatus').textContent = `GPS грешка: ${error.message}`;
}

async function reverseGeocode(lat, lng) {
  const addressEl = document.getElementById('address');
  if (GOOGLE_API_KEY.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
    addressEl.textContent = 'Добавете вашия Google Maps API ключ в components/loader.js, за да получите адрес и карта.';
    return;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length) {
      addressEl.textContent = data.results[0].formatted_address;
    } else {
      addressEl.textContent = 'Адрес не може да бъде намерен.';
    }
  } catch (error) {
    addressEl.textContent = 'Грешка при търсене на адрес.';
  }
}

function updateMap(lat, lng) {
  const mapImage = document.getElementById('staticMap');
  const mapMessage = document.getElementById('mapMessage');
  if (GOOGLE_API_KEY.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
    mapImage.src = '';
    mapMessage.textContent = 'Добавете API ключ в components/loader.js, за да визуализирате картата.';
    return;
  }

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x320&maptype=roadmap&markers=color:red%7Clabel:A%7C${lat},${lng}&key=${GOOGLE_API_KEY}`;
  mapImage.src = mapUrl;
  mapMessage.textContent = '';
}
