const URL = './dls26-cards.json';

let todosLosJugadores = [];
let jugadoresFiltrados = [];
let offset = 0;
const limite = 8;

// DOM Elements
const playerContainer = document.getElementById("playerContainer");
const detailContainer = document.getElementById("detailContainer");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const playerCounter = document.getElementById("playerCounter");

// Music Player
const audioTrack = document.getElementById("audioTrack");
const playPauseBtn = document.getElementById("playPauseBtn");
const trackSelect = document.getElementById("trackSelect");
const trackTitle = document.getElementById("trackTitle");

function inicializarReproductor(playlist) {
    if (!playlist || playlist.length === 0) return;
    trackSelect.innerHTML = "";
    playlist.forEach(track => {
        const option = document.createElement("option");
        option.value = track.file;
        option.textContent = track.title;
        trackSelect.appendChild(option);
    });
    audioTrack.src = playlist[0].file;
    trackTitle.textContent = `🎵 ${playlist[0].title}`;
}

playPauseBtn.addEventListener("click", () => {
    if (audioTrack.paused) {
        audioTrack.play();
        playPauseBtn.textContent = "⏸";
    } else {
        audioTrack.pause();
        playPauseBtn.textContent = "▶";
    }
});

function mostrarLoading() { loading.classList.remove("hidden"); }
function ocultarLoading() { loading.classList.add("hidden"); }

async function cargarDatosAPI() {
    mostrarLoading();
    try {
        const respuesta = await fetch(URL);
        const data = await respuesta.json();
        if (data.playlist) {
            inicializarReproductor(data.playlist);
            todosLosJugadores = data.players || [];
        } else {
            todosLosJugadores = Array.isArray(data) ? data : [];
        }
        jugadoresFiltrados = [...todosLosJugadores];
        pobladorSelectorJugadores();
        renderizarPaginaActual();
        inicializarJuegoCanvas();
    } catch (error) {
        console.error("Error al cargar dls26-cards.json:", error);
    }
    ocultarLoading();
}

function renderizarPaginaActual() {
    playerContainer.innerHTML = "";
    playerCounter.textContent = `${jugadoresFiltrados.length} Jugadores`;
    const corte = jugadoresFiltrados.slice(offset, offset + limite);
    corte.forEach(jugador => crearCard(jugador));
    previousBtn.disabled = offset === 0;
    nextBtn.disabled = offset + limite >= jugadoresFiltrados.length;
}

function crearCard(player) {
    const card = document.createElement("article");
    card.classList.add("card");
    card.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${player.image}" alt="${player.name}" onerror="this.src='./download.jpg';">
        </div>
        <div class="card-body">
            <h3>${player.name}</h3>
            <p><strong>${player.team}</strong> - ${player.position}</p>
            <p><strong>OVR:</strong> ${player.rating}</p>
            <button class="btn-info">Ver Info</button>
        </div>
    `;
    card.querySelector(".btn-info").addEventListener("click", () => mostrarDetalle(player));
    playerContainer.appendChild(card);
}

function mostrarDetalle(player) {
    detailContainer.innerHTML = `
        <h2>${player.name} ${player.country ? player.country.flag : ''}</h2>
        <p><strong>Equipo:</strong> ${player.team}</p>
        <p><strong>Posición:</strong> ${player.position}</p>
        <p><strong>Valoración:</strong> ${player.rating}</p>
        <p><strong>Carta:</strong> ${player.cardType} (${player.year})</p>
    `;
}

// ===============================================
// LÓGICA Y MOTOR DEL MINIJUEGO 4v4
// ===============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameLoopId = null;
let timerInterval = null;
let matchTime = 180;
let isPaused = false;

let keys = {};
let scoreP1 = 0;
let scoreP2 = 0;

let statsGame = {
    p1Possession: 0, p2Possession: 0,
    p1Shots: 0, p2Shots: 0,
    p1Tackles: 0, p2Tackles: 0,
    p1Passes: 0, p2Passes: 0,
    p1Time: 0, p2Time: 0,
    mvp: null
};

let team1 = { gk: null, def: null, med: null, del: null };
let team2 = { gk: null, def: null, med: null, del: null };

function crearEntidad(data, role, defaultX, defaultY) {
    return {
        x: defaultX, y: defaultY,
        baseX: defaultX, baseY: defaultY,
        radius: 16,
        speed: 3.5,
        name: data ? data.name : role,
        rating: data ? data.rating : 80,
        image: data ? data.image : '',
        role: role,
        energy: 100,
        nitro: 100,
        lastPowerShot: 0,
        lastDirX: 0, lastDirY: 0
    };
}

let ball = { x: 425, y: 240, radius: 9, vx: 0, vy: 0, friction: 0.94, holder: null };

// BUSCAR JUGADORES FILTRANDO ÚNICAMENTE 'MC' EN MEDIOCAMPO
function pobladorSelectorJugadores() {
    const p1Gk = document.getElementById("p1GkSelect");
    const p1Def = document.getElementById("p1DefSelect");
    const p1Med = document.getElementById("p1MedSelect");
    const p1Del = document.getElementById("p1DelSelect");
    
    const p2Gk = document.getElementById("p2GkSelect");
    const p2Def = document.getElementById("p2DefSelect");
    const p2Med = document.getElementById("p2MedSelect");
    const p2Del = document.getElementById("p2DelSelect");

    const selects = [p1Gk, p1Def, p1Med, p1Del, p2Gk, p2Def, p2Med, p2Del];
    selects.forEach(s => s.innerHTML = "");

    todosLosJugadores.forEach((p, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        const nacion = p.country?.flag || '';
        opt.textContent = `${nacion} ${p.name} (${p.rating} - ${p.position})`;
        const pos = (p.position || "").toUpperCase();

        if (["GK", "POR"].includes(pos)) {
            p1Gk.appendChild(opt.cloneNode(true));
            p2Gk.appendChild(opt.cloneNode(true));
        } else if (["DFC", "DEF", "LD", "LI"].includes(pos)) {
            p1Def.appendChild(opt.cloneNode(true));
            p2Def.appendChild(opt.cloneNode(true));
        } else if (["MC", "MCO", "MCD"].includes(pos)) { // <--- BUSCA MC, MCO Y MCD (EXCLUYENDO "MED")
            p1Med.appendChild(opt.cloneNode(true));
            p2Med.appendChild(opt.cloneNode(true));
        } else {
            p1Del.appendChild(opt.cloneNode(true));
            p2Del.appendChild(opt.cloneNode(true));
        }
    });

    pobladorSubstituciones();
}

function pobladorSubstituciones() {
    const subP1Def = document.getElementById("subP1Def");
    const subP1Med = document.getElementById("subP1Med");
    const subP1Del = document.getElementById("subP1Del");
    
    const subP2Def = document.getElementById("subP2Def");
    const subP2Med = document.getElementById("subP2Med");
    const subP2Del = document.getElementById("subP2Del");

    const subSelects = [subP1Def, subP1Med, subP1Del, subP2Def, subP2Med, subP2Del];
    subSelects.forEach(s => s.innerHTML = "");

    todosLosJugadores.forEach((p, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `${p.name} (${p.rating} OVR)`;
        subSelects.forEach(s => s.appendChild(opt.cloneNode(true)));
    });
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup", e => { keys[e.key] = false; });

    document.getElementById("startGameBtn").addEventListener("click", reiniciarPartido);
    document.getElementById("pauseBtn").addEventListener("click", pausarJuego);
    document.getElementById("resumeBtn").addEventListener("click", reanudarJuego);

    document.getElementById("gestionarEquipoBtn").addEventListener("click", () => {
        document.getElementById("pauseModal").classList.add("hidden");
        document.getElementById("subModal").classList.remove("hidden");
    });

    document.getElementById("closeSubBtn").addEventListener("click", () => {
        document.getElementById("subModal").classList.add("hidden");
        document.getElementById("pauseModal").classList.remove("hidden");
    });

    document.getElementById("applySubP1").addEventListener("click", () => {
        const defP = todosLosJugadores[document.getElementById("subP1Def").value];
        const medP = todosLosJugadores[document.getElementById("subP1Med").value];
        const delP = todosLosJugadores[document.getElementById("subP1Del").value];
        if (defP) team1.def = crearEntidad(defP, 'DEF', team1.def.x, team1.def.y);
        if (medP) team1.med = crearEntidad(medP, 'MED', team1.med.x, team1.med.y);
        if (delP) team1.del = crearEntidad(delP, 'DEL', team1.del.x, team1.del.y);
        alert("¡Sustituciones P1 realizadas!");
    });

    document.getElementById("applySubP2").addEventListener("click", () => {
        const defP = todosLosJugadores[document.getElementById("subP2Def").value];
        const medP = todosLosJugadores[document.getElementById("subP2Med").value];
        const delP = todosLosJugadores[document.getElementById("subP2Del").value];
        if (defP) team2.def = crearEntidad(defP, 'DEF', team2.def.x, team2.def.y);
        if (medP) team2.med = crearEntidad(medP, 'MED', team2.med.x, team2.med.y);
        if (delP) team2.del = crearEntidad(delP, 'DEL', team2.del.x, team2.del.y);
        alert("¡Sustituciones P2 realizadas!");
    });

    document.getElementById("estadisticasBtn").addEventListener("click", mostrarModalStats);
    document.getElementById("closeStatsBtn").addEventListener("click", () => {
        document.getElementById("statsModal").classList.add("hidden");
    });
}

function reiniciarPartido() {
    const p1Gk = todosLosJugadores[document.getElementById("p1GkSelect").value];
    const p1Def = todosLosJugadores[document.getElementById("p1DefSelect").value];
    const p1Med = todosLosJugadores[document.getElementById("p1MedSelect").value];
    const p1Del = todosLosJugadores[document.getElementById("p1DelSelect").value];

    const p2Gk = todosLosJugadores[document.getElementById("p2GkSelect").value];
    const p2Def = todosLosJugadores[document.getElementById("p2DefSelect").value];
    const p2Med = todosLosJugadores[document.getElementById("p2MedSelect").value];
    const p2Del = todosLosJugadores[document.getElementById("p2DelSelect").value];

    team1.gk = crearEntidad(p1Gk, 'GK', 50, 240);
    team1.def = crearEntidad(p1Def, 'DEF', 180, 240);
    team1.med = crearEntidad(p1Med, 'MED', 300, 240);
    team1.del = crearEntidad(p1Del, 'DEL', 380, 240);

    team2.gk = crearEntidad(p2Gk, 'GK', 800, 240);
    team2.def = crearEntidad(p2Def, 'DEF', 670, 240);
    team2.med = crearEntidad(p2Med, 'MED', 550, 240);
    team2.del = crearEntidad(p2Del, 'DEL', 470, 240);

    scoreP1 = 0; scoreP2 = 0;
    statsGame = { p1Possession: 0, p2Possession: 0, p1Shots: 0, p2Shots: 0, p1Tackles: 0, p2Tackles: 0, p1Passes: 0, p2Passes: 0, p1Time: 0, p2Time: 0 };
    resetPosiciones();
    iniciarTemporizador();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    isPaused = false;
    bucleJuego();
}

function iniciarTemporizador() {
    clearInterval(timerInterval);
    matchTime = 180;
    timerInterval = setInterval(() => {
        if (!isPaused) {
            matchTime--;
            let m = Math.floor(matchTime / 60);
            let s = matchTime % 60;
            document.getElementById("gameTimer").textContent = `⏱️ Tiempo: ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
            if (matchTime <= 0) {
                clearInterval(timerInterval);
                cancelAnimationFrame(gameLoopId);
                mostrarModalStats();
            }
        }
    }, 1000);
}

function pausarJuego() {
    isPaused = true;
    document.getElementById("p1PauseScore").textContent = scoreP1;
    document.getElementById("p2PauseScore").textContent = scoreP2;
    document.getElementById("pauseModal").classList.remove("hidden");
}

function reanudarJuego() {
    isPaused = false;
    document.getElementById("pauseModal").classList.add("hidden");
}

function resetPosiciones() {
    ball.x = 425; ball.y = 240; ball.vx = 0; ball.vy = 0; ball.holder = null;
    team1.gk.x = 50; team1.gk.y = 240;
    team1.def.x = 180; team1.def.y = 240;
    team1.med.x = 300; team1.med.y = 240;
    team1.del.x = 380; team1.del.y = 240;

    team2.gk.x = 800; team2.gk.y = 240;
    team2.def.x = 670; team2.def.y = 240;
    team2.med.x = 550; team2.med.y = 240;
    team2.del.x = 470; team2.del.y = 240;
}

function bucleJuego() {
    if (!isPaused) {
        actualizarJuego();
        dibujarJuego();
    }
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    // --- CONTROLES PORTEROS ---
    if (keys["f"] || keys["F"]) team1.gk.x = Math.min(100, team1.gk.x + 3);
    if (keys["g"] || keys["G"]) team1.gk.x = Math.max(20, team1.gk.x - 3);
    if (keys["l"] || keys["L"]) team2.gk.x = Math.max(750, team2.gk.x - 3);
    if (keys["k"] || keys["K"]) team2.gk.x = Math.min(830, team2.gk.x + 3);

    // --- JUGADOR CONTROLADO P1 (Delantero) ---
    let speed1 = team1.del.speed * (team1.del.energy / 100);
    if (keys["q"] || keys["Q"]) {
        if (team1.del.nitro > 0) { speed1 *= 1.5; team1.del.nitro -= 0.5; }
    } else { team1.del.nitro = Math.min(100, team1.del.nitro + 0.2); }

    if (keys["w"] || keys["W"]) team1.del.y -= speed1;
    if (keys["s"] || keys["S"]) team1.del.y += speed1;
    if (keys["a"] || keys["A"]) team1.del.x -= speed1;
    if (keys["d"] || keys["D"]) team1.del.x += speed1;

    team1.del.energy = Math.max(10, team1.del.energy - 0.005);

    // IA COMPAÑEROS P1
    movimientoAIAvanzado(team1.def, ball, 150, 600, 1);
    movimientoAIAvanzado(team1.med, ball, 250, 700, 1);

    // --- CONTROLES / IA P2 ---
    const is2P = document.getElementById("gameModeSelect").value === "2P";
    if (is2P) {
        let speed2 = team2.del.speed * (team2.del.energy / 100);
        if (keys["ArrowUp"]) team2.del.y -= speed2;
        if (keys["ArrowDown"]) team2.del.y += speed2;
        if (keys["ArrowLeft"]) team2.del.x -= speed2;
        if (keys["ArrowRight"]) team2.del.x += speed2;
        movimientoAIAvanzado(team2.def, ball, 250, 700, -1);
        movimientoAIAvanzado(team2.med, ball, 150, 600, -1);
    } else {
        movimientoAIAvanzado(team2.def, ball, 200, 650, -1);
        movimientoAIAvanzado(team2.med, ball, 150, 550, -1);
        movimientoAIAvanzado(team2.del, ball, 50, 450, -1);

        // Pase CPU inteligente hacia el arco rival
        if (ball.holder === team2.del && Math.random() < 0.01) {
            let target = Math.random() > 0.5 ? team2.med : team2.def;
            let angle = Math.atan2(target.y - team2.del.y, target.x - team2.del.x);
            ball.holder = null;
            ball.vx = Math.cos(angle) * 8;
            ball.vy = Math.sin(angle) * 8;
            statsGame.p2Passes++;
        }
    }

    // DISPAROS P1 (E) / P2 (M)
    if (keys["e"] || keys["E"]) {
        if (Math.hypot(ball.x - team1.del.x, ball.y - team1.del.y) < 30) {
            ball.holder = null;
            ball.vx = 12; ball.vy = (Math.random() - 0.5) * 4;
            statsGame.p1Shots++;
        }
    }

    if (keys["m"] || keys["M"]) {
        if (Math.hypot(ball.x - team2.del.x, ball.y - team2.del.y) < 30) {
            ball.holder = null;
            ball.vx = -12; ball.vy = (Math.random() - 0.5) * 4;
            statsGame.p2Shots++;
        }
    }

    // FÍSICAS BALÓN
    if (ball.holder) {
        ball.x = ball.holder.x + 12;
        ball.y = ball.holder.y;
    } else {
        ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= ball.friction; ball.vy *= ball.friction;

        // Rebotes
        if (ball.y <= 10 || ball.y >= canvas.height - 10) ball.vy *= -1;
    }

    // Detección Posesión / Colisiones
    const todos = [team1.gk, team1.def, team1.med, team1.del, team2.gk, team2.def, team2.med, team2.del];
    todos.forEach(p => {
        if (p && Math.hypot(ball.x - p.x, ball.y - p.y) < p.radius + ball.radius) {
            ball.holder = p;
        }
    });

    if (ball.x < 425) statsGame.p2Time++; else statsGame.p1Time++;

    // GOLES
    if (ball.x <= 10) {
        if (ball.y > 180 && ball.y < 300) { scoreP2++; resetPosiciones(); }
        else { ball.vx *= -1; }
    }
    if (ball.x >= canvas.width - 10) {
        if (ball.y > 180 && ball.y < 300) { scoreP1++; resetPosiciones(); }
        else { ball.vx *= -1; }
    }
}

function movimientoAIAvanzado(entidad, balon, minY, maxY, dir) {
    if (!entidad) return;
    let targetX = dir === 1 ? Math.min(balon.x - 40, maxY) : Math.max(balon.x + 40, minY);
    let targetY = balon.y;
    entidad.x += (targetX - entidad.x) * 0.04;
    entidad.y += (targetY - entidad.y) * 0.04;
}

function dibujarJuego() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Campo de fútbol
    ctx.fillStyle = "#2e8b57";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2); ctx.stroke();

    // Dibujar Jugadores
    [team1.gk, team1.def, team1.med, team1.del].forEach(p => dibujarJugador(p, "#00ffff"));
    [team2.gk, team2.def, team2.med, team2.del].forEach(p => dibujarJugador(p, "#ff0055"));

    // Balón
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();

    // Marcador
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px Poppins";
    ctx.fillText(`P1: ${scoreP1} - ${scoreP2} P2`, canvas.width / 2 - 40, 30);
}

function dibujarJugador(p, color) {
    if (!p) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill(); ctx.stroke();

    // Barra de Energía / Resistencia
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(p.x - 12, p.y - 22, (p.energy / 100) * 24, 4);
    ctx.strokeStyle = "#000"; ctx.strokeRect(p.x - 12, p.y - 22, 24, 4);
}

function mostrarModalStats() {
    document.getElementById("stP1Score").textContent = scoreP1;
    document.getElementById("stP2Score").textContent = scoreP2;

    let totalT = statsGame.p1Time + statsGame.p2Time || 1;
    let p1P = Math.round((statsGame.p1Time / totalT) * 100);
    document.getElementById("p1Poss").textContent = `${p1P}%`;
    document.getElementById("p2Poss").textContent = `${100 - p1P}%`;

    document.getElementById("p1Shots").textContent = statsGame.p1Shots;
    document.getElementById("p2Shots").textContent = statsGame.p2Shots;

    // Determinar MVP
    let mvp = scoreP1 >= scoreP2 ? team1.del : team2.del;
    document.getElementById("mvpName").textContent = mvp.name;
    document.getElementById("mvpRole").textContent = `Rol: ${mvp.role}`;
    document.getElementById("mvpImg").src = mvp.image || './download.jpg';

    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("statsModal").classList.remove("hidden");
}

searchButton.addEventListener("click", () => {
    const val = searchInput.value.toLowerCase();
    jugadoresFiltrados = todosLosJugadores.filter(p => p.name.toLowerCase().includes(val));
    offset = 0;
    renderizarPaginaActual();
});

nextBtn.addEventListener("click", () => { offset += limite; renderizarPaginaActual(); });
previousBtn.addEventListener("click", () => { offset -= limite; renderizarPaginaActual(); });

cargarDatosAPI();
