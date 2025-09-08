// app.js (versión corregida y mejorada)
// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuración Firebase (usa tu config)
const firebaseConfig = {
  apiKey: "AIzaSyB0uGD9OPVzPEZLBokRiCAlhvyJ9oaxF2Y",
  authDomain: "el-impostor-801.firebaseapp.com",
  databaseURL: "https://el-impostor-801-default-rtdb.firebaseio.com/",
  projectId: "el-impostor-801",
  storageBucket: "el-impostor-801.firebasestorage.app",
  messagingSenderId: "409123127795",
  appId: "1:409123127795:web:a0c7c2e421bbdc197b9286",
  measurementId: "G-43PKD2H5QM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Lista de famosos (puedes usar tu lista completa)
const famosos = ["Brad Pitt", "Angelina Jolie", "Tom Cruise", "Scarlett Johansson", "Leonardo DiCaprio"];

// Referencias a elementos HTML (asegúrate IDs coincidan con tu index.html)
const crearSalaBtn = document.getElementById("crearSala");
const unirseSalaBtn = document.getElementById("unirseSala");
const nombreInput = document.getElementById("nombreJugador");
const codigoInput = document.getElementById("codigoSala");
const estado = document.getElementById("estado");
const listaJugadores = document.getElementById("listaJugadores");
const asignarRolesBtn = document.getElementById("asignarRolesBtn");
const iniciarVotacionBtn = document.getElementById("iniciarVotacionBtn");
const votacionDiv = document.getElementById("votacion");
const selectVoto = document.getElementById("selectVoto");
const votarBtn = document.getElementById("votarBtn");
const tuRol = document.getElementById("tuRol");
const anuncio = document.getElementById("anuncio");

// Estado local
let codigoSalaActual = null;
let nombreJugador = null;
let soyHost = false; // se actualizará leyendo la sala desde Firebase

// ---------- HELPERS ----------

// Actualiza la UI de la lista de jugadores y las opciones de voto
async function renderJugadores(codigo, salaData) {
  listaJugadores.innerHTML = "";
  selectVoto.innerHTML = "";

  if (!salaData || !salaData.jugadores) return;

  const jugadores = salaData.jugadores;
  Object.keys(jugadores).forEach(key => {
    const p = jugadores[key];
    const li = document.createElement("li");
    li.textContent = p.nombre + (p.eliminado ? " ❌" : "");
    li.style.opacity = p.eliminado ? "0.5" : "1";
    listaJugadores.appendChild(li);

    // Solo añadir opciones de voto si está vivo y NO es el mismo jugador
    if (!p.eliminado && p.nombre !== nombreJugador) {
      const opt = document.createElement("option");
      // guardamos el key (o el nombre) como value; aquí usamos el nombre como clave consistente
      opt.value = p.nombre;
      opt.textContent = p.nombre;
      selectVoto.appendChild(opt);
    }
  });
}

// Muestra/oculta controles según rol (host/jugador) y estado de sala
function actualizarControles(sala) {
  if (!sala) return;

  // Determinar si soy host comparando con el campo sala.host
  soyHost = !!(nombreJugador && sala.host === nombreJugador);

  // Mostrar botón asignar roles si soy host
  if (soyHost) asignarRolesBtn.style.display = "inline-block";
  else asignarRolesBtn.style.display = "none";

  // Mostrar botón iniciar votación solo si soy host, hay roles asignados y no estamos en votación
  const rolesAsignados = sala.jugadores && Object.values(sala.jugadores).some(j => j.rol && j.rol !== "Pendiente");
  if (soyHost && rolesAsignados && sala.estado !== "votacion" && sala.estado !== "terminado") {
    iniciarVotacionBtn.style.display = "inline-block";
  } else {
    iniciarVotacionBtn.style.display = "none";
  }

  // Mostrar la UI de votación a todos si la sala está en votacion y el jugador no está eliminado
  if (sala.estado === "votacion") {
    // Si mi propio estado es eliminado, no muestro votación
    const miInfo = sala.jugadores ? Object.values(sala.jugadores).find(p => p.nombre === nombreJugador) : null;
    if (miInfo && !miInfo.eliminado) {
      votacionDiv.style.display = "block";
      // Si ya voté, bloquear controles locales (esto se controla por la existencia de mi voto)
      if (sala.votos && sala.votos[nombreJugador]) {
        selectVoto.disabled = true;
        votarBtn.disabled = true;
        estado.innerText = `🗳️ Has votado. Esperando a los demás...`;
      } else {
        selectVoto.disabled = false;
        votarBtn.disabled = false;
      }
    } else {
      votacionDiv.style.display = "none";
    }
  } else {
    votacionDiv.style.display = "none";
    selectVoto.disabled = false;
    votarBtn.disabled = false;
  }

  // Mostrar anuncio si existe
  if (sala.anuncio) {
    anuncio.style.display = "block";
    anuncio.innerText = sala.anuncio;
    // Color simple: impostor eliminado -> verde, inocente -> naranja, empate -> gray
    if (sala.anuncio.includes("impostor")) anuncio.style.background = "green";
    else if (sala.anuncio.includes("inocente")) anuncio.style.background = "orange";
    else anuncio.style.background = "gray";
  } else {
    anuncio.style.display = "none";
  }
}

// Escuchar sala completa para reaccionar a cambios (host, estado, votos, anuncios...)
function escucharSala(codigo) {
  const salaRef = ref(db, `salas/${codigo}`);
  onValue(salaRef, async snapshot => {
    if (!snapshot.exists()) return;
    const sala = snapshot.val();

    // Actualiza local UI de jugadores y controles
    renderJugadores(codigo, sala);
    actualizarControles(sala);

    // Si la sala está en votacion, comprobar si todos los vivos ya votaron
    if (sala.estado === "votacion") {
      const votos = sala.votos || {};
      const jugadores = sala.jugadores || {};
      const vivos = Object.values(jugadores).filter(p => !p.eliminado);
      const totalVivos = vivos.length;
      const totalVotos = Object.keys(votos).length;

      // si todos votaron -> resolver
      if (totalVotos >= totalVivos && totalVivos > 0) {
        // Contar votos
        const conteo = {};
        Object.values(votos).forEach(v => {
          if (v && v.voto) conteo[v.voto] = (conteo[v.voto] || 0) + 1;
        });

        // Determinar máximo y detectar empates
        let maxCount = 0;
        Object.keys(conteo).forEach(name => { if (conteo[name] > maxCount) maxCount = conteo[name]; });
        const candidatos = Object.keys(conteo).filter(name => conteo[name] === maxCount);

        if (candidatos.length === 0) {
          // Ningún voto válido (raro) -> declarar empate semanticamente
          await update(ref(db, `salas/${codigo}`), { estado: "esperando", votos: {}, anuncio: "🔷 Empate / votos insuficientes. Nadie es eliminado." });
        } else if (candidatos.length > 1) {
          // Empate
          await update(ref(db, `salas/${codigo}`), { estado: "esperando", votos: {}, anuncio: "🔷 Empate en la votación. Nadie es eliminado." });
        } else {
          // Un único eliminado
          const eliminadoNombre = candidatos[0];

          // Marcar eliminado
          await update(ref(db, `salas/${codigo}/jugadores/${eliminadoNombre}`), { eliminado: true });

          // Revisar si era impostor
          const rolEliminado = (sala.jugadores && sala.jugadores[eliminadoNombre] && sala.jugadores[eliminadoNombre].rol) || "Desconocido";

          if (rolEliminado === "Impostor") {
            await update(ref(db, `salas/${codigo}`), { estado: "terminado", votos: {}, anuncio: "🎉 ¡Han matado al impostor! Juego terminado." });
          } else {
            await update(ref(db, `salas/${codigo}`), { estado: "esperando", votos: {}, anuncio: "❌ Mataron a un inocente. Nueva ronda." });
          }
        }
      }
    }
  });
}

// ---------- EVENTOS UI ----------

// Crear sala
crearSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value?.trim();
  if (!nombreJugador) { alert("Pon tu nombre"); return; }

  const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
  codigoSalaActual = codigo;

  // Crear sala en BD
  await set(ref(db, `salas/${codigo}`), {
    host: nombreJugador,
    jugadores: { [nombreJugador]: { nombre: nombreJugador, rol: "Pendiente", eliminado: false } },
    estado: "esperando",
    votos: {}
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
  // Escuchar la sala completa
  escucharSala(codigo);
});

// Unirse a sala
unirseSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value?.trim();
  const codigo = codigoInput.value?.toUpperCase()?.trim();
  if (!nombreJugador || !codigo) { alert("Pon tu nombre y código de sala"); return; }
  codigoSalaActual = codigo;

  // Agregar jugador
  await set(ref(db, `salas/${codigo}/jugadores/${nombreJugador}`), { nombre: nombreJugador, rol: "Pendiente", eliminado: false });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;
  escucharSala(codigo);
});

// Asignar roles (host)
asignarRolesBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;

  // Confirmar en BD quién es el host (robusto)
  const salaSnap = await get(ref(db, `salas/${codigoSalaActual}`));
  const sala = salaSnap.exists() ? salaSnap.val() : null;
  if (!sala) return;
  if (sala.host !== nombreJugador) { alert("Solo el host puede asignar roles."); return; }

  // Asignar roles (aleatorio)
  const jugadoresKeys = Object.keys(sala.jugadores || {});
  const impostorIndex = Math.floor(Math.random() * jugadoresKeys.length);
  for (let i = 0; i < jugadoresKeys.length; i++) {
    const key = jugadoresKeys[i];
    const rolAsignado = (i === impostorIndex) ? "Impostor" : famosos[Math.floor(Math.random() * famosos.length)];
    await update(ref(db, `salas/${codigoSalaActual}/jugadores/${key}`), { rol: rolAsignado, eliminado: false });
  }

  // Reiniciar estado de la sala
  await update(ref(db, `salas/${codigoSalaActual}`), { estado: "esperando", votos: {}, anuncio: null });
});

// Iniciar votación (host)
iniciarVotacionBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;

  const salaSnap = await get(ref(db, `salas/${codigoSalaActual}`));
  const sala = salaSnap.exists() ? salaSnap.val() : null;
  if (!sala) return;
  if (sala.host !== nombreJugador) { alert("Solo el host puede iniciar la votación."); return; }

  // Poner la sala en estado de votación y reiniciar votos
  await update(ref(db, `salas/${codigoSalaActual}`), { estado: "votacion", votos: {}, anuncio: null });

  // Feedback local inmediato
  iniciarVotacionBtn.style.display = "none";
  estado.innerText = "🗳️ Votación iniciada. Elige y vota.";
});

// Votar (jugadores)
votarBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;
  const elegido = selectVoto.value;
  if (!elegido) return alert("Selecciona a quién votar.");

  // Guardar voto bajo el nodo votos/{nombreJugador} = { voto: elegido }
  await update(ref(db, `salas/${codigoSalaActual}/votos/${nombreJugador}`), { voto: elegido });

  // UI local: bloquear controles y mostrar mensaje
  selectVoto.disabled = true;
  votarBtn.disabled = true;
  estado.innerText = `🗳️ Has votado por ${elegido}. Esperando a los demás...`;
});
