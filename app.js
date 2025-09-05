// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Configuración de Firebase (la tuya)
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

// Crear sala
crearSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  if (!nombre) {
    alert("Pon tu nombre");
    return;
  }

  const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();

  await set(ref(db, "salas/" + codigo), {
    jugadores: {
      [nombre]: { nombre, rol: "Pendiente" }
    },
    estado: "esperando"
  });

  estado.innerText = `✅ Sala creada: ${codigo}`;
});

// Unirse a sala
unirseSalaBtn.addEventListener("click", async () => {
  const nombre = nombreInput.value;
  const codigo = codigoInput.value.toUpperCase();

  if (!nombre || !codigo) {
    alert("Pon tu nombre y código de sala");
    return;
  }

  // Agregar jugador
  await set(ref(db, `salas/${codigo}/jugadores/${nombre}`), {
    nombre,
    rol: "Pendiente"
  });

  estado.innerText = `🙌 Te uniste a la sala ${codigo}`;

  // Escuchar cambios en el rol del jugador (cada uno solo ve el suyo)
  const jugadorRef = ref(db, `salas/${codigo}/jugadores/${nombre}`);
  onValue(jugadorRef, (snapshot) => {
    if (snapshot.exists()) {
      const datos = snapshot.val();
      if (datos.rol !== "Pendiente") {
        estado.innerText = `🎭 Tu rol es: ${datos.rol}`;
      }
    }
  });

  // Verificar si ya hay mínimo 4 jugadores
  const snapshot = await get(child(ref(db), `salas/${codigo}/jugadores`));
  if (snapshot.exists()) {
    const jugadores = Object.keys(snapshot.val());
    if (jugadores.length >= 4) {
      asignarRoles(codigo, jugadores);
    }
  }
});

// Asignar roles: un impostor y el resto con un famoso
async function asignarRoles(codigo, jugadores) {
  // Elegir impostor
  const impostor = jugadores[Math.floor(Math.random() * jugadores.length)];

  // Elegir un famoso para todos
  const famoso = famosos[Math.floor(Math.random() * famosos.length)];

  // Guardar roles en Firebase
  for (let jugador of jugadores) {
    let rol = jugador === impostor ? "Impostor" : famoso;
    await set(ref(db, `salas/${codigo}/jugadores/${jugador}`), {
      nombre: jugador,
      rol
    });
  }
}
