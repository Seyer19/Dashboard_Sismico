let globalSeismicData = null;
let mainMap = null;
let detailMap = null;
let waveformChart = null;

// Inicialización general
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchSeismicData();
  setupFigmaClickFeedback();
  setupModalDismissal();
});

// Navegación entre Pantallas
function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }

  // Control de barra de navegación inferior
  const bottomNav = document.getElementById('bottom-nav');
  if (['screen-1', 'screen-6', 'screen-7'].includes(screenId)) {
    bottomNav.style.display = 'flex';
    // Actualizar colores del menú
    ['screen-1', 'screen-6', 'screen-7'].forEach(id => {
      const btn = document.getElementById(`nav-btn-${id}`);
      if (btn) {
        if (id === screenId) {
          btn.className = 'interactive-btn flex flex-col items-center gap-1 text-xs font-bold text-[#8B0000]';
        } else {
          btn.className = 'interactive-btn flex flex-col items-center gap-1 text-xs font-bold text-gray-400';
        }
      }
    });
  } else {
    bottomNav.style.display = 'none';
  }

  // Renderizar mapas o gráficos si aplica
  if (screenId === 'screen-1') {
    setTimeout(initMainMap, 100);
  } else if (screenId === 'screen-8') {
    setTimeout(() => {
      initDetailMap();
      renderWaveformChart();
    }, 100);
  }
}

// Carga Asíncrona del JSON intacto
async function fetchSeismicData() {
  try {
    const response = await fetch('datos_sismicos_procesados_3.json');
    if (!response.ok) throw new Error("No se pudo cargar el archivo local");
    globalSeismicData = await response.json();
    populateDashboardUI(globalSeismicData);
  } catch (error) {
    console.warn("Utilizando datos predeterminados:", error);
    globalSeismicData = getFallbackData();
    populateDashboardUI(globalSeismicData);
  }
}

// Poblar la interfaz adaptándose a la estructura real del JSON
function populateDashboardUI(data) {
  // 1. Extraer métricas críticas si existen en el JSON
  const metrics = data.metricas_criticas || {};
  const graphData = data.datos_grafica || [];

  if (metrics.pico_maximo_amplitud) {
    // Calculamos una magnitud aproximada basada en la amplitud de pico máximo
    const magEstimada = (Math.log10(metrics.pico_maximo_amplitud) + 1.2).toFixed(1);
    const elemMaxMag = document.getElementById('dash-max-mag');
    if (elemMaxMag) elemMaxMag.innerText = magEstimada;
  }

  const elemTotalEvents = document.getElementById('dash-total-events');
  if (elemTotalEvents) elemTotalEvents.innerText = graphData.length > 0 ? "1" : "0";

  // 2. Renderizar Eventos Recientes (Pantalla 1)
  const recentContainer = document.getElementById('recent-events-container');
  if (recentContainer) {
    const fechaAlerta = metrics.timestamp_alerta ? new Date(metrics.timestamp_alerta).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '00:46';
    recentContainer.innerHTML = `
      <div onclick="selectEventAndNavigate('EVT-JSON-01')" class="interactive-btn flex justify-between items-center py-2 border-b border-gray-50 last:border-0 cursor-pointer">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full bg-[#8B0000]"></div>
          <div>
            <h4 class="text-sm font-bold text-gray-900">Pico Máx. ${metrics.pico_maximo_amplitud || 2920} Amplitud</h4>
            <p class="text-xs text-gray-400">Estación Monitoreo · Prof. 10 km</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-400">${fechaAlerta} UTC</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 inline ml-1"></i>
        </div>
      </div>
    `;
  }

  // 3. Renderizar Lista de Eventos (Pantalla 6)
  const allContainer = document.getElementById('all-events-container');
  if (allContainer) {
    allContainer.innerHTML = `
      <div onclick="selectEventAndNavigate('EVT-JSON-01')" class="interactive-btn flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-[#8B0000] text-white font-bold flex items-center justify-center text-sm">
            ${metrics.alerta_disparada ? 'ALR' : 'OK'}
          </div>
          <div>
            <h4 class="text-sm font-bold text-gray-900">Evento Registrado (Serie Temporal)</h4>
            <p class="text-xs text-gray-400">${graphData.length} Muestras Registradas · ${metrics.timestamp_alerta || ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold border border-gray-300 text-gray-600 px-2 py-0.5 rounded-full">${metrics.alerta_disparada ? 'Alerta Disparada' : 'Normal'}</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
        </div>
      </div>
    `;
  }

  lucide.createIcons();
}

function selectEventAndNavigate(eventId) {
  const metrics = globalSeismicData?.metricas_criticas || {};
  const graphData = globalSeismicData?.datos_grafica || [];

  const elemMag = document.getElementById('detail-mag');
  if (elemMag) elemMag.innerText = metrics.pico_maximo_amplitud ? (Math.log10(metrics.pico_maximo_amplitud) + 1.2).toFixed(1) : '4.6';
  
  const elemTitle = document.getElementById('detail-title');
  if (elemTitle) elemTitle.innerText = "Estación Sísmica";

  const elemCode = document.getElementById('detail-code');
  if (elemCode) elemCode.innerText = `${eventId} · ${metrics.timestamp_alerta || '2024-05-12 00:46:59Z'}`;

  const elemDuration = document.getElementById('detail-duration');
  if (elemDuration) elemDuration.innerText = `${graphData.length} s`;

  navigateTo('screen-8');
}

// Inicialización de Mapa Principal (Leaflet)
function initMainMap() {
  if (mainMap) mainMap.remove();
  const mapElement = document.getElementById('map-main');
  if (!mapElement) return;

  mainMap = L.map('map-main', { zoomControl: false, attributionControl: false }).setView([4.21, -74.08], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mainMap);

  L.circleMarker([4.21, -74.08], {
    radius: 12,
    fillColor: '#8B0000',
    color: '#fff',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(mainMap);
}

// Mapa de Detalle
function initDetailMap() {
  if (detailMap) detailMap.remove();
  const mapElement = document.getElementById('map-detail');
  if (!mapElement) return;

  detailMap = L.map('map-detail', { zoomControl: false, attributionControl: false }).setView([4.21, -74.08], 8);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(detailMap);

  L.circleMarker([4.21, -74.08], {
    radius: 10,
    fillColor: '#8B0000',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(detailMap);
}

// Renderizado de Sismograma con Chart.js usando las mediciones reales del JSON
function renderWaveformChart() {
  const ctx = document.getElementById('waveform-chart');
  if (!ctx) return;

  if (waveformChart) waveformChart.destroy();

  let timeLabels = [];
  let amplitudeData = [];

  // Usar los datos reales del JSON
  if (globalSeismicData && Array.isArray(globalSeismicData.datos_grafica) && globalSeismicData.datos_grafica.length > 0) {
    // Tomar una muestra representativa de puntos para mejor rendimiento en pantalla móvil
    const rawData = globalSeismicData.datos_grafica;
    const step = Math.max(1, Math.floor(rawData.length / 100)); // Máximo ~100 puntos en la gráfica
    
    for (let i = 0; i < rawData.length; i += step) {
      const item = rawData[i];
      const date = new Date(item.timestamp_iso);
      timeLabels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      amplitudeData.push(item.Amplitud);
    }
  } else {
    // Datos por defecto si no ha cargado
    timeLabels = Array.from({length: 40}, (_, i) => `${i}s`);
    amplitudeData = timeLabels.map(() => Math.floor(Math.random() * 500 + 1500));
  }

  waveformChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'Amplitud',
        data: amplitudeData,
        borderColor: '#8B0000',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { 
          display: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 9 }, color: '#94a3b8' }
        }
      }
    }
  });
}

// Funciones para el Modal de Filtros (Bottom Sheet)
function openFilterModal() {
  const modal = document.getElementById('filter-modal');
  const content = document.getElementById('filter-modal-content');
  
  if (modal && content) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    content.classList.remove('translate-y-full');
    content.classList.add('translate-y-0');
  }
}

function closeFilterModal() {
  const modal = document.getElementById('filter-modal');
  const content = document.getElementById('filter-modal-content');
  
  if (modal && content) {
    content.classList.remove('translate-y-0');
    content.classList.add('translate-y-full');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
}

function setupModalDismissal() {
  const modal = document.getElementById('filter-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeFilterModal();
      }
    });
  }
}

// Efecto interactivo de Figma
function setupFigmaClickFeedback() {
  const container = document.getElementById('device-container');
  if (!container) return;
  
  container.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('.interactive-btn, button, input, select, a');
    if (!isInteractive) {
      const activeScreen = document.querySelector('.screen.active');
      if (activeScreen) {
        const buttons = activeScreen.querySelectorAll('.interactive-btn');
        buttons.forEach(btn => {
          btn.classList.add('figma-highlight');
          setTimeout(() => {
            btn.classList.remove('figma-highlight');
          }, 600);
        });
      }
    }
  });
}

// Datos de respaldo
function getFallbackData() {
  return {
    "metricas_criticas": {
      "alerta_disparada": true,
      "pico_maximo_amplitud": 2920.0,
      "timestamp_alerta": "2024-05-12T00:46:59Z"
    },
    "datos_grafica": []
  };
}