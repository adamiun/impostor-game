// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

// Lista de 50 famosos
const famosos = [
  "Brad Pitt", "Angelina Jolie", "Tom Cruise", "Scarlett Johansson", "Leonardo DiCaprio",
  "Shakira", "Rihanna", "Beyoncé", "Michael Jordan", "Cristiano Ronaldo",
  "Messi", "Dua Lipa", "Billie Eilish", "Katy Perry", "Jennifer Lopez",
  "Will Smith", "Johnny Depp", "Robert Downey Jr.", "Chris Hemsworth", "Mark Zuckerberg",
  "Elon Musk", "Jeff Bezos", "Taylor Swift", "Kanye West", "Adele",
  "Emma Watson", "Daniel Radcliffe", "Rupert Grint", "Selena Gomez", "Miley Cyrus",
  "Harry Styles", "Zayn Malik", "Justin Bieber", "Lady Gaga", "Ed Sheeran",
  "Post Malone", "Drake", "Eminem", "Ariana Grande", "Kim Kardashian",
  "Kylie Jenner", "Zendaya", "Timothée Chalamet", "Gal Gadot", "Keanu Reeves",
  "Vin Diesel", "Dwayne Johnson", "Jason Momoa", "Chris Evans", "Natalie Portman"
];

// Referencias a elementos del HTML
const crearSalaBtn = document.getElementById("crearSala");
const unirseSalaBtn = document.getElementById("unirseSala");
const nombreInput = document.getElementById("nombreJugador");
const codigoInput = document.getElementById("codigoSala");
const estado = document.getElementById("estado");
const listaJugadores = document.getElementById("listaJugadores");
const asignarRolesBtn = document.getElementById("asignarRolesBtn");
const tuRol = document.getElementById("tuRol");

let host = null;
let codigoSalaActual = null;

// Función para mostrar lista de jugadores en tiempo real
function escucharJugadores(codigo) {
  const jugadoresRef = ref(db, `salas/${codigo}/jugadores`);
  onValue(jugadoresRef, snapshot => {
    listaJugadores.innerHTML = "";
    if(snapshot.exists()){
      const jugadores = snapshot.val();
      Object.keys(jugadores).forEach(j => {
        const li = document.createElement("li");
        li.textContent = jugadores[j].nombre;
        li.style.fontSize = "1.1em"; // Ajuste visual para móviles
        listaJugadores.appendChild(li);
      });
    }
  });
}

// Función para escuchar el rol privado con animación y color
function escucharRolPrivado(nombre, codigo) {
  const jugadorRef = ref(db, `salas/${codigo}/jugadores/${nombre}`);
  onValue(jugadorRef, snapshot => {
    if(snapshot.exists()){
      const datos = snapshot.val();
      if(datos.rol !== "Pendiente"){
        tuRol.innerText = `🎭 Tu rol es: ${datos.rol}`;
        tuRol.style.display = "block";

        // Colores y estilo
        tuRol.style.backgroundColor = datos.rol === "Impostor" ? "red" : "green";
        tuRol.style.color = "white";
        tuRol.style.padding = "20px";
        tuRol.style.borderRadius = "10px";
        tuRol.style.textAlign = "center";
        tuRol.style.fontWeight = "bold";
        tuRol.style.fontSize = "1.5em";
        tuRol.style.width = "80%";
        tuRol.style.maxWidth = "400px";

        // Animación
        tuRol.style.opacity = 0;
        tuRol.style.transform = "scale(0.5)";
        tuRol.style.transition = "all 0.5s ease";
        setTimeout(() => {
          tuRol.style.opacity = 1;
          tuRol.style.transform = "scale(1)";
        }, 50);
      }
    }
  });
}

// Crear sala
crearSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  if(!nombre){ alert("Pon tu nombre"); return; }

  const codigo = Math.random().toString(36).substring(2,7).toUpperCase();
  codigoSalaActual = codigo;
  host = nombre;

  await set(ref(db, `salas/${codigo}`), {
    host: nombre,
    jugadores: { [nombre]: { nombre, rol: "Pendiente" } },
    estado: "esperando"
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
  asignarRolesBtn.style.display = "inline-block";

  escucharJugadores(codigo);
  escucharRolPrivado(nombre, codigo);
});

// Unirse a sala
unirseSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  const codigo = codigoInput.value.toUpperCase();
  if(!nombre || !codigo){ alert("Pon tu nombre y código de sala"); return; }

  codigoSalaActual = codigo;

  await set(ref(db, `salas/${codigo}/jugadores/${nombre}`), { nombre, rol: "Pendiente" });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;

  escucharJugadores(codigo);
  escucharRolPrivado(nombre, codigo);
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
      await set(ref(db, `salas/${codigoSalaActual}/jugadores/${jugador}`), {
        nombre: jugador,
        rol: jugador === impostor ? "Impostor" : famoso
      });
    }
  }
});
