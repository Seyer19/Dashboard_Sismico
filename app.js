// =============================================================
// Sismic Dashboard - logica de la maqueta movil
// Datos ficticios alineados con el prototipo de Figma (M01-M10)
// =============================================================

// -------------------------------------------------------------
// Configuracion de la maqueta
// modoInicio:
//   'alerta' -> la app abre directo en la alerta roja
//   'calma'  -> la app abre en Inicio "Sin alertas" y la alerta llega sola
//               despues de un tiempo al azar (como el prototipo de Figma)
// -------------------------------------------------------------
const CONFIG = {
  modoInicio: 'alerta',
  alertaMinSeg: 6,         // la alerta automatica llega entre este minimo...
  alertaMaxSeg: 12,        // ...y este maximo de segundos (modo 'calma')
  cuentaRegresivaSeg: 10,  // segundos de "Llegada estimada en"
  duracionSismoSeg: 6,     // segundos en "Sismo en curso" antes de "Estas a salvo?"
  eventos24hBase: 47       // eventos de 24 h antes del sismo (dato de Figma)
};

// -------------------------------------------------------------
// Datos de eventos (fuente unica para Inicio, Eventos y Detalle)
// dias: antiguedad en dias (0 = hoy)
// deLaAlerta: solo existe despues de que se dispara la alerta
// -------------------------------------------------------------
const EVENTOS = [
  {
    id: 'EVT-2026-0001', mag: 6.2, lugar: 'Valle Central', prof: 10,
    hora: '14:32:08', relativo: 'hace 2 min', dias: 0, estado: 'Activo',
    tipo: 'Tectónico', lat: 4.21, lng: -74.08, duracion: 38, deLaAlerta: true,
    conFormaDeOnda: true,
    estaciones: [['VC-01', 12, 0.82], ['VC-02', 28, 0.45], ['CN-05', 65, 0.12]]
  },
  {
    id: 'EVT-2026-0002', mag: 4.8, lugar: 'Cordillera Norte', prof: 35,
    hora: '13:15:42', dias: 0, estado: 'Monitoreo', tipo: 'Tectónico',
    lat: 5.35, lng: -73.40, duracion: 21,
    estaciones: [['CN-02', 18, 0.21], ['CN-05', 40, 0.09]]
  },
  {
    id: 'EVT-2026-0003', mag: 3.1, lugar: 'Costa Pacífica', prof: 20,
    hora: '12:50:17', dias: 0, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 3.90, lng: -76.95, duracion: 9,
    estaciones: [['CP-01', 22, 0.04]]
  },
  {
    id: 'EVT-2026-0004', mag: 5.4, lugar: 'Altiplano Sur', prof: 60,
    hora: '11:08:33', dias: 0, estado: 'Activo', tipo: 'Tectónico',
    lat: 2.45, lng: -74.60, duracion: 27,
    estaciones: [['AS-03', 15, 0.33], ['AS-01', 47, 0.14]]
  },
  {
    id: 'EVT-2026-0005', mag: 2.9, lugar: 'Delta Fluvial', prof: 8,
    hora: '10:22:05', dias: 0, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 6.60, lng: -75.10, duracion: 6,
    estaciones: [['DF-02', 9, 0.03]]
  },
  {
    id: 'EVT-2026-0006', mag: 3.7, lugar: 'Sierra Oriental', prof: 42,
    hora: '09:47:51', dias: 0, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 4.80, lng: -72.90, duracion: 12,
    estaciones: [['SO-01', 25, 0.07]]
  },
  // Eventos anteriores: solo aparecen con los periodos de 7 o 30 dias
  {
    id: 'EVT-2026-0007', mag: 4.1, lugar: 'Cordillera Norte', prof: 28,
    hora: '08:40:12', dias: 3, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 5.10, lng: -73.70, duracion: 15,
    estaciones: [['CN-02', 21, 0.11]]
  },
  {
    id: 'EVT-2026-0008', mag: 5.0, lugar: 'Costa Pacífica', prof: 31,
    hora: '22:15:40', dias: 12, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 3.55, lng: -77.10, duracion: 24,
    estaciones: [['CP-01', 30, 0.19], ['CP-04', 52, 0.08]]
  },
  {
    id: 'EVT-2026-0009', mag: 3.4, lugar: 'Valle Central', prof: 15,
    hora: '06:05:09', dias: 20, estado: 'Cerrado', tipo: 'Tectónico',
    lat: 4.30, lng: -74.20, duracion: 10,
    estaciones: [['VC-01', 14, 0.06]]
  }
];

// Ubicacion ficticia del usuario
const UBICACION_USUARIO = { lat: 4.21, lng: -74.08 };

// Magnitud a partir de la cual un dato se marca en rojo (regla del proyecto)
const MAGNITUD_CRITICA = 6;

// -------------------------------------------------------------
// Estado de la aplicacion
// -------------------------------------------------------------
let estadoInicio = 'sin-alerta';   // 'sin-alerta' (M01) o 'post-alerta' (M06)
let temporizadorAlerta = null;     // alerta automatica del modo 'calma'
let intervaloPantalla = null;      // contadores de alerta, sismo y llamada
let pantallaActual = null;
let pantallaPrevia = 'screen-1';   // a donde regresa el boton atras del detalle
let eventoSeleccionado = 'EVT-2026-0001';

// Filtros aplicados en Eventos y borrador editable dentro del modal
const FILTROS_INICIALES = { periodo: 'hoy', magMin: 2.0, profundidad: [], tipo: [], texto: '' };
let filtros = clonarFiltros(FILTROS_INICIALES);
let borradorFiltros = clonarFiltros(FILTROS_INICIALES);

// Configuracion de alertas (pantalla Alertas)
let prioridad = 'alta';

// Pantallas cuyo borde superior es blanco (la barra de estado va en claro)
const PANTALLAS_CLARAS = ['screen-3', 'screen-4', 'screen-5'];

// Pantallas que muestran la barra de navegacion inferior
const PANTALLAS_CON_MENU = ['screen-1', 'screen-6', 'screen-7'];

// Clases de color para chips seleccionados y no seleccionados
const CHIP_ACTIVO = ['bg-importante', 'text-white', 'border-importante'];
const CHIP_INACTIVO = ['bg-white', 'text-gray-700', 'border-gray-300'];

let globalSeismicData = null;
let mainMap = null;
let detailMap = null;
let waveformChart = null;

// -------------------------------------------------------------
// Inicializacion general
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fetchSeismicData();
  setupFigmaClickFeedback();
  setupModalDismissal();
  sincronizarChips();
  iniciarApp();
});

// Arranque segun el modo configurado
function iniciarApp() {
  if (CONFIG.modoInicio === 'calma') {
    aplicarEstadoInicio('sin-alerta');
    navigateTo('screen-1');
    programarAlertaAlAzar();
  } else {
    navigateTo('screen-2');
  }
}

// Dispara la alerta tras un tiempo al azar, solo si el usuario sigue en Inicio
function programarAlertaAlAzar() {
  const rango = CONFIG.alertaMaxSeg - CONFIG.alertaMinSeg;
  const segundos = CONFIG.alertaMinSeg + Math.random() * rango;
  clearTimeout(temporizadorAlerta);
  temporizadorAlerta = setTimeout(() => {
    if (pantallaActual === 'screen-1' && estadoInicio === 'sin-alerta') {
      navigateTo('screen-2');
    }
  }, segundos * 1000);
}

// -------------------------------------------------------------
// Navegacion entre pantallas
// -------------------------------------------------------------
function navigateTo(screenId) {
  // Cualquier cambio de pantalla detiene el contador de la pantalla anterior
  clearInterval(intervaloPantalla);

  if (screenId === 'screen-8' && pantallaActual && pantallaActual !== 'screen-8') {
    pantallaPrevia = pantallaActual;
  }
  pantallaActual = screenId;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    targetScreen.scrollTop = 0;
  }

  actualizarBarraEstado(screenId);

  // Una vez que aparece la alerta, el inicio queda en estado post-alerta
  if (screenId === 'screen-2' && estadoInicio !== 'post-alerta') {
    clearTimeout(temporizadorAlerta);
    aplicarEstadoInicio('post-alerta');
  }

  // Barra de navegacion inferior
  const bottomNav = document.getElementById('bottom-nav');
  if (PANTALLAS_CON_MENU.includes(screenId)) {
    bottomNav.style.display = 'flex';
    PANTALLAS_CON_MENU.forEach(id => {
      const btn = document.getElementById(`nav-btn-${id}`);
      if (!btn) return;
      btn.classList.toggle('text-importante', id === screenId);
      btn.classList.toggle('text-gray-400', id !== screenId);
    });
  } else {
    bottomNav.style.display = 'none';
  }

  // Comportamiento propio de cada pantalla
  if (screenId === 'screen-2') {
    iniciarCuentaRegresiva();
  } else if (screenId === 'screen-9') {
    iniciarSismoEnCurso();
  } else if (screenId === 'screen-4') {
    iniciarLlamada();
  } else if (screenId === 'screen-1') {
    renderizarInicio();
    setTimeout(initMainMap, 100);
  } else if (screenId === 'screen-6') {
    renderizarListaEventos();
  } else if (screenId === 'screen-8') {
    renderizarDetalle(eventoSeleccionado);
    setTimeout(() => {
      initDetailMap();
      renderWaveformChart();
    }, 100);
  }
}

// Boton atras del detalle: regresa a la pantalla desde donde se abrio
function volverAtras() {
  navigateTo(pantallaPrevia || 'screen-1');
}

// Ajusta el color de la barra de estado a la pantalla visible
function actualizarBarraEstado(screenId) {
  const barra = document.getElementById('status-bar');
  if (!barra) return;
  const clara = PANTALLAS_CLARAS.includes(screenId);
  document.documentElement.style.setProperty('--color-barra', clara ? '#FFFFFF' : '#880000');
  barra.classList.toggle('barra-clara', clara);
}

// -------------------------------------------------------------
// Flujo de la alerta: cuenta regresiva -> sismo en curso -> estas a salvo
// -------------------------------------------------------------
function formatoSegundos(total) {
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

// A01-A05: cuenta regresiva hasta la llegada del sismo
function iniciarCuentaRegresiva() {
  let restante = CONFIG.cuentaRegresivaSeg;
  const reloj = document.getElementById('countdown-timer');
  reloj.innerText = formatoSegundos(restante);

  intervaloPantalla = setInterval(() => {
    restante -= 1;
    reloj.innerText = formatoSegundos(Math.max(restante, 0));
    if (restante <= 0) {
      navigateTo('screen-9');
    }
  }, 1000);
}

// A06: tiempo transcurrido del sismo; al terminar pregunta si estas a salvo
function iniciarSismoEnCurso() {
  let transcurrido = 0;
  const reloj = document.getElementById('sismo-timer');
  reloj.innerText = formatoSegundos(transcurrido);

  intervaloPantalla = setInterval(() => {
    transcurrido += 1;
    reloj.innerText = formatoSegundos(transcurrido);
    if (transcurrido >= CONFIG.duracionSismoSeg) {
      navigateTo('screen-3');
    }
  }, 1000);
}

// M05: duracion de la llamada simulada al 911
function iniciarLlamada() {
  let transcurrido = 0;
  const reloj = document.getElementById('call-timer');
  reloj.innerText = formatoSegundos(transcurrido);

  intervaloPantalla = setInterval(() => {
    transcurrido += 1;
    reloj.innerText = formatoSegundos(transcurrido);
  }, 1000);
}

// -------------------------------------------------------------
// Inicio: estado "Sin alertas" (M01) o alerta activa (M06)
// -------------------------------------------------------------
function aplicarEstadoInicio(estado) {
  estadoInicio = estado;
  const conAlerta = estado === 'post-alerta';

  const banner = document.getElementById('banner-alerta');
  if (banner) banner.style.display = conAlerta ? '' : 'none';

  const chip = document.getElementById('chip-estado-zona');
  if (chip) {
    chip.innerText = conAlerta ? 'Réplicas' : 'Sin alertas';
    chip.className = conAlerta
      ? 'bg-importante text-white text-xs font-bold px-3 py-1 rounded-full'
      : 'bg-white border border-gray-300 text-gray-700 text-xs font-bold px-3 py-1 rounded-full';
  }

  renderizarInicio();
}

// Eventos que existen en el momento actual de la maqueta
function eventosDisponibles() {
  return EVENTOS.filter(e => !e.deLaAlerta || estadoInicio === 'post-alerta');
}

function esCritico(mag) {
  return mag >= MAGNITUD_CRITICA;
}

function textoHora(evento) {
  if (evento.relativo) return evento.relativo;
  if (evento.dias > 0) return `hace ${evento.dias} ${evento.dias === 1 ? 'día' : 'días'}`;
  return evento.hora.slice(0, 5);
}

// Metricas, eventos recientes y mapa del Inicio
function renderizarInicio() {
  const conAlerta = estadoInicio === 'post-alerta';
  const hoy = eventosDisponibles().filter(e => e.dias === 0);
  const magMax = Math.max(...hoy.map(e => e.mag));

  const elemMag = document.getElementById('dash-max-mag');
  if (elemMag) {
    elemMag.innerText = magMax.toFixed(1);
    elemMag.classList.toggle('text-importante', esCritico(magMax));
    elemMag.classList.toggle('text-gray-900', !esCritico(magMax));
  }

  const elemEventos = document.getElementById('dash-total-events');
  if (elemEventos) elemEventos.innerText = CONFIG.eventos24hBase + (conAlerta ? 1 : 0);

  const elemAlertas = document.getElementById('dash-active-alerts');
  if (elemAlertas) {
    elemAlertas.innerText = conAlerta ? '1' : '0';
    elemAlertas.classList.toggle('text-importante', conAlerta);
    elemAlertas.classList.toggle('text-gray-900', !conAlerta);
  }

  // Los dos eventos mas recientes de hoy
  const recientes = [...hoy].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 2);
  const contenedor = document.getElementById('recent-events-container');
  if (contenedor) {
    contenedor.innerHTML = recientes.map(e => `
      <div onclick="abrirDetalle('${e.id}')" class="interactive-btn flex justify-between items-center py-2 border-b border-gray-50 last:border-0 cursor-pointer">
        <div class="flex items-center gap-3">
          <div class="w-3 h-3 rounded-full ${esCritico(e.mag) ? 'bg-importante' : 'bg-gray-400'}"></div>
          <div>
            <h4 class="text-sm font-bold ${esCritico(e.mag) ? 'text-importante' : 'text-gray-900'}">Mag ${e.mag.toFixed(1)}</h4>
            <p class="text-xs text-gray-400">${e.lugar} · Prof. ${e.prof} km</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-400">${textoHora(e)}</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 inline ml-1"></i>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }
}

// -------------------------------------------------------------
// Eventos: lista con busqueda y filtros
// -------------------------------------------------------------
function clonarFiltros(f) {
  return { ...f, profundidad: [...f.profundidad], tipo: [...f.tipo] };
}

function rangoProfundidad(prof) {
  if (prof < 70) return 'superficial';
  if (prof <= 300) return 'intermedio';
  return 'profundo';
}

function cumplePeriodo(evento, periodo) {
  if (periodo === 'hoy') return evento.dias === 0;
  if (periodo === '7') return evento.dias <= 7;
  if (periodo === '30') return evento.dias <= 30;
  return true; // personalizado: sin limite
}

function eventosFiltrados() {
  const texto = filtros.texto.trim().toLowerCase();
  return eventosDisponibles().filter(e =>
    cumplePeriodo(e, filtros.periodo) &&
    e.mag >= filtros.magMin &&
    (filtros.profundidad.length === 0 || filtros.profundidad.includes(rangoProfundidad(e.prof))) &&
    (filtros.tipo.length === 0 || filtros.tipo.includes(e.tipo)) &&
    (texto === '' || e.lugar.toLowerCase().includes(texto))
  );
}

// Etiqueta de estado: rojo solo para eventos activos
function etiquetaEstado(estado) {
  const clases = estado === 'Activo'
    ? 'border-importante text-importante'
    : 'border-gray-300 text-gray-600';
  return `<span class="text-[10px] font-bold border ${clases} px-2 py-0.5 rounded-full">${estado}</span>`;
}

function renderizarListaEventos() {
  const contenedor = document.getElementById('all-events-container');
  if (!contenedor) return;

  const lista = eventosFiltrados();
  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="p-6 text-center">
        <p class="text-sm font-bold text-gray-900">Sin eventos con estos filtros</p>
        <p class="text-xs text-gray-500 mt-1">Prueba con otro periodo o limpia los filtros.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = lista.map(e => `
    <div onclick="abrirDetalle('${e.id}')" class="interactive-btn flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
      <div class="flex items-center gap-3">
        <div class="w-12 h-10 rounded-xl ${esCritico(e.mag) ? 'bg-importante text-white' : 'bg-gray-100 text-gray-900'} font-bold flex items-center justify-center text-base">
          ${e.mag.toFixed(1)}
        </div>
        <div>
          <h4 class="text-sm font-bold text-gray-900">${e.lugar}</h4>
          <p class="text-xs text-gray-400">Prof. ${e.prof} km · ${textoHora(e)}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${etiquetaEstado(e.estado)}
        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function buscarEventos(texto) {
  filtros.texto = texto;
  renderizarListaEventos();
}

// Chips 24 h / 7 dias / 30 dias de la pantalla Eventos
function elegirPeriodoRapido(boton) {
  filtros.periodo = boton.dataset.valor;
  sincronizarChips();
  renderizarListaEventos();
}

// -------------------------------------------------------------
// Chips con estado (filtros y prioridad)
// Seleccion unica por grupo, o multiple si el chip tiene data-multi
// -------------------------------------------------------------
function elegirChip(boton) {
  const grupo = boton.dataset.grupo;
  const valor = boton.dataset.valor;

  if (grupo === 'prioridad') {
    prioridad = valor;
  } else if (boton.dataset.multi === 'si') {
    const lista = borradorFiltros[grupo];
    const indice = lista.indexOf(valor);
    if (indice >= 0) lista.splice(indice, 1); else lista.push(valor);
  } else {
    borradorFiltros[grupo] = valor;
  }
  sincronizarChips();
}

// Pinta cada chip segun el estado actual
function sincronizarChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    const grupo = chip.dataset.grupo;
    const valor = chip.dataset.valor;
    let activo = false;

    if (grupo === 'periodo-rapido') activo = filtros.periodo === valor;
    else if (grupo === 'prioridad') activo = prioridad === valor;
    else if (chip.dataset.multi === 'si') activo = borradorFiltros[grupo].includes(valor);
    else activo = borradorFiltros[grupo] === valor;

    chip.classList.remove(...CHIP_ACTIVO, ...CHIP_INACTIVO);
    chip.classList.add(...(activo ? CHIP_ACTIVO : CHIP_INACTIVO));
    chip.setAttribute('aria-pressed', activo ? 'true' : 'false');
  });
}

function cambiarMagnitudFiltro(valor) {
  borradorFiltros.magMin = parseFloat(valor);
  document.getElementById('valor-magnitud').innerText = borradorFiltros.magMin.toFixed(1);
}

// Copia los filtros aplicados al borrador y actualiza los controles del modal
function cargarBorradorEnModal() {
  borradorFiltros = clonarFiltros(filtros);
  document.getElementById('filtro-magnitud').value = borradorFiltros.magMin;
  document.getElementById('valor-magnitud').innerText = borradorFiltros.magMin.toFixed(1);
  sincronizarChips();
}

function aplicarFiltros() {
  borradorFiltros.texto = filtros.texto;
  filtros = clonarFiltros(borradorFiltros);
  sincronizarChips();
  renderizarListaEventos();
  closeFilterModal();
}

function limpiarFiltros() {
  const texto = filtros.texto;
  filtros = clonarFiltros(FILTROS_INICIALES);
  filtros.texto = texto;
  cargarBorradorEnModal();
  renderizarListaEventos();
  closeFilterModal();
}

// -------------------------------------------------------------
// Alertas: interruptores y guardado
// -------------------------------------------------------------
function alternarInterruptor(boton) {
  const encendido = boton.getAttribute('aria-checked') === 'true';
  boton.setAttribute('aria-checked', encendido ? 'false' : 'true');
}

function guardarConfiguracion() {
  mostrarAviso('Configuración guardada');
  setTimeout(() => navigateTo('screen-1'), 900);
}

// Mensaje flotante breve
function mostrarAviso(texto) {
  const aviso = document.getElementById('aviso');
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.classList.remove('opacity-0');
  aviso.classList.add('opacity-100');
  clearTimeout(mostrarAviso.temporizador);
  mostrarAviso.temporizador = setTimeout(() => {
    aviso.classList.remove('opacity-100');
    aviso.classList.add('opacity-0');
  }, 1800);
}

// -------------------------------------------------------------
// Detalle de evento
// -------------------------------------------------------------
function abrirDetalle(idEvento) {
  eventoSeleccionado = idEvento;
  navigateTo('screen-8');
}

function buscarEvento(idEvento) {
  return EVENTOS.find(e => e.id === idEvento) || EVENTOS[0];
}

function formatoCoordenada(valor, positivo, negativo) {
  return `${Math.abs(valor).toFixed(2)}°${valor >= 0 ? positivo : negativo}`;
}

function renderizarDetalle(idEvento) {
  const e = buscarEvento(idEvento);
  const critico = esCritico(e.mag);

  const caja = document.getElementById('detail-mag').parentElement;
  caja.classList.toggle('bg-importante', critico);
  caja.classList.toggle('bg-gray-900', !critico);

  document.getElementById('detail-mag').innerText = e.mag.toFixed(1);
  document.getElementById('detail-title').innerText = e.lugar;
  document.getElementById('detail-code').innerText = `${e.id} · ${e.hora} UTC`;

  const estado = document.getElementById('detail-status');
  estado.innerText = e.estado;
  const activo = e.estado === 'Activo';
  estado.classList.toggle('border-importante', activo);
  estado.classList.toggle('text-importante', activo);
  estado.classList.toggle('border-gray-300', !activo);
  estado.classList.toggle('text-gray-600', !activo);

  document.getElementById('detail-depth').innerText = `${e.prof} km`;
  document.getElementById('detail-type').innerText = e.tipo;
  document.getElementById('detail-duration').innerText = `${e.duracion} s`;
  document.getElementById('detail-lat').innerText = formatoCoordenada(e.lat, 'N', 'S');
  document.getElementById('detail-lng').innerText = formatoCoordenada(e.lng, 'E', 'W');
  document.getElementById('detail-stations').innerText = e.estaciones.length;

  document.getElementById('detail-stations-list').innerHTML = e.estaciones.map(([codigo, distancia, pga], i) => `
    <div class="flex justify-between py-1 ${i < e.estaciones.length - 1 ? 'border-b border-gray-50' : ''}">
      <span class="font-bold">${codigo}</span>
      <span class="text-gray-500">${distancia} km · PGA ${pga.toFixed(2)}</span>
    </div>
  `).join('');
}

// -------------------------------------------------------------
// Carga del JSON (se usa para la forma de onda del sismo de Valle Central)
// -------------------------------------------------------------
async function fetchSeismicData() {
  try {
    const response = await fetch('datos_sismicos_procesados.json');
    if (!response.ok) throw new Error('No se pudo cargar el archivo local');
    globalSeismicData = await response.json();
  } catch (error) {
    console.warn('Utilizando datos predeterminados:', error);
    globalSeismicData = getFallbackData();
  }
}

// -------------------------------------------------------------
// Mapas (Leaflet)
// -------------------------------------------------------------
function initMainMap() {
  if (mainMap) mainMap.remove();
  const mapElement = document.getElementById('map-main');
  if (!mapElement) return;

  mainMap = L.map('map-main', { zoomControl: false, attributionControl: false })
    .setView([UBICACION_USUARIO.lat, UBICACION_USUARIO.lng], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mainMap);

  // Epicentros de hoy: rojo solo para magnitudes criticas
  eventosDisponibles().filter(e => e.dias === 0).forEach(e => {
    L.circleMarker([e.lat, e.lng], {
      radius: 4 + e.mag * 1.5,
      fillColor: esCritico(e.mag) ? '#880000' : '#6B7280',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(mainMap).on('click', () => abrirDetalle(e.id));
  });

  // Ubicacion del usuario
  L.circleMarker([UBICACION_USUARIO.lat, UBICACION_USUARIO.lng], {
    radius: 4,
    fillColor: '#000000',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(mainMap);
}

function initDetailMap() {
  if (detailMap) detailMap.remove();
  const mapElement = document.getElementById('map-detail');
  if (!mapElement) return;

  const e = buscarEvento(eventoSeleccionado);
  detailMap = L.map('map-detail', { zoomControl: false, attributionControl: false }).setView([e.lat, e.lng], 8);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(detailMap);

  L.circleMarker([e.lat, e.lng], {
    radius: 10,
    fillColor: esCritico(e.mag) ? '#880000' : '#374151',
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(detailMap);
}

// -------------------------------------------------------------
// Sismograma con Chart.js usando las mediciones del JSON
// Solo el sismo de Valle Central tiene registro de forma de onda
// -------------------------------------------------------------
function renderWaveformChart() {
  const ctx = document.getElementById('waveform-chart');
  if (!ctx) return;
  if (waveformChart) waveformChart.destroy();

  const e = buscarEvento(eventoSeleccionado);
  const caja = document.getElementById('detail-wave-box');
  const vacio = document.getElementById('detail-wave-vacio');
  const leyenda = document.getElementById('detail-wave-caption');

  const datos = globalSeismicData && Array.isArray(globalSeismicData.datos_grafica)
    ? globalSeismicData.datos_grafica
    : [];

  if (!e.conFormaDeOnda || datos.length === 0) {
    caja.classList.add('hidden');
    vacio.classList.remove('hidden');
    leyenda.classList.add('hidden');
    return;
  }

  caja.classList.remove('hidden');
  vacio.classList.add('hidden');
  leyenda.classList.remove('hidden');

  // Muestra representativa de ~100 puntos para la pantalla movil
  const timeLabels = [];
  const amplitudeData = [];
  const step = Math.max(1, Math.floor(datos.length / 100));
  for (let i = 0; i < datos.length; i += step) {
    const item = datos[i];
    const date = new Date(item.timestamp_iso);
    timeLabels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    amplitudeData.push(item.Amplitud);
  }

  const pico = globalSeismicData.metricas_criticas && globalSeismicData.metricas_criticas.pico_maximo_amplitud;
  leyenda.innerText = `Canal HHZ · Estación VC-01${pico ? ` · Pico ${pico} cuentas` : ''}`;

  waveformChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'Amplitud',
        data: amplitudeData,
        borderColor: '#880000',
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

// -------------------------------------------------------------
// Modal de filtros (hoja inferior)
// -------------------------------------------------------------
function openFilterModal() {
  const modal = document.getElementById('filter-modal');
  const content = document.getElementById('filter-modal-content');
  cargarBorradorEnModal();

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

// Tocar el fondo oscuro cierra el modal sin aplicar cambios
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

// -------------------------------------------------------------
// Efecto interactivo de Figma: resalta los botones al tocar fuera de ellos
// -------------------------------------------------------------
function setupFigmaClickFeedback() {
  const container = document.getElementById('device-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('.interactive-btn, .interruptor, button, input, select, label, a');
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

// Datos de respaldo si no se puede leer el JSON
function getFallbackData() {
  return {
    metricas_criticas: {
      alerta_disparada: true,
      pico_maximo_amplitud: 2920.0,
      timestamp_alerta: '2024-05-12T00:46:59Z'
    },
    datos_grafica: []
  };
}
