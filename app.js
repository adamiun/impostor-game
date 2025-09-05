// ... Código de Firebase y referencias (igual que antes) ...

// Escuchar cambios de tu propio rol
function escucharRolPrivado(nombre, codigo) {
  const jugadorRef = ref(db, `salas/${codigo}/jugadores/${nombre}`);
  onValue(jugadorRef, snapshot => {
    if(snapshot.exists()) {
      const datos = snapshot.val();
      if(datos.rol !== "Pendiente"){
        tuRol.innerText = `🎭 Tu rol es: ${datos.rol}`;
        tuRol.style.display = "block";
        tuRol.style.background = datos.rol === "Impostor" ? "red" : "green";
        tuRol.style.opacity = 0;
        tuRol.style.transform = "scale(0.5)";
        setTimeout(() => {
          tuRol.style.transition = "all 0.5s ease";
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
