
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
    if (audioTrack.paused) { audioTrack.play(); playPauseBtn.textContent = "⏸"; }
    else { audioTrack.pause(); playPauseBtn.textContent = "▶"; }
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
// MOTOR Y LÓGICA DEL MINIJUEGO 4v4 (COLISIONES RÍGIDAS & TÁCTICAS)
// ===============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let imgPitch = new Image();
imgPitch.src = './FUT.jpg';

let p1BadgeImg = new Image();
let p2BadgeImg = new Image();

let gameLoopId = null;
let timerInterval = null;
let matchTime = 180;
let isPaused = false;

let keys = {};
let scoreP1 = 0;
let scoreP2 = 0;

let p1Tactic = 'BAL'; // 'DEF', 'BAL', 'ATK'
let p2Tactic = 'BAL';

let statsGame = { p1Shots: 0, p2Shots: 0, p1Passes: 0, p2Passes: 0, p1Time: 0, p2Time: 0 };

let team1 = { gk: null, def: null, med: null, del: null };
let team2 = { gk: null, def: null, med: null, del: null };

function crearEntidad(data, role, number, defaultX, defaultY) {
    return {
        x: defaultX, y: defaultY,
        baseX: defaultX, baseY: defaultY,
        radius: 16,
        speed: 3.6,
        name: data ? data.name : role,
        rating: data ? data.rating : 80,
        image: data ? data.image : '',
        number: number,
        role: role,
        energy: 100,
        nitro: 100
    };
}

let ball = { x: 425, y: 240, radius: 8, vx: 0, vy: 0, friction: 0.94, holder: null };

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
        opt.textContent = `${p.country?.flag || ''} ${p.name} (${p.rating} - ${p.position})`;
        const pos = (p.position || "").toUpperCase();

        if (["GK", "POR"].includes(pos)) {
            p1Gk.appendChild(opt.cloneNode(true));
            p2Gk.appendChild(opt.cloneNode(true));
        } else if (["DFC", "DEF", "LD", "LI"].includes(pos)) {
            p1Def.appendChild(opt.cloneNode(true));
            p2Def.appendChild(opt.cloneNode(true));
        } else if (["MC", "MCO", "MCD"].includes(pos)) {
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

    setupTacticButtons('p1', (t) => p1Tactic = t);
    setupTacticButtons('p2', (t) => p2Tactic = t);

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
        if (defP) team1.def = crearEntidad(defP, 'DEF', 4, team1.def.x, team1.def.y);
        if (medP) team1.med = crearEntidad(medP, 'MED', 8, team1.med.x, team1.med.y);
        if (delP) team1.del = crearEntidad(delP, 'DEL', 9, team1.del.x, team1.del.y);
        alert("¡Sustituciones P1 completadas!");
    });

    document.getElementById("applySubP2").addEventListener("click", () => {
        const defP = todosLosJugadores[document.getElementById("subP2Def").value];
        const medP = todosLosJugadores[document.getElementById("subP2Med").value];
        const delP = todosLosJugadores[document.getElementById("subP2Del").value];
        if (defP) team2.def = crearEntidad(defP, 'DEF', 3, team2.def.x, team2.def.y);
        if (medP) team2.med = crearEntidad(medP, 'MED', 6, team2.med.x, team2.med.y);
        if (delP) team2.del = crearEntidad(delP, 'DEL', 10, team2.del.x, team2.del.y);
        alert("¡Sustituciones P2 completadas!");
    });

    document.getElementById("estadisticasBtn").addEventListener("click", mostrarModalStats);
    document.getElementById("closeStatsBtn").addEventListener("click", () => {
        document.getElementById("statsModal").classList.add("hidden");
    });
}

function setupTacticButtons(playerPrefix, callback) {
    const btnDef = document.getElementById(`${playerPrefix}TacticDef`);
    const btnBal = document.getElementById(`${playerPrefix}TacticBal`);
    const btnAtk = document.getElementById(`${playerPrefix}TacticAtk`);

    const reset = () => {
        btnDef.classList.remove("active");
        btnBal.classList.remove("active");
        btnAtk.classList.remove("active");
    };

    btnDef.addEventListener("click", () => { reset(); btnDef.classList.add("active"); callback('DEF'); });
    btnBal.addEventListener("click", () => { reset(); btnBal.classList.add("active"); callback('BAL'); });
    btnAtk.addEventListener("click", () => { reset(); btnAtk.classList.add("active"); callback('ATK'); });
}

function reiniciarPartido() {
    p1BadgeImg.src = document.getElementById("p1BadgeSelect").value;
    p2BadgeImg.src = document.getElementById("cpuBadgeSelect").value;

    const p1Gk = todosLosJugadores[document.getElementById("p1GkSelect").value];
    const p1Def = todosLosJugadores[document.getElementById("p1DefSelect").value];
    const p1Med = todosLosJugadores[document.getElementById("p1MedSelect").value];
    const p1Del = todosLosJugadores[document.getElementById("p1DelSelect").value];

    const p2Gk = todosLosJugadores[document.getElementById("p2GkSelect").value];
    const p2Def = todosLosJugadores[document.getElementById("p2DefSelect").value];
    const p2Med = todosLosJugadores[document.getElementById("p2MedSelect").value];
    const p2Del = todosLosJugadores[document.getElementById("p2DelSelect").value];

    team1.gk = crearEntidad(p1Gk, 'GK', 1, 50, 240);
    team1.def = crearEntidad(p1Def, 'DEF', 4, 180, 240);
    team1.med = crearEntidad(p1Med, 'MED', 8, 320, 240);
    team1.del = crearEntidad(p1Del, 'DEL', 9, 410, 240);

    team2.gk = crearEntidad(p2Gk, 'GK', 13, 800, 240);
    team2.def = crearEntidad(p2Def, 'DEF', 3, 670, 240);
    team2.med = crearEntidad(p2Med, 'MED', 6, 530, 240);
    team2.del = crearEntidad(p2Del, 'DEL', 10, 440, 240);

    scoreP1 = 0; scoreP2 = 0;
    statsGame = { p1Shots: 0, p2Shots: 0, p1Passes: 0, p2Passes: 0, p1Time: 0, p2Time: 0 };
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
    document.getElementById("p1PauseBadgeImg").src = document.getElementById("p1BadgeSelect").value;
    document.getElementById("p2PauseBadgeImg").src = document.getElementById("cpuBadgeSelect").value;
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
    team1.med.x = 320; team1.med.y = 240;
    team1.del.x = 410; team1.del.y = 240;

    team2.gk.x = 800; team2.gk.y = 240;
    team2.def.x = 670; team2.def.y = 240;
    team2.med.x = 530; team2.med.y = 240;
    team2.del.x = 440; team2.del.y = 240;
}

function bucleJuego() {
    if (!isPaused) {
        actualizarJuego();
        resolverColisionesEntidades(); // IMPEDIR QUE SE ATRAVIESEN
        dibujarJuego();
    }
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    // PORTEROS
    if (keys["f"] || keys["F"]) team1.gk.x = Math.min(110, team1.gk.x + 3);
    if (keys["g"] || keys["G"]) team1.gk.x = Math.max(20, team1.gk.x - 3);
    if (keys["l"] || keys["L"]) team2.gk.x = Math.max(740, team2.gk.x - 3);
    if (keys["k"] || keys["K"]) team2.gk.x = Math.min(830, team2.gk.x + 3);

    // DELANTERO P1
    let speed1 = team1.del.speed * (team1.del.energy / 100);
    if (keys["q"] || keys["Q"]) {
        if (team1.del.nitro > 0) { speed1 *= 1.5; team1.del.nitro -= 0.5; }
    } else { team1.del.nitro = Math.min(100, team1.del.nitro + 0.2); }

    if (keys["w"] || keys["W"]) team1.del.y -= speed1;
    if (keys["s"] || keys["S"]) team1.del.y += speed1;
    if (keys["a"] || keys["A"]) team1.del.x -= speed1;
    if (keys["d"] || keys["D"]) team1.del.x += speed1;

    // COMPAÑEROS P1
    movimientoTácticoAI(team1.def, ball, 1, 'DEF', p1Tactic);
    movimientoTácticoAI(team1.med, ball, 1, 'MED', p1Tactic);

    // CONTROLES / IA P2
    const is2P = document.getElementById("gameModeSelect").value === "2P";
    if (is2P) {
        let speed2 = team2.del.speed * (team2.del.energy / 100);
        if (keys["ArrowUp"]) team2.del.y -= speed2;
        if (keys["ArrowDown"]) team2.del.y += speed2;
        if (keys["ArrowLeft"]) team2.del.x -= speed2;
        if (keys["ArrowRight"]) team2.del.x += speed2;
        movimientoTácticoAI(team2.def, ball, -1, 'DEF', p2Tactic);
        movimientoTácticoAI(team2.med, ball, -1, 'MED', p2Tactic);
    } else {
        movimientoTácticoAI(team2.def, ball, -1, 'DEF', p2Tactic);
        movimientoTácticoAI(team2.med, ball, -1, 'MED', p2Tactic);
        movimientoTácticoAI(team2.del, ball, -1, 'DEL', p2Tactic);

        // IA CPU - DISPARO DIRECTO RIVAL (SIN AUTOGOLES)
        if (ball.holder === team2.del) {
            if (ball.x < 350) {
                ball.holder = null;
                let angle = Math.atan2(240 - team2.del.y, 20 - team2.del.x);
                ball.vx = Math.cos(angle) * 11;
                ball.vy = Math.sin(angle) * 11;
                statsGame.p2Shots++;
            } else if (Math.random() < 0.015) {
                ball.holder = null;
                ball.vx = -8;
                ball.vy = (Math.random() - 0.5) * 4;
                statsGame.p2Passes++;
            }
        }
    }

    // DISPAROS
    if (keys["e"] || keys["E"]) {
        if (Math.hypot(ball.x - team1.del.x, ball.y - team1.del.y) < 30) {
            ball.holder = null;
            ball.vx = 13; ball.vy = (Math.random() - 0.5) * 4;
            statsGame.p1Shots++;
        }
    }

    if (keys["m"] || keys["M"]) {
        if (Math.hypot(ball.x - team2.del.x, ball.y - team2.del.y) < 30) {
            ball.holder = null;
            ball.vx = -13; ball.vy = (Math.random() - 0.5) * 4;
            statsGame.p2Shots++;
        }
    }

    // BALÓN
    if (ball.holder) {
        ball.x = ball.holder.x + (ball.holder.x < 425 ? 14 : -14);
        ball.y = ball.holder.y;
    } else {
        ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= ball.friction; ball.vy *= ball.friction;
        if (ball.y <= 12 || ball.y >= canvas.height - 12) ball.vy *= -1;
    }

    // PREVENCIÓN DE AUTOGOLES Y CONTROL DE POSESIÓN
    const todos = [team1.gk, team1.def, team1.med, team1.del, team2.gk, team2.def, team2.med, team2.del];
    todos.forEach(p => {
        if (p && Math.hypot(ball.x - p.x, ball.y - p.y) < p.radius + ball.radius) {
            ball.holder = p;
            if (p === team2.def || p === team2.gk) {
                ball.holder = null;
                ball.vx = -9; ball.vy = (Math.random() - 0.5) * 6;
            } else if (p === team1.def || p === team1.gk) {
                ball.holder = null;
                ball.vx = 9; ball.vy = (Math.random() - 0.5) * 6;
            }
        }
    });

    if (ball.x < 425) statsGame.p2Time++; else statsGame.p1Time++;

    // GOLES
    if (ball.x <= 10) {
        if (ball.y > 170 && ball.y < 310) { scoreP2++; resetPosiciones(); }
        else { ball.vx *= -1; ball.x = 12; }
    }
    if (ball.x >= canvas.width - 10) {
        if (ball.y > 170 && ball.y < 310) { scoreP1++; resetPosiciones(); }
        else { ball.vx *= -1; ball.x = canvas.width - 12; }
    }
}

// SISTEMA DE COLISIONES FÍSICAS RÍGIDAS (LOS JUGADORES NO SE ATRAVIESAN)
function resolverColisionesEntidades() {
    const jug = [team1.gk, team1.def, team1.med, team1.del, team2.gk, team2.def, team2.med, team2.del];
    for (let i = 0; i < jug.length; i++) {
        for (let j = i + 1; j < jug.length; j++) {
            let p1 = jug[i];
            let p2 = jug[j];
            if (!p1 || !p2) continue;

            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let dist = Math.hypot(dx, dy);
            let minDist = p1.radius + p2.radius;

            if (dist < minDist && dist > 0) {
                let overlap = minDist - dist;
                let nx = dx / dist;
                let ny = dy / dist;

                p1.x -= nx * (overlap / 2);
                p1.y -= ny * (overlap / 2);
                p2.x += nx * (overlap / 2);
                p2.y += ny * (overlap / 2);
            }
        }
    }
}

function movimientoTácticoAI(entidad, balon, dir, role, tactica) {
    if (!entidad) return;

    let baseOffX = 0;
    if (tactica === 'ATK') baseOffX = dir * 100;
    if (tactica === 'DEF') baseOffX = dir * -80;

    let targetX = entidad.baseX + baseOffX + (balon.x - 425) * 0.3;
    let targetY = balon.y * 0.6 + entidad.baseY * 0.4;

    entidad.x += (targetX - entidad.x) * 0.04;
    entidad.y += (targetY - entidad.y) * 0.04;
}

function dibujarJuego() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgPitch.complete && imgPitch.naturalWidth > 0) {
        ctx.drawImage(imgPitch, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    [team1.gk, team1.def, team1.med, team1.del].forEach(p => dibujarJugador(p, "#00ffff", p1BadgeImg));
    [team2.gk, team2.def, team2.med, team2.del].forEach(p => dibujarJugador(p, "#ff0055", p2BadgeImg));

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.stroke();

    ctx.fillStyle = "#fff"; ctx.font = "bold 18px Poppins";
    ctx.fillText(`P1: ${scoreP1} - ${scoreP2} P2`, canvas.width / 2 - 40, 30);
}

function dibujarJugador(p, color, badgeImg) {
    if (!p) return;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.font = "bold 12px Poppins";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.number, p.x, p.y);

    if (badgeImg.complete && badgeImg.naturalWidth > 0) {
        ctx.drawImage(badgeImg, p.x - 8, p.y - 32, 16, 16);
    }

    ctx.fillStyle = "#00ff00";
    ctx.fillRect(p.x - 12, p.y + 18, (p.energy / 100) * 24, 3);
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

    document.getElementById("mvpP1Name").textContent = team1.del.name;
    document.getElementById("mvpP1Role").textContent = team1.del.role;
    document.getElementById("mvpP1Img").src = team1.del.image || './download.jpg';

    document.getElementById("mvpP2Name").textContent = team2.del.name;
    document.getElementById("mvpP2Role").textContent = team2.del.role;
    document.getElementById("mvpP2Img").src = team2.del.image || './download.jpg';

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
