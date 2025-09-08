// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuración Firebase
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
const tuRol = document.getElementById("tuRol");
const votacionDiv = document.getElementById("votacion");
const selectVoto = document.getElementById("selectVoto");
const votarBtn = document.getElementById("votarBtn");
const anuncio = document.getElementById("anuncio");

let host = null;
let codigoSalaActual = null;
let nombreJugador = null;

// Escuchar jugadores
function escucharJugadores(codigo) {
  const jugadoresRef = ref(db, `salas/${codigo}/jugadores`);
  onValue(jugadoresRef, snapshot => {
    listaJugadores.innerHTML = "";
    selectVoto.innerHTML = "";
    if(snapshot.exists()){
      const jugadores = snapshot.val();
      Object.keys(jugadores).forEach(j => {
        const li = document.createElement("li");
        li.textContent = jugadores[j].nombre + (jugadores[j].eliminado ? " ❌" : "");
        listaJugadores.appendChild(li);

        if(!jugadores[j].eliminado){
          const option = document.createElement("option");
          option.value = j;
          option.textContent = jugadores[j].nombre;
          selectVoto.appendChild(option);
        }
      });
    }
  });
}

// Escuchar rol privado
function escucharRolPrivado(nombre, codigo) {
  const jugadorRef = ref(db, `salas/${codigo}/jugadores/${nombre}`);
  onValue(jugadorRef, snapshot => {
    if(snapshot.exists()){
      const datos = snapshot.val();
      if(datos.rol !== "Pendiente"){
        tuRol.innerText = `🎭 Tu rol es: ${datos.rol}`;
        tuRol.style.display = "block";
        tuRol.style.backgroundColor = datos.rol === "Impostor" ? "red" : "green";
      }
    }
  });
}

// Escuchar estado de votación
function escucharVotacion(codigo) {
  const salaRef = ref(db, `salas/${codigo}`);
  onValue(salaRef, snapshot => {
    if(snapshot.exists()){
      const datos = snapshot.val();
      if(datos.estado === "votacion"){
        votacionDiv.style.display = "block";
      } else {
        votacionDiv.style.display = "none";
      }

      if(datos.anuncio){
        anuncio.style.display = "block";
        anuncio.innerText = datos.anuncio;
        anuncio.style.background = datos.anuncio.includes("impostor") ? "green" : "red";
      } else {
        anuncio.style.display = "none";
      }
    }
  });
}

// Crear sala
crearSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value;
  if(!nombreJugador){ alert("Pon tu nombre"); return; }

  const codigo = Math.random().toString(36).substring(2,7).toUpperCase();
  codigoSalaActual = codigo;
  host = nombreJugador;

  await set(ref(db, `salas/${codigo}`), {
    host: nombreJugador,
    jugadores: { [nombreJugador]: { nombre: nombreJugador, rol: "Pendiente", eliminado: false } },
    estado: "esperando"
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
  asignarRolesBtn.style.display = "inline-block";

  escucharJugadores(codigo);
  escucharRolPrivado(nombreJugador, codigo);
  escucharVotacion(codigo);
});

// Unirse a sala
unirseSalaBtn.addEventListener("click", async () => {
  nombreJugador = nombreInput.value;
  const codigo = codigoInput.value.toUpperCase();
  if(!nombreJugador || !codigo){ alert("Pon tu nombre y código de sala"); return; }

  codigoSalaActual = codigo;

  await set(ref(db, `salas/${codigo}/jugadores/${nombreJugador}`), { nombre: nombreJugador, rol: "Pendiente", eliminado: false });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;

  escucharJugadores(codigo);
  escucharRolPrivado(nombreJugador, codigo);
  escucharVotacion(codigo);
});

// Asignar roles
asignarRolesBtn.addEventListener("click", async () => {
  if(!host || !codigoSalaActual) return;

  const snapshot = await get(ref(db, `salas/${codigoSalaActual}/jugadores`));
  if(snapshot.exists()){
    const jugadores = Object.keys(snapshot.val());
    const impostor = jugadores[Math.floor(Math.random()*jugadores.length)];
    const famoso = famosos[Math.floor(Math.random()*famosos.length)];

    for(let jugador of jugadores){
      await update(ref(db, `salas/${codigoSalaActual}/jugadores/${jugador}`), {
        rol: jugador === impostor ? "Impostor" : famoso,
        eliminado: false
      });
    }

    // Mostrar botón de votación al host
    iniciarVotacionBtn.style.display = "inline-block";
  }
});

// Iniciar votación
iniciarVotacionBtn.addEventListener("click", async () => {
  if(!host || !codigoSalaActual) return;
  await update(ref(db, `salas/${codigoSalaActual}`), { estado: "votacion", votos: {}, anuncio: null });
});

// Votar
votarBtn.addEventListener("click", async () => {
  if(!codigoSalaActual || !nombreJugador) return;
  const elegido = selectVoto.value;
  await update(ref(db, `salas/${codigoSalaActual}/votos/${nombreJugador}`), { voto: elegido });

  estado.innerText = `✅ Votaste por ${elegido}`;
});

// Recuento de votos (host)
onValue(ref(db, `salas`), async snapshot => {
  if(snapshot.exists()){
    const salas = snapshot.val();
    if(codigoSalaActual && salas[codigoSalaActual]){
      const sala = salas[codigoSalaActual];
      if(sala.estado === "votacion" && sala.votos){
        const votos = sala.votos;
        const conteo = {};
        Object.values(votos).forEach(v => {
          if(v.voto){
            conteo[v.voto] = (conteo[v.voto] || 0) + 1;
          }
        });

        const totalVotos = Object.keys(votos).length;
        const totalJugadores = Object.keys(sala.jugadores).filter(j => !sala.jugadores[j].eliminado).length;

        if(totalVotos === totalJugadores){
          let eliminado = Object.keys(conteo).reduce((a,b) => conteo[a] > conteo[b] ? a : b);
          await update(ref(db, `salas/${codigoSalaActual}/jugadores/${eliminado}`), { eliminado: true });

          if(sala.jugadores[eliminado].rol === "Impostor"){
            await update(ref(db, `salas/${codigoSalaActual}`), { estado: "terminado", anuncio: "🎉 ¡Han matado al impostor! Juego terminado." });
          } else {
            await update(ref(db, `salas/${codigoSalaActual}`), { estado: "esperando", votos: {}, anuncio: "❌ Mataron a un inocente. Nueva ronda." });
          }
        }
      }
    }
  }
});
