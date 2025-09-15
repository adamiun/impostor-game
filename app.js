// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  databaseURL: "https://TU_PROJECT.firebaseio.com",
  projectId: "TU_PROJECT",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxx"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elementos del DOM
const estado = document.getElementById("estado");
const nombreJugadorInput = document.getElementById("nombreJugador");
const codigoSalaInput = document.getElementById("codigoSala");
const crearSalaBtn = document.getElementById("crearSala");
const unirseSalaBtn = document.getElementById("unirseSala");
const listaJugadores = document.getElementById("listaJugadores");
const asignarRolesBtn = document.getElementById("asignarRolesBtn");
const iniciarVotacionBtn = document.getElementById("iniciarVotacionBtn");
const nuevaRondaBtn = document.getElementById("nuevaRondaBtn"); // <--- NUEVO BOTÓN
const votacionDiv = document.getElementById("votacion");
const selectVoto = document.getElementById("selectVoto");
const votarBtn = document.getElementById("votarBtn");
const tuRol = document.getElementById("tuRol");
const anuncio = document.getElementById("anuncio");

// Variables globales
let salaId = null;
let jugadorId = localStorage.getItem("jugadorId") || null;
let nombreJugador = "";
let esHost = false;

// Utilidad: generar IDs cortos
function generarId() {
  return Math.random().toString(36).substring(2, 9);
}

// Crear sala
crearSalaBtn.onclick = () => {
  if (!nombreJugadorInput.value.trim()) {
    alert("Ingresa tu nombre");
    return;
  }
  salaId = generarId();
  jugadorId = generarId();
  localStorage.setItem("jugadorId", jugadorId);
  nombreJugador = nombreJugadorInput.value.trim();
  esHost = true;

  set(ref(db, "salas/" + salaId), {
    host: jugadorId,
    jugadores: {
      [jugadorId]: { nombre: nombreJugador, rol: null, eliminado: false }
    },
    estado: "esperando",
    votos: {},
    anuncio: null
  });

  estado.innerText = `Sala creada. Código: ${salaId}`;
  escucharSala();
};

// Unirse a sala
unirseSalaBtn.onclick = async () => {
  if (!nombreJugadorInput.value.trim() || !codigoSalaInput.value.trim()) {
    alert("Ingresa tu nombre y código de sala");
    return;
  }

  salaId = codigoSalaInput.value.trim();
  nombreJugador = nombreJugadorInput.value.trim();

  if (!jugadorId) {
    jugadorId = generarId();
    localStorage.setItem("jugadorId", jugadorId);
  }

  const salaRef = ref(db, "salas/" + salaId);
  const snap = await get(salaRef);

  if (!snap.exists()) {
    alert("Sala no encontrada");
    return;
  }

  esHost = snap.val().host === jugadorId;

  // Añadir jugador si no existe aún
  if (!snap.val().jugadores || !snap.val().jugadores[jugadorId]) {
    update(salaRef, {
      ["jugadores/" + jugadorId]: { nombre: nombreJugador, rol: null, eliminado: false }
    });
  }

  estado.innerText = `Unido a la sala ${salaId}`;
  escucharSala();
};

// Escuchar cambios de la sala
function escucharSala() {
  const salaRef = ref(db, "salas/" + salaId);
  onValue(salaRef, (snapshot) => {
    const sala = snapshot.val();
    if (!sala) return;

    // Mostrar lista de jugadores
    listaJugadores.innerHTML = "";
    Object.entries(sala.jugadores || {}).forEach(([id, jugador]) => {
      const li = document.createElement("li");
      li.innerText = jugador.eliminado ? `${jugador.nombre} (eliminado)` : jugador.nombre;
      listaJugadores.appendChild(li);
    });

    // Mostrar controles solo al host
    asignarRolesBtn.style.display = esHost && sala.estado === "esperando" ? "block" : "none";
    iniciarVotacionBtn.style.display = esHost && sala.estado === "rolesAsignados" ? "block" : "none";
    nuevaRondaBtn.style.display = esHost && sala.estado === "terminado" ? "block" : "none"; // <--- NUEVO

    // Mostrar rol personal
    const miInfo = sala.jugadores ? sala.jugadores[jugadorId] : null;
    if (miInfo && miInfo.rol) {
      tuRol.style.display = "block";
      tuRol.innerText = `Tu rol: ${miInfo.rol}`;
      tuRol.style.background = miInfo.rol === "Impostor" ? "crimson" : "steelblue";
    }

    // Manejar votación
    if (sala.estado === "votando") {
      votacionDiv.style.display = miInfo && !miInfo.eliminado ? "block" : "none";

      // Llenar opciones con IDs correctos
      selectVoto.innerHTML = "";
      Object.entries(sala.jugadores).forEach(([id, jugador]) => {
        if (!jugador.eliminado && id !== jugadorId) {
          const opt = document.createElement("option");
          opt.value = id; // Guardar el id, no solo el nombre
          opt.text = jugador.nombre;
          selectVoto.appendChild(opt);
        }
      });
    } else {
      votacionDiv.style.display = "none";
    }

    // Anuncio si existe
    if (sala.anuncio) {
      anuncio.style.display = "block";
      anuncio.innerText = sala.anuncio;
    } else {
      anuncio.style.display = "none";
    }
  });
}

// Asignar roles (solo host)
asignarRolesBtn.onclick = async () => {
  const salaRef = ref(db, "salas/" + salaId);
  const snap = await get(salaRef);
  const sala = snap.val();
  if (!sala) return;

  const jugadoresIds = Object.keys(sala.jugadores);
  if (jugadoresIds.length < 3) {
    alert("Se necesitan al menos 3 jugadores");
    return;
  }

  const impostorId = jugadoresIds[Math.floor(Math.random() * jugadoresIds.length)];
  const famosos = ["Brad Pitt", "Angelina Jolie", "Tom Cruise", "Shakira", "Messi", "Rihanna"];
  let fIndex = 0;

  jugadoresIds.forEach((id) => {
    const rol = id === impostorId ? "Impostor" : famosos[fIndex++ % famosos.length];
    sala.jugadores[id].rol = rol;
    sala.jugadores[id].eliminado = false;
  });

  sala.estado = "rolesAsignados";
  sala.votos = {};
  sala.anuncio = null;
  await set(salaRef, sala);
};

// Iniciar votación (solo host)
iniciarVotacionBtn.onclick = () => {
  update(ref(db, "salas/" + salaId), {
    estado: "votando",
    votos: {},
    anuncio: null
  });
};

// Botón Nueva Ronda (solo host)
nuevaRondaBtn.onclick = async () => {
  const salaRef = ref(db, "salas/" + salaId);
  const snap = await get(salaRef);
  const sala = snap.val();
  if (!sala) return;

  // Resetear estado para permitir otra asignación de roles
  Object.keys(sala.jugadores).forEach((id) => {
    sala.jugadores[id].rol = null;
    sala.jugadores[id].eliminado = false;
  });
  sala.estado = "esperando";
  sala.votos = {};
  sala.anuncio = null;

  await set(salaRef, sala);
};

// Votar
votarBtn.onclick = async () => {
  const elegidoId = selectVoto.value;
  if (!elegidoId) return;

  const salaRef = ref(db, "salas/" + salaId);
  const snap = await get(salaRef);
  const sala = snap.val();
  if (!sala) return;

  sala.votos[jugadorId] = elegidoId;
  await set(salaRef, sala);

  anuncio.style.display = "block";
  anuncio.innerText = "Has votado. Espera a que todos terminen.";
  
  // Verificar si ya votaron todos los no eliminados
  const vivos = Object.entries(sala.jugadores).filter(([id, j]) => !j.eliminado).map(([id]) => id);
  if (Object.keys(sala.votos).length === vivos.length) {
    procesarVotos(sala);
  }
};

// Procesar votos
async function procesarVotos(sala) {
  const conteo = {};
  Object.values(sala.votos).forEach((id) => {
    conteo[id] = (conteo[id] || 0) + 1;
  });

  let eliminadoId = Object.keys(conteo).reduce((a, b) => (conteo[a] > conteo[b] ? a : b));
  sala.jugadores[eliminadoId].eliminado = true;

  let msg;
  if (sala.jugadores[eliminadoId].rol === "Impostor") {
    msg = `🎉 Juego terminado. Han eliminado al impostor (${sala.jugadores[eliminadoId].nombre}).`;
    sala.estado = "terminado";
  } else {
    msg = `❌ ${sala.jugadores[eliminadoId].nombre} era inocente. Continúa otra ronda.`;
    sala.estado = "rolesAsignados";
  }

  sala.anuncio = msg;
  sala.votos = {};

  await set(ref(db, "salas/" + salaId), sala);
}
