// ===========================================
// DLS 26 CARDS SPA & MINIJUEGO FIX GitHub Pages
// API Local: dls26-cards.json
// ===========================================

const URL = './dls26-cards.json';

let todosLosJugadores = [];
let jugadoresFiltrados = [];
let offset = 0;
const limite = 8;

// DOM
const playerContainer = document.getElementById("playerContainer");
const detailContainer = document.getElementById("detailContainer");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const playerCounter = document.getElementById("playerCounter");

// Reproductor
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

if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
        if (audioTrack.paused) {
            audioTrack.play();
            playPauseBtn.textContent = "⏸";
        } else {
            audioTrack.pause();
            playPauseBtn.textContent = "▶";
        }
    });
}

if (trackSelect) {
    trackSelect.addEventListener("change", (e) => {
        const selectedFile = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex].text;
        audioTrack.src = selectedFile;
        trackTitle.textContent = `🎵 ${selectedText}`;
        audioTrack.play();
        playPauseBtn.textContent = "⏸";
    });
}

function obtenerClasePosicion(posicion) {
    if (!posicion) return "pos-default";
    const pos = posicion.toUpperCase();
    if (["GK", "POR"].includes(pos)) return "pos-gk";
    if (["DC", "SD", "EI", "ED"].includes(pos)) return "pos-del";
    if (["DFC", "LD", "LI"].includes(pos)) return "pos-def";
    if (["MC", "CAI", "CAD", "MCO", "MCD"].includes(pos)) return "pos-med";
    return "pos-default";
}

function obtenerColorStat(valor) {
    if (valor === 0) return "#ff66cc";
    if (valor < 60) return "#ff3333";
    if (valor < 70) return "#ff9900";
    if (valor < 80) return "#ffd700";
    if (valor < 90) return "#2ecc71";
    return "#00bfff";
}

function mostrarLoading() { if (loading) loading.classList.remove("hidden"); }
function ocultarLoading() { if (loading) loading.classList.add("hidden"); }
function mostrarError(texto = "Error de procesamiento.") {
    if (errorMessage) {
        errorMessage.textContent = texto;
        errorMessage.classList.remove("hidden");
        setTimeout(() => { errorMessage.classList.add("hidden"); }, 2500);
    }
}

async function cargarDatosAPI() {
    mostrarLoading();
    try {
        const respuesta = await fetch(URL);
        if (!respuesta.ok) throw new Error("No se pudo cargar la API");
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
        mostrarError("Error cargando la base de datos.");
    }
    ocultarLoading();
}

function renderizarPaginaActual() {
    if (!playerContainer) return;
    playerContainer.innerHTML = "";
    if (playerCounter) playerCounter.textContent = `${jugadoresFiltrados.length} Jugadores`;

    if (jugadoresFiltrados.length === 0) {
        playerContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No se encontraron resultados.</p>`;
        return;
    }

    const corte = jugadoresFiltrados.slice(offset, offset + limite);
    corte.forEach(jugador => crearCard(jugador));

    if (previousBtn) previousBtn.disabled = offset === 0;
    if (nextBtn) nextBtn.disabled = offset + limite >= jugadoresFiltrados.length;
}

function crearCard(player) {
    const card = document.createElement("article");
    card.classList.add("card");
    const clasePosicion = obtenerClasePosicion(player.position);
    const bandera = player.country?.flag ? player.country.flag : '';

    card.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${player.image}" alt="${player.name}" class="player-img" onerror="this.onerror=null; this.src='./download.jpg';">
        </div>
        <div class="card-body">
            <span class="id">#${player.year || ''} • ${bandera}</span>
            <h3>${player.name}</h3>
            <p><strong>${player.team}</strong></p>
            <span class="tipo ${clasePosicion}">${player.position}</span>
            <span class="tipo dark">${player.rating} OVR</span>
            <button class="btn-info">Ver Información</button>
        </div>
    `;

    card.querySelector(".btn-info").addEventListener("click", () => { mostrarDetalle(player); });
    playerContainer.appendChild(card);
}

function mostrarDetalle(player) {
    if (!detailContainer) return;
    const posUpper = player.position ? player.position.toUpperCase() : "";
    const esPortero = posUpper === "GK" || posUpper === "POR";
    const clasePosicion = obtenerClasePosicion(player.position);
    let statsHTML = "";

    if (player.stats) {
        if (player.stats.physical) {
            statsHTML += renderBarraStat("Velocidad", player.stats.physical.speed);
            statsHTML += renderBarraStat("Aceleración", player.stats.physical.acceleration);
            if (!esPortero) statsHTML += renderBarraStat("Resistencia", player.stats.physical.stamina);
            statsHTML += renderBarraStat("Fuerza", player.stats.physical.strength);
        }
        if (player.stats.technical) {
            statsHTML += renderBarraStat("Control", player.stats.technical.control);
            statsHTML += renderBarraStat("Pases", player.stats.technical.passing);
            if (!esPortero) statsHTML += renderBarraStat("Tiro", player.stats.technical.shooting);
            statsHTML += renderBarraStat("Entrada", player.stats.technical.tackling);
        }
        if (esPortero && player.stats.goalkeeping) {
            statsHTML += renderBarraStat("Reflejos", player.stats.goalkeeping.reflexes);
            statsHTML += renderBarraStat("Paradas", player.stats.goalkeeping.handling);
        }
    }

    detailContainer.innerHTML = `
        <div class="detail-img-wrapper">
            <img src="${player.image}" alt="${player.name}" class="detail-player-img" onerror="this.src='./download.jpg'">
        </div>
        <h2>${player.name} ${player.country ? player.country.flag : ''}</h2>
        <p><strong>Posición:</strong> <span class="tipo ${clasePosicion}">${player.position}</span> | <strong>Media:</strong> ${player.rating}</p>
        <p><strong>Equipo:</strong> ${player.team}</p>
        <p><strong>País:</strong> ${player.country ? `${player.country.name}${player.country.flag}` : 'N/A'}</p>
        <p><strong>Tipo de carta:</strong> ${player.cardType || 'Estándar'} (${player.year || ''})</p>
        <p><strong>Pie preferido:</strong> ${player.preferredFoot || 'N/A'} ${player.heightCm ? `| <strong>Altura:</strong> ${player.heightCm} cm` : ''}</p>
        <div class="stats">
            <h3>Atributos</h3>
            ${statsHTML}
        </div>
    `;
}

function renderBarraStat(label, valor) {
    if (valor === undefined) return '';
    const color = obtenerColorStat(valor);
    return `
        <div class="stat">
            <div class="stat-header">
                <span>${label}</span>
                <span style="color: ${color};">${valor}</span>
            </div>
            <div class="progress">
                <span style="width: ${Math.min(valor, 100)}%; background-color: ${color};"></span>
            </div>
        </div>
    `;
}

function buscarJugador() {
    if (!searchInput) return;
    const busqueda = searchInput.value.trim().toLowerCase();
    jugadoresFiltrados = todosLosJugadores.filter(p =>
        p.name?.toLowerCase().includes(busqueda) ||
        p.team?.toLowerCase().includes(busqueda) ||
        (p.country && p.country.name?.toLowerCase().includes(busqueda)) ||
        p.position?.toLowerCase().includes(busqueda) ||
        (p.cardType && p.cardType.toLowerCase().includes(busqueda)) ||
        (p.rating !== undefined && String(p.rating).includes(busqueda))
    );
    offset = 0;
    renderizarPaginaActual();
}

// ===========================================
// LÓGICA Y MOTOR DEL MINIJUEGO AVANZADO
// ===========================================

const gameModeSelect = document.getElementById("gameModeSelect");
const playerSelect = document.getElementById("playerSelect");
const player2Select = document.getElementById("player2Select");
const p2PlayerGroup = document.getElementById("p2PlayerGroup");
const difficultyGroup = document.getElementById("difficultyGroup");
const p1BadgeSelect = document.getElementById("p1BadgeSelect");
const cpuBadgeSelect = document.getElementById("cpuBadgeSelect");
const difficultySelect = document.getElementById("difficultySelect");
const startGameBtn = document.getElementById("startGameBtn");
const gameTimerElement = document.getElementById("gameTimer");
const pauseGameBtn = document.getElementById("pauseGameBtn");

// Modales y Overlays
const pauseMenuOverlay = document.getElementById("pauseMenuOverlay");
const halfTimeNotice = document.getElementById("halfTimeNotice");
const resumeBtn = document.getElementById("resumeBtn");
const forfeitBtn = document.getElementById("forfeitBtn");
const substitutionsBtn = document.getElementById("substitutionsBtn");
const substitutionsModal = document.getElementById("substitutionsModal");
const subTargetSelect = document.getElementById("subTargetSelect");
const replacementSelect = document.getElementById("replacementSelect");
const confirmSubBtn = document.getElementById("confirmSubBtn");
const closeSubBtn = document.getElementById("closeSubBtn");
const finalSummaryOverlay = document.getElementById("finalSummaryOverlay");
const closeSummaryBtn = document.getElementById("closeSummaryBtn");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

let gameLoopId = null;
let timerInterval = null;
let matchTime = 180;
let isPaused = false;
let isHalfTimePaused = false;
let halfTimeTimer = null;
let hasPromptedSubP1 = false;
let hasPromptedSubP2 = false;

let imgP1Badge = new Image();
let imgCpuBadge = new Image();
let imgPitch = new Image();
imgPitch.src = './FUT.jpg';

let keys = {};
let scoreP1 = 0;
let scoreCpu = 0;
const POWERSHOT_COOLDOWN = 20000;

let team1 = {
    main: { x: 180, y: 225, radius: 20, baseSpeed: 4, speed: 4, name: "Jugador 1", rating: 85, lastDirX: 1, lastDirY: 0, nitro: 100, hp: 100, stunnedUntil: 0, lastPowerShot: 0, goals: 0 },
    defender: { x: 110, y: 225, radius: 18, speed: 3.2, name: "Defensa P1" },
    gk: { x: 30, y: 225, radius: 22, speed: 2.8, name: "Portero P1" }
};

let team2 = {
    main: { x: 620, y: 225, radius: 20, baseSpeed: 3.5, speed: 3.5, name: "CPU Bot", rating: 85, lastDirX: -1, lastDirY: 0, nitro: 100, hp: 100, stunnedUntil: 0, lastPowerShot: 0, reactionRate: 0.05, isHuman: false, goals: 0 },
    defender: { x: 690, y: 225, radius: 18, speed: 3.2, name: "Defensa P2" },
    gk: { x: 770, y: 225, radius: 22, speed: 2.8, name: "Portero P2" }
};

let ball = {
    x: 400,
    y: 225,
    radius: 10,
    vx: 0,
    vy: 0,
    friction: 0.94,
    maxSpeed: 18
};

function pobladorSelectorJugadores() {
    if (!playerSelect) return;
    playerSelect.innerHTML = "";
    if (player2Select) player2Select.innerHTML = "";
    if (replacementSelect) replacementSelect.innerHTML = "";
    
    todosLosJugadores.forEach((p, index) => {
        const option = document.createElement("option");
        option.value = index;
        const nacion = p.country?.flag ? p.country.flag : '';
        option.textContent = `${nacion} ${p.name} (${p.rating} OVR - ${p.position})`;
        
        playerSelect.appendChild(option);
        if (player2Select) player2Select.appendChild(option.cloneNode(true));
        if (replacementSelect) replacementSelect.appendChild(option.cloneNode(true));
    });

    if (player2Select && player2Select.options.length > 1) {
        player2Select.selectedIndex = 1;
    }
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup", e => { keys[e.key] = false; });

    if (gameModeSelect) {
        gameModeSelect.addEventListener("change", () => {
            if (gameModeSelect.value === "2P") {
                if (p2PlayerGroup) p2PlayerGroup.style.display = "flex";
                if (difficultyGroup) difficultyGroup.style.display = "none";
            } else {
                if (p2PlayerGroup) p2PlayerGroup.style.display = "none";
                if (difficultyGroup) difficultyGroup.style.display = "flex";
            }
        });
    }

    if (startGameBtn) startGameBtn.addEventListener("click", reiniciarPartido);
    if (pauseGameBtn) pauseGameBtn.addEventListener("click", abrirPausa);
    if (resumeBtn) resumeBtn.addEventListener("click", cerrarPausa);
    if (forfeitBtn) forfeitBtn.addEventListener("click", rendirsePartido);
    
    if (substitutionsBtn) {
        substitutionsBtn.addEventListener("click", () => {
            if (pauseMenuOverlay) pauseMenuOverlay.classList.add("hidden");
            if (substitutionsModal) substitutionsModal.classList.remove("hidden");
        });
    }
    
    if (closeSubBtn) {
        closeSubBtn.addEventListener("click", () => {
            if (substitutionsModal) substitutionsModal.classList.add("hidden");
            if (isPaused && pauseMenuOverlay) pauseMenuOverlay.classList.remove("hidden");
        });
    }

    if (confirmSubBtn) confirmSubBtn.addEventListener("click", ejecutarSustitucion);
    if (closeSummaryBtn) {
        closeSummaryBtn.addEventListener("click", () => {
            if (finalSummaryOverlay) finalSummaryOverlay.classList.add("hidden");
        });
    }
}

function reiniciarPartido() {
    const p1Idx = playerSelect ? playerSelect.value : 0;
    const p1Data = todosLosJugadores[p1Idx] || { name: "Jugador 1", rating: 85 };
    team1.main.name = p1Data.name;
    team1.main.rating = p1Data.rating;
    team1.main.baseSpeed = 3.5 + (team1.main.rating / 100) * 2.2;
    team1.main.nitro = 100;
    team1.main.hp = 100;
    team1.main.stunnedUntil = 0;
    team1.main.lastPowerShot = 0;
    team1.main.goals = 0;

    if (p1BadgeSelect) imgP1Badge.src = encodeURI(p1BadgeSelect.value);
    if (cpuBadgeSelect) imgCpuBadge.src = encodeURI(cpuBadgeSelect.value);

    if (gameModeSelect && gameModeSelect.value === "2P") {
        team2.main.isHuman = true;
        const p2Idx = player2Select ? player2Select.value : 1;
        const p2Data = todosLosJugadores[p2Idx] || { name: "Jugador 2", rating: 85 };
        team2.main.name = p2Data.name;
        team2.main.rating = p2Data.rating;
        team2.main.baseSpeed = 3.5 + (team2.main.rating / 100) * 2.2;
    } else {
        team2.main.isHuman = false;
        team2.main.name = "CPU Bot";
        const diff = difficultySelect ? difficultySelect.value : "normal";
        if (diff === "fácil") {
            team2.main.baseSpeed = 2.8;
            team2.main.reactionRate = 0.04;
        } else if (diff === "normal") {
            team2.main.baseSpeed = 3.8;
            team2.main.reactionRate = 0.07;
        } else {
            team2.main.baseSpeed = 4.8;
            team2.main.reactionRate = 0.11;
        }
    }
    team2.main.nitro = 100;
    team2.main.hp = 100;
    team2.main.stunnedUntil = 0;
    team2.main.lastPowerShot = 0;
    team2.main.goals = 0;

    resetPosiciones();
    scoreP1 = 0;
    scoreCpu = 0;
    isPaused = false;
    isHalfTimePaused = false;
    hasPromptedSubP1 = false;
    hasPromptedSubP2 = false;
    
    if (pauseMenuOverlay) pauseMenuOverlay.classList.add("hidden");
    if (substitutionsModal) substitutionsModal.classList.add("hidden");
    if (finalSummaryOverlay) finalSummaryOverlay.classList.add("hidden");

    iniciarTemporizador();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    bucleJuego();
}

function iniciarTemporizador() {
    clearInterval(timerInterval);
    matchTime = 180;

    timerInterval = setInterval(() => {
        if (isPaused) return;

        matchTime--;

        let m = Math.floor(matchTime / 60);
        let s = matchTime % 60;
        let str = `⏱️ Tiempo: ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

        if (gameTimerElement) gameTimerElement.textContent = str;

        if (matchTime === 89 && !isHalfTimePaused) {
            pausaMedioTiempo();
        }

        if (matchTime <= 0) {
            clearInterval(timerInterval);
            cancelAnimationFrame(gameLoopId);
            mostrarResumenFinal();
        }
    }, 1000);
}

function pausaMedioTiempo() {
    isHalfTimePaused = true;
    isPaused = true;
    if (halfTimeNotice) halfTimeNotice.classList.remove("hidden");
    if (pauseMenuOverlay) pauseMenuOverlay.classList.remove("hidden");

    let cd = 30;
    if (halfTimeNotice) halfTimeNotice.textContent = `⏸️ Descanso del Partido (Reanudación en ${cd}s)`;

    halfTimeTimer = setInterval(() => {
        cd--;
        if (halfTimeNotice) halfTimeNotice.textContent = `⏸️ Descanso del Partido (Reanudación en ${cd}s)`;
        if (cd <= 0) {
            clearInterval(halfTimeTimer);
            cerrarPausa();
        }
    }, 1000);
}

function abrirPausa() {
    isPaused = true;
    if (halfTimeNotice) halfTimeNotice.classList.add("hidden");
    if (pauseMenuOverlay) pauseMenuOverlay.classList.remove("hidden");
}

function cerrarPausa() {
    if (halfTimeTimer) clearInterval(halfTimeTimer);
    isPaused = false;
    isHalfTimePaused = false;
    if (pauseMenuOverlay) pauseMenuOverlay.classList.add("hidden");
}

function rendirsePartido() {
    cerrarPausa();
    clearInterval(timerInterval);
    cancelAnimationFrame(gameLoopId);
    scoreCpu += 3;
    mostrarResumenFinal();
}

function ejecutarSustitucion() {
    const target = subTargetSelect ? subTargetSelect.value : "P1";
    const replacementIdx = replacementSelect ? replacementSelect.value : 0;
    const playerNewData = todosLosJugadores[replacementIdx];

    if (!playerNewData) return;

    if (target === "P1") {
        team1.main.name = playerNewData.name;
        team1.main.rating = playerNewData.rating;
        team1.main.baseSpeed = 3.5 + (team1.main.rating / 100) * 2.2;
        team1.main.hp = 100;
        team1.main.nitro = 100;
        team1.main.stunnedUntil = 0;
        hasPromptedSubP1 = false;
    } else {
        team2.main.name = playerNewData.name;
        team2.main.rating = playerNewData.rating;
        team2.main.baseSpeed = 3.5 + (team2.main.rating / 100) * 2.2;
        team2.main.hp = 100;
        team2.main.nitro = 100;
        team2.main.stunnedUntil = 0;
        hasPromptedSubP2 = false;
    }

    if (substitutionsModal) substitutionsModal.classList.add("hidden");
    cerrarPausa();
}

function resetPosiciones() {
    if (!canvas) return;
    team1.main.x = 180; team1.main.y = canvas.height / 2;
    team1.defender.x = 110; team1.defender.y = canvas.height / 2;
    team1.gk.x = 30; team1.gk.y = canvas.height / 2;

    team2.main.x = 620; team2.main.y = canvas.height / 2;
    team2.defender.x = 690; team2.defender.y = canvas.height / 2;
    team2.gk.x = 770; team2.gk.y = canvas.height / 2;

    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 0;
    ball.vy = 0;
}

function bucleJuego() {
    if (!isPaused) {
        actualizarJuego();
        dibujarJuego();
    }
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    if (!canvas) return;
    const now = Date.now();

    if (team1.main.hp < 100) team1.main.hp = Math.min(100, team1.main.hp + 0.05);
    if (team2.main.hp < 100) team2.main.hp = Math.min(100, team2.main.hp + 0.05);

    if (team1.main.hp <= 0 && !hasPromptedSubP1 && !isPaused) {
        hasPromptedSubP1 = true;
        if (subTargetSelect) subTargetSelect.value = "P1";
        const subReason = document.getElementById("subReasonText");
        if (subReason) subReason.textContent = `⚠️ ¡${team1.main.name} está agotado! Realiza un cambio:`;
        abrirPausa();
        if (pauseMenuOverlay) pauseMenuOverlay.classList.add("hidden");
        if (substitutionsModal) substitutionsModal.classList.remove("hidden");
    }

    // P1 CONTROLES
    if (now > team1.main.stunnedUntil) {
        let dx1 = 0, dy1 = 0;
        if (keys["w"] || keys["W"]) dy1 -= 1;
        if (keys["s"] || keys["S"]) dy1 += 1;
        if (keys["a"] || keys["A"]) dx1 -= 1;
        if (keys["d"] || keys["D"]) dx1 += 1;

        if (keys["q"] || keys["Q"]) {
            if (team1.main.nitro > 0) {
                team1.main.speed = team1.main.baseSpeed * 1.6;
                team1.main.nitro = Math.max(0, team1.main.nitro - 0.8);
            } else team1.main.speed = team1.main.baseSpeed;
        } else {
            team1.main.speed = team1.main.baseSpeed;
            team1.main.nitro = Math.min(100, team1.main.nitro + 0.2);
        }

        if (dx1 !== 0 || dy1 !== 0) {
            let mag = Math.hypot(dx1, dy1);
            team1.main.lastDirX = dx1 / mag;
            team1.main.lastDirY = dy1 / mag;
            team1.main.x += (dx1 / mag) * team1.main.speed;
            team1.main.y += (dy1 / mag) * team1.main.speed;
        }
    }

    team1.main.x = Math.max(team1.main.radius, Math.min(canvas.width - team1.main.radius, team1.main.x));
    team1.main.y = Math.max(team1.main.radius, Math.min(canvas.height - team1.main.radius, team1.main.y));

    // P2 / CPU CONTROLES
    if (now > team2.main.stunnedUntil) {
        if (team2.main.isHuman) {
            let dx2 = 0, dy2 = 0;
            if (keys["ArrowUp"]) dy2 -= 1;
            if (keys["ArrowDown"]) dy2 += 1;
            if (keys["ArrowLeft"]) dx2 -= 1;
            if (keys["ArrowRight"]) dx2 += 1;

            if (keys["j"] || keys["J"]) {
                if (team2.main.nitro > 0) {
                    team2.main.speed = team2.main.baseSpeed * 1.6;
                    team2.main.nitro = Math.max(0, team2.main.nitro - 0.8);
                } else team2.main.speed = team2.main.baseSpeed;
            } else {
                team2.main.speed = team2.main.baseSpeed;
                team2.main.nitro = Math.min(100, team2.main.nitro + 0.2);
            }

            if (dx2 !== 0 || dy2 !== 0) {
                let mag = Math.hypot(dx2, dy2);
                team2.main.lastDirX = dx2 / mag;
                team2.main.lastDirY = dy2 / mag;
                team2.main.x += (dx2 / mag) * team2.main.speed;
                team2.main.y += (dy2 / mag) * team2.main.speed;
            }
        } else {
            let targetX = ball.x;
            let targetY = ball.y;

            if (ball.x > canvas.width * 0.3) {
                targetX = ball.x;
                targetY = ball.y;
            }

            if (Math.hypot(ball.x - team2.main.x, ball.y - team2.main.y) > 120 && team2.main.nitro > 20) {
                team2.main.speed = team2.main.baseSpeed * 1.4;
                team2.main.nitro -= 0.4;
            } else {
                team2.main.speed = team2.main.baseSpeed;
                team2.main.nitro = Math.min(100, team2.main.nitro + 0.2);
            }

            team2.main.x += (targetX - team2.main.x) * team2.main.reactionRate;
            team2.main.y += (targetY - team2.main.y) * team2.main.reactionRate;
        }
    }

    team2.main.x = Math.max(team2.main.radius, Math.min(canvas.width - team2.main.radius, team2.main.x));
    team2.main.y = Math.max(team2.main.radius, Math.min(canvas.height - team2.main.radius, team2.main.y));

    // DEFENSA Y PORTERO
    team1.defender.y += (ball.y - team1.defender.y) * 0.05;
    team2.defender.y += (ball.y - team2.defender.y) * 0.05;

    team1.gk.y += (ball.y - team1.gk.y) * 0.08;
    team2.gk.y += (ball.y - team2.gk.y) * 0.08;
    team1.gk.y = Math.max(canvas.height / 2 - 50, Math.min(canvas.height / 2 + 50, team1.gk.y));
    team2.gk.y = Math.max(canvas.height / 2 - 50, Math.min(canvas.height / 2 + 50, team2.gk.y));

    // COLISIÓN SÓLIDA
    resolverColisionSolida(team1.main, team2.main);
    resolverColisionSolida(team1.main, team2.defender);
    resolverColisionSolida(team2.main, team1.defender);

    // BALÓN PEGADO
    let distP1Ball = Math.hypot(ball.x - team1.main.x, ball.y - team1.main.y);
    let distP2Ball = Math.hypot(ball.x - team2.main.x, ball.y - team2.main.y);
    let pelotaPegada = false;

    if (keys["Shift"] && distP1Ball < team1.main.radius + ball.radius + 15 && now > team1.main.stunnedUntil) {
        pelotaPegada = true;
        ball.x = team1.main.x + team1.main.lastDirX * (team1.main.radius + ball.radius + 2);
        ball.y = team1.main.y + team1.main.lastDirY * (team1.main.radius + ball.radius + 2);
        ball.vx = 0; ball.vy = 0;
    }
    
    const cpuCanControl = (!team2.main.isHuman && difficultySelect && (difficultySelect.value === "normal" || difficultySelect.value === "difícil"));
    if ((keys["k"] || keys["K"] || cpuCanControl) && !pelotaPegada && distP2Ball < team2.main.radius + ball.radius + 15 && now > team2.main.stunnedUntil) {
        pelotaPegada = true;
        ball.x = team2.main.x + team2.main.lastDirX * (team2.main.radius + ball.radius + 2);
        ball.y = team2.main.y + team2.main.lastDirY * (team2.main.radius + ball.radius + 2);
        ball.vx = 0; ball.vy = 0;
    }

    // ENTRADAS
    if ((keys["x"] || keys["X"]) && now > team1.main.stunnedUntil) {
        if (distP2Ball < team1.main.radius + ball.radius + 30) {
            let angle = Math.atan2(ball.y - team1.main.y, ball.x - team1.main.x);
            ball.vx = Math.cos(angle) * 15;
            ball.vy = Math.sin(angle) * 15;
            team1.main.hp = Math.max(0, team1.main.hp - 5);
        }
    }

    const cpuDefend = (!team2.main.isHuman);
    if ((keys["m"] || keys["M"] || cpuDefend) && now > team2.main.stunnedUntil) {
        if (distP1Ball < team2.main.radius + ball.radius + 30) {
            let angle = Math.atan2(ball.y - team2.main.x, ball.x - team2.main.x);
            ball.vx = Math.cos(angle) * 15;
            ball.vy = Math.sin(angle) * 15;
            team2.main.hp = Math.max(0, team2.main.hp - 5);
        }
    }

    // FÍSICAS DE LA PELOTA
    if (!pelotaPegada) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= ball.friction;
        ball.vy *= ball.friction;

        let spd = Math.hypot(ball.vx, ball.vy);
        if (spd > ball.maxSpeed) {
            ball.vx = (ball.vx / spd) * ball.maxSpeed;
            ball.vy = (ball.vy / spd) * ball.maxSpeed;
        }

        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy) * 0.85;
        } else if (ball.y + ball.radius >= canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy = -Math.abs(ball.vy) * 0.85;
        }

        resolverColisionEntidadBalon(team1.main);
        resolverColisionEntidadBalon(team1.defender);
        resolverColisionEntidadBalon(team1.gk);

        resolverColisionEntidadBalon(team2.main);
        resolverColisionEntidadBalon(team2.defender);
        resolverColisionEntidadBalon(team2.gk);
    }

    // TIROS
    if ((keys["c"] || keys["C"]) && distP1Ball < team1.main.radius + ball.radius + 20) {
        let angle = Math.atan2(ball.y - team1.main.y, ball.x - team1.main.x);
        ball.vx = Math.cos(angle) * 10;
        ball.vy = Math.sin(angle) * 10;
    }

    if ((keys["l"] || keys["L"]) && distP2Ball < team2.main.radius + ball.radius + 20) {
        let angle = Math.atan2(ball.y - team2.main.y, ball.x - team2.main.x);
        ball.vx = Math.cos(angle) * 10;
        ball.vy = Math.sin(angle) * 10;
    }

    if ((keys["z"] || keys["Z"]) && (now - team1.main.lastPowerShot >= POWERSHOT_COOLDOWN) && distP1Ball < team1.main.radius + ball.radius + 25) {
        let angle = Math.atan2(ball.y - team1.main.y, ball.x - team1.main.x);
        ball.vx = Math.cos(angle) * 17.5;
        ball.vy = Math.sin(angle) * 17.5;
        team1.main.lastPowerShot = now;
    }

    const cpuPowerShot = (!team2.main.isHuman && ball.x < canvas.width * 0.4);
    if (((keys["p"] || keys["P"]) || cpuPowerShot) && (now - team2.main.lastPowerShot >= POWERSHOT_COOLDOWN) && distP2Ball < team2.main.radius + ball.radius + 25) {
        let angle = Math.atan2(ball.y - team2.main.y, ball.x - team2.main.x);
        ball.vx = Math.cos(angle) * 17.5;
        ball.vy = Math.sin(angle) * 17.5;
        team2.main.lastPowerShot = now;
    }

    // GOLES
    const goalTop = canvas.height / 2 - 60;
    const goalBottom = canvas.height / 2 + 60;

    if (ball.x - ball.radius <= 0) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            scoreCpu++;
            team2.main.goals++;
            resetPosiciones();
        } else {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.85;
        }
    }

    if (ball.x + ball.radius >= canvas.width) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            scoreP1++;
            team1.main.goals++;
            resetPosiciones();
        } else {
            ball.x = canvas.width - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.85;
        }
    }
}

function resolverColisionSolida(p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let dist = Math.hypot(dx, dy);
    let minDist = p1.radius + p2.radius;

    if (dist < minDist && dist > 0.001) {
        let overlap = minDist - dist;
        let nx = dx / dist;
        let ny = dy / dist;

        p1.x -= nx * (overlap / 2);
        p1.y -= ny * (overlap / 2);
        p2.x += nx * (overlap / 2);
        p2.y += ny * (overlap / 2);
    }
}

function resolverColisionEntidadBalon(entidad) {
    let dx = ball.x - entidad.x;
    let dy = ball.y - entidad.y;
    let distancia = Math.hypot(dx, dy);
    let minDist = entidad.radius + ball.radius;

    if (distancia < minDist) {
        let angle = Math.atan2(dy, dx);
        let fuerza = 5;
        ball.vx = Math.cos(angle) * fuerza;
        ball.vy = Math.sin(angle) * fuerza;
        ball.x = entidad.x + Math.cos(angle) * minDist;
        ball.y = entidad.y + Math.sin(angle) * minDist;
    }
}

function mostrarResumenFinal() {
    isPaused = true;
    const scoreTitle = document.getElementById("finalScoreTitle");
    if (scoreTitle) scoreTitle.textContent = `${team1.main.name} ${scoreP1} - ${scoreCpu} ${team2.main.name}`;

    let ratingP1 = (7.0 + team1.main.goals * 1.5).toFixed(1);
    let ratingP2 = (7.0 + team2.main.goals * 1.5).toFixed(1);

    const p1NameElem = document.getElementById("p1BestName");
    const p1RatingElem = document.getElementById("p1BestRating");
    if (p1NameElem) p1NameElem.textContent = team1.main.name;
    if (p1RatingElem) p1RatingElem.textContent = `VALORACIÓN: ${ratingP1}`;

    const p2NameElem = document.getElementById("p2BestName");
    const p2RatingElem = document.getElementById("p2BestRating");
    if (p2NameElem) p2NameElem.textContent = team2.main.name;
    if (p2RatingElem) p2RatingElem.textContent = `VALORACIÓN: ${ratingP2}`;

    const mvpNameElem = document.getElementById("mvpName");
    const mvpScoreElem = document.getElementById("mvpScore");

    if (parseFloat(ratingP1) >= parseFloat(ratingP2)) {
        if (mvpNameElem) mvpNameElem.textContent = team1.main.name;
        if (mvpScoreElem) mvpScoreElem.textContent = `VALORACIÓN DE RENDIMIENTO: ${ratingP1}`;
    } else {
        if (mvpNameElem) mvpNameElem.textContent = team2.main.name;
        if (mvpScoreElem) mvpScoreElem.textContent = `VALORACIÓN DE RENDIMIENTO: ${ratingP2}`;
    }

    if (finalSummaryOverlay) finalSummaryOverlay.classList.remove("hidden");
}

function dibujarJuego() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgPitch.complete && imgPitch.naturalWidth > 0) {
        ctx.drawImage(imgPitch, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    dibujarJugadorCanvas(team1.main, imgP1Badge, "#00ffff");
    dibujarJugadorCanvas(team1.defender, imgP1Badge, "#00cccc");
    dibujarJugadorCanvas(team1.gk, imgP1Badge, "#ffcc00");

    dibujarJugadorCanvas(team2.main, imgCpuBadge, "#ff0055");
    dibujarJugadorCanvas(team2.defender, imgCpuBadge, "#cc0044");
    dibujarJugadorCanvas(team2.gk, imgCpuBadge, "#ffcc00");

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${team1.main.name} ${scoreP1} - ${scoreCpu} ${team2.main.name}`, canvas.width / 2, 35);

    ctx.fillStyle = "#00ffff";
    ctx.fillRect(20, 15, team1.main.nitro * 1.2, 6);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(20, 24, team1.main.hp * 1.2, 6);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(20, 15, 120, 15);

    ctx.fillStyle = "#ff0055";
    ctx.fillRect(canvas.width - 140, 15, team2.main.nitro * 1.2, 6);
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(canvas.width - 140, 24, team2.main.hp * 1.2, 6);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(canvas.width - 140, 15, 120, 15);
}

function dibujarJugadorCanvas(entidad, imgEscudo, colorBorde) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(entidad.x, entidad.y, entidad.radius, 0, Math.PI * 2);
    ctx.clip();

    if (imgEscudo.complete && imgEscudo.naturalWidth > 0) {
        ctx.drawImage(imgEscudo, entidad.x - entidad.radius, entidad.y - entidad.radius, entidad.radius * 2, entidad.radius * 2);
    } else {
        ctx.fillStyle = colorBorde;
        ctx.fillRect(entidad.x - entidad.radius, entidad.y - entidad.radius, entidad.radius * 2, entidad.radius * 2);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(entidad.x, entidad.y, entidad.radius, 0, Math.PI * 2);
    ctx.strokeStyle = colorBorde;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (entidad.hp !== undefined) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(entidad.x - 20, entidad.y - entidad.radius - 12, 40, 5);
        ctx.fillStyle = entidad.hp > 30 ? "#2ecc71" : "#e53935";
        ctx.fillRect(entidad.x - 20, entidad.y - entidad.radius - 12, (entidad.hp / 100) * 40, 5);
    }
}

if (searchButton) searchButton.addEventListener("click", buscarJugador);
if (searchInput) searchInput.addEventListener("keyup", () => { buscarJugador(); });
if (nextBtn) {
    nextBtn.addEventListener("click", () => {
        if (offset + limite < jugadoresFiltrados.length) {
            offset += limite;
            renderizarPaginaActual();
        }
    });
}
if (previousBtn) {
    previousBtn.addEventListener("click", () => {
        if (offset - limite >= 0) {
            offset -= limite;
            renderizarPaginaActual();
        }
    });
}

cargarDatosAPI();
