// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuración de Firebase
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
const famosos = [
  "Brad Pitt","Angelina Jolie","Tom Cruise","Scarlett Johansson","Leonardo DiCaprio",
  "Shakira","Rihanna","Beyoncé","Michael Jordan","Cristiano Ronaldo",
  "Messi","Dua Lipa","Billie Eilish","Katy Perry","Jennifer Lopez",
  "Will Smith","Johnny Depp","Robert Downey Jr.","Chris Hemsworth","Mark Zuckerberg",
  "Elon Musk","Jeff Bezos","Taylor Swift","Kanye West","Adele",
  "Emma Watson","Daniel Radcliffe","Rupert Grint","Selena Gomez","Miley Cyrus",
  "Harry Styles","Zayn Malik","Justin Bieber","Lady Gaga","Ed Sheeran",
  "Post Malone","Drake","Eminem","Ariana Grande","Kim Kardashian",
  "Kylie Jenner","Zendaya","Timothée Chalamet","Gal Gadot","Keanu Reeves",
  "Vin Diesel","Dwayne Johnson","Jason Momoa","Chris Evans","Natalie Portman"
];

// Referencias a elementos del HTML
const crearSalaBtn = document.getElementById("crearSala");
const unirseSalaBtn = document.getElementById("unirseSala");
const nombreInput = document.getElementById("nombreJugador");
const codigoInput = document.getElementById("codigoSala");
const estado = document.getElementById("estado");
const listaJugadores = document.getElementById("listaJugadores");
const asignarRolesBtn = document.getElementById("asignarRolesBtn");
const iniciarVotacionBtn = document.getElementById("iniciarVotacionBtn");
const opcionesVotacion = document.getElementById("opcionesVotacion");
const tuRol = document.getElementById("tuRol");

let host = null;
let codigoSalaActual = null;
let miNombre = null;

// ---------------------- FUNCIONES ----------------------

// Mostrar jugadores en tiempo real
function escucharJugadores(codigo) {
  const jugadoresRef = ref(db, `salas/${codigo}/jugadores`);
  onValue(jugadoresRef, snapshot => {
    listaJugadores.innerHTML = "";
    if(snapshot.exists()){
      const jugadores = snapshot.val();
      Object.keys(jugadores).forEach(j => {
        const li = document.createElement("li");
        const jugador = jugadores[j];
        li.textContent = jugador.nombre + (jugador.estado === "eliminado" ? " ☠️" : "");
        li.style.fontSize = "1.1em";
        li.style.opacity = jugador.estado === "eliminado" ? "0.5" : "1";
        listaJugadores.appendChild(li);
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
        tuRol.style.color = "white";
      }
    }
  });
}

// Escuchar fase de juego
function escucharFase(codigo) {
  const faseRef = ref(db, `salas/${codigo}/fase`);
  onValue(faseRef, snapshot => {
    if(snapshot.exists()){
      const fase = snapshot.val();
      if(fase === "votacion"){
        mostrarOpcionesVotacion();
      } else {
        opcionesVotacion.innerHTML = "";
      }
    }
  });
}

// Mostrar opciones de votación
function mostrarOpcionesVotacion() {
  const jugadoresRef = ref(db, `salas/${codigoSalaActual}/jugadores`);
  get(jugadoresRef).then(snapshot => {
    if(snapshot.exists()){
      const jugadores = snapshot.val();
      opcionesVotacion.innerHTML = "<h3>Vota por alguien:</h3>";
      Object.keys(jugadores).forEach(j => {
        const jugador = jugadores[j];
        if(jugador.estado === "vivo" && jugador.nombre !== miNombre){
          const btn = document.createElement("button");
          btn.textContent = `Votar por ${jugador.nombre}`;
          btn.onclick = () => emitirVoto(jugador.nombre);
          opcionesVotacion.appendChild(btn);
        }
      });
    }
  });
}

// Emitir voto
function emitirVoto(votado) {
  update(ref(db, `salas/${codigoSalaActual}/votos/${miNombre}`), votado);
}

// Contar votos y mostrar resultado
async function contarVotos() {
  const votosSnap = await get(ref(db, `salas/${codigoSalaActual}/votos`));
  const jugadoresSnap = await get(ref(db, `salas/${codigoSalaActual}/jugadores`));

  if(votosSnap.exists() && jugadoresSnap.exists()){
    const votos = votosSnap.val();
    const jugadores = jugadoresSnap.val();

    // Contar
    let conteo = {};
    Object.values(votos).forEach(v => {
      conteo[v] = (conteo[v] || 0) + 1;
    });

    // Encontrar más votado
    let eliminado = null;
    let max = 0;
    Object.keys(conteo).forEach(nombre => {
      if(conteo[nombre] > max){
        max = conteo[nombre];
        eliminado = nombre;
      }
    });

    if(eliminado){
      // Actualizar estado del jugador eliminado
      await update(ref(db, `salas/${codigoSalaActual}/jugadores/${eliminado}`), { estado: "eliminado" });

      if(jugadores[eliminado].rol === "Impostor"){
        alert("🎉 Juego terminado: han eliminado al impostor");
      } else {
        alert("⚠️ Mataron a un inocente, sigue otra ronda");
        // Reiniciar fase
        await update(ref(db, `salas/${codigoSalaActual}`), { fase: "esperando", votos: null });
      }
    }
  }
}

// ---------------------- EVENTOS ----------------------

// Crear sala
crearSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  if(!nombre){ alert("Pon tu nombre"); return; }

  const codigo = Math.random().toString(36).substring(2,7).toUpperCase();
  codigoSalaActual = codigo;
  miNombre = nombre;
  host = nombre;

  await set(ref(db, `salas/${codigo}`), {
    host: nombre,
    jugadores: { [nombre]: { nombre, rol: "Pendiente", estado: "vivo" } },
    estado: "jugando",
    fase: "esperando"
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
  asignarRolesBtn.style.display = "inline-block";
  iniciarVotacionBtn.style.display = "inline-block";

  escucharJugadores(codigo);
  escucharRolPrivado(nombre, codigo);
  escucharFase(codigo);
});

// Unirse a sala
unirseSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  const codigo = codigoInput.value.toUpperCase();
  if(!nombre || !codigo){ alert("Pon tu nombre y código de sala"); return; }

  codigoSalaActual = codigo;
  miNombre = nombre;

  await set(ref(db, `salas/${codigo}/jugadores/${nombre}`), { nombre, rol: "Pendiente", estado: "vivo" });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;

  escucharJugadores(codigo);
  escucharRolPrivado(nombre, codigo);
  escucharFase(codigo);
});

// Asignar roles (solo host)
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
        estado: "vivo"
      });
    }
  }
});

// Iniciar votación (host)
iniciarVotacionBtn.addEventListener("click", async () => {
  await update(ref(db, `salas/${codigoSalaActual}`), { fase: "votacion", votos: {} });
  setTimeout(contarVotos, 15000); // 15 seg para votar
});
