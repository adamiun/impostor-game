// app.js (versión corregida y mejorada con roles visibles)
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

// Lista de famosos
const famosos = ["Brad Pitt", "Angelina Jolie", "Tom Cruise", "Scarlett Johansson", "Leonardo DiCaprio"];

// Referencias a elementos HTML
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
let soyHost = false;

// ---------- HELPERS ----------

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

    if (!p.eliminado && p.nombre !== nombreJugador) {
      const opt = document.createElement("option");
      opt.value = p.nombre;
      opt.textContent = p.nombre;
      selectVoto.appendChild(opt);
    }
  });
}

function actualizarControles(sala) {
  if (!sala) return;

  soyHost = !!(nombreJugador && sala.host === nombreJugador);

  if (soyHost) asignarRolesBtn.style.display = "inline-block";
  else asignarRolesBtn.style.display = "none";

  const rolesAsignados = sala.jugadores && Object.values(sala.jugadores).some(j => j.rol && j.rol !== "Pendiente");
  if (soyHost && rolesAsignados && sala.estado !== "votacion" && sala.estado !== "terminado") {
    iniciarVotacionBtn.style.display = "inline-block";
  } else {
    iniciarVotacionBtn.style.display = "none";
  }

  if (sala.estado === "votacion") {
    const miInfo = sala.jugadores ? Object.values(sala.jugadores).find(p => p.nombre === nombreJugador) : null;
    if (miInfo && !miInfo.eliminado) {
      votacionDiv.style.display = "block";
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

  if (sala.anuncio) {
    anuncio.style.display = "block";
    anuncio.innerText = sala.anuncio;
    if (sala.anuncio.includes("impostor")) anuncio.style.background = "green";
    else if (sala.anuncio.includes("inocente")) anuncio.style.background = "orange";
    else anuncio.style.background = "gray";
  } else {
    anuncio.style.display = "none";
  }

  // 🔥 Mostrar el rol del jugador
  const miInfo = sala.jugadores ? sala.jugadores[nombreJugador] : null;
  if (miInfo && miInfo.rol && miInfo.rol !== "Pendiente") {
    tuRol.style.display = "block";
    tuRol.innerText = `Tu rol: ${miInfo.rol}`;
    tuRol.style.background = (miInfo.rol === "Impostor") ? "red" : "blue";
    tuRol.style.color = "white";
  }
}

function escucharSala(codigo) {
  const salaRef = ref(db, `salas/${codigo}`);
  onValue(salaRef, async snapshot => {
    if (!snapshot.exists()) return;
    const sala = snapshot.val();

    renderJugadores(codigo, sala);
    actualizarControles(sala);

    if (sala.estado === "votacion") {
      const votos = sala.votos || {};
      const jugadores = sala.jugadores || {};
      const vivos = Object.values(jugadores).filter(p => !p.eliminado);
      const totalVivos = vivos.length;
      const totalVotos = Object.keys(votos).length;

      if (totalVotos >= totalVivos && totalVivos > 0) {
        const conteo = {};
        Object.values(votos).forEach(v => {
          if (v && v.voto) conteo[v.voto] = (conteo[v.voto] || 0) + 1;
        });

        let maxCount = 0;
        Object.keys(conteo).forEach(name => { if (conteo[name] > maxCount) maxCount = conteo[name]; });
        const candidatos = Object.keys(conteo).filter(name => conteo[name] === maxCount);

        if (candidatos.length === 0) {
          await update(ref(db, `salas/${codigo}`), { estado: "esperando", votos: {}, anuncio: "🔷 Empate / votos insuficientes. Nadie es eliminado." });
        } else if (candidatos.length > 1) {
          await update(ref(db, `salas/${codigo}`), { estado: "esperando", votos: {}, anuncio: "🔷 Empate en la votación. Nadie es eliminado." });
        } else {
          const eliminadoNombre = candidatos[0];
          await update(ref(db, `salas/${codigo}/jugadores/${eliminadoNombre}`), { eliminado: true });

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

crearSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value?.trim();
  if (!nombreJugador) { alert("Pon tu nombre"); return; }

  const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
  codigoSalaActual = codigo;

  await set(ref(db, `salas/${codigo}`), {
    host: nombreJugador,
    jugadores: { [nombreJugador]: { nombre: nombreJugador, rol: "Pendiente", eliminado: false } },
    estado: "esperando",
    votos: {}
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
  escucharSala(codigo);
});

unirseSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value?.trim();
  const codigo = codigoInput.value?.toUpperCase()?.trim();
  if (!nombreJugador || !codigo) { alert("Pon tu nombre y código de sala"); return; }
  codigoSalaActual = codigo;

  await set(ref(db, `salas/${codigo}/jugadores/${nombreJugador}`), { nombre: nombreJugador, rol: "Pendiente", eliminado: false });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;
  escucharSala(codigo);
});

asignarRolesBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;

  const salaSnap = await get(ref(db, `salas/${codigoSalaActual}`));
  const sala = salaSnap.exists() ? salaSnap.val() : null;
  if (!sala) return;
  if (sala.host !== nombreJugador) { alert("Solo el host puede asignar roles."); return; }

  const jugadoresKeys = Object.keys(sala.jugadores || {});
  const impostorIndex = Math.floor(Math.random() * jugadoresKeys.length);
  for (let i = 0; i < jugadoresKeys.length; i++) {
    const key = jugadoresKeys[i];
    const rolAsignado = (i === impostorIndex) ? "Impostor" : famosos[Math.floor(Math.random() * famosos.length)];
    await update(ref(db, `salas/${codigoSalaActual}/jugadores/${key}`), { rol: rolAsignado, eliminado: false });
  }

  await update(ref(db, `salas/${codigoSalaActual}`), { estado: "esperando", votos: {}, anuncio: null });
});

iniciarVotacionBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;

  const salaSnap = await get(ref(db, `salas/${codigoSalaActual}`));
  const sala = salaSnap.exists() ? salaSnap.val() : null;
  if (!sala) return;
  if (sala.host !== nombreJugador) { alert("Solo el host puede iniciar la votación."); return; }

  await update(ref(db, `salas/${codigoSalaActual}`), { estado: "votacion", votos: {}, anuncio: null });

  iniciarVotacionBtn.style.display = "none";
  estado.innerText = "🗳️ Votación iniciada. Elige y vota.";
});

votarBtn.addEventListener("click", async () => {
  if (!codigoSalaActual || !nombreJugador) return;
  const elegido = selectVoto.value;
  if (!elegido) return alert("Selecciona a quién votar.");

  await update(ref(db, `salas/${codigoSalaActual}/votos/${nombreJugador}`), { voto: elegido });

  selectVoto.disabled = true;
  votarBtn.disabled = true;
  estado.innerText = `🗳️ Has votado por ${elegido}. Esperando a los demás...`;
});
