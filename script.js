// ===========================================
// DLS 26 CARDS SPA & MINIJUEGO
// API Local: dls26-cards.json
// ===========================================

const URL = './dls26-cards.json';

// ==============================
// VARIABLES DE DATOS Y PAGINACIÓN
// ==============================

let todosLosJugadores = [];
let jugadoresFiltrados = [];
let offset = 0;
const limite = 8;

// ==============================
// ELEMENTOS DEL DOM
// ==============================

const playerContainer = document.getElementById("playerContainer");
const detailContainer = document.getElementById("detailContainer");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

const playerCounter = document.getElementById("playerCounter");

// Mini Reproductor DOM
const audioTrack = document.getElementById("audioTrack");
const playPauseBtn = document.getElementById("playPauseBtn");
const trackSelect = document.getElementById("trackSelect");
const trackTitle = document.getElementById("trackTitle");

// ==============================
// LÓGICA DEL REPRODUCTOR
// ==============================

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

trackSelect.addEventListener("change", (e) => {
    const selectedFile = e.target.value;
    const selectedText = e.target.options[e.target.selectedIndex].text;

    audioTrack.src = selectedFile;
    trackTitle.textContent = `🎵 ${selectedText}`;

    audioTrack.play();
    playPauseBtn.textContent = "⏸";
});

// ==============================
// MAPEO DE COLORES POR POSICIÓN Y ATRIBUTO
// ==============================

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
    if (valor === 0) return "#ff66cc";       // Rosa (0)
    if (valor < 60) return "#ff3333";        // Rojo (1-59)
    if (valor < 70) return "#ff9900";        // Naranja (60-69)
    if (valor < 80) return "#ffd700";        // Dorado (70-79)
    if (valor < 90) return "#2ecc71";        // Verde (80-89)
    return "#00bfff";                        // Celeste (90-100)
}

// ==============================
// ESTADOS (LOADING / ERROR)
// ==============================

function mostrarLoading() {
    loading.classList.remove("hidden");
}

function ocultarLoading() {
    loading.classList.add("hidden");
}

function mostrarError(texto = "Error de procesamiento.") {
    errorMessage.textContent = texto;
    errorMessage.classList.remove("hidden");

    setTimeout(() => {
        errorMessage.classList.add("hidden");
    }, 2500);
}

// ==============================
// OBTENER DATOS DE LA API
// ==============================

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

// ==============================
// RENDERIZAR PÁGINA
// ==============================

function renderizarPaginaActual() {
    playerContainer.innerHTML = "";
    playerCounter.textContent = `${jugadoresFiltrados.length} Jugadores`;

    if (jugadoresFiltrados.length === 0) {
        playerContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No se encontraron resultados.</p>`;
        return;
    }

    const corte = jugadoresFiltrados.slice(offset, offset + limite);
    corte.forEach(jugador => crearCard(jugador));

    previousBtn.disabled = offset === 0;
    nextBtn.disabled = offset + limite >= jugadoresFiltrados.length;
}

// ==============================
// TARJETAS
// ==============================

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

    card.querySelector(".btn-info").addEventListener("click", () => {
        mostrarDetalle(player);
    });

    playerContainer.appendChild(card);
}

// ==============================
// DETALLE DEL JUGADOR
// ==============================

function mostrarDetalle(player) {
    const posUpper = player.position ? player.position.toUpperCase() : "";
    const esPortero = posUpper === "GK" || posUpper === "POR";
    const clasePosicion = obtenerClasePosicion(player.position);

    let statsHTML = "";

    if (player.stats) {
        if (player.stats.physical) {
            statsHTML += renderBarraStat("Velocidad", player.stats.physical.speed);
            statsHTML += renderBarraStat("Aceleración", player.stats.physical.acceleration);
            if (!esPortero) {
                statsHTML += renderBarraStat("Resistencia", player.stats.physical.stamina);
            }
            statsHTML += renderBarraStat("Fuerza", player.stats.physical.strength);
        }

        if (player.stats.technical) {
            statsHTML += renderBarraStat("Control", player.stats.technical.control);
            statsHTML += renderBarraStat("Pases", player.stats.technical.passing);
            if (!esPortero) {
                statsHTML += renderBarraStat("Tiro", player.stats.technical.shooting);
            }
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

// ==============================
// BUSCADOR EN TIEMPO REAL
// ==============================

function buscarJugador() {
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
// LÓGICA Y MOTOR DEL MINIJUEGO DLS
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

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameLoopId = null;
let timerInterval = null;
let matchTime = 180; // 3 minutos

let imgP1Badge = new Image();
let imgCpuBadge = new Image();

let imgPitch = new Image();
imgPitch.src = './FUT.jpg';

let keys = {};

let scoreP1 = 0;
let scoreCpu = 0;
const POWERSHOT_COOLDOWN = 20000; // 20s

let player1 = {
    x: 180,
    y: 225,
    radius: 20,
    baseSpeed: 4,
    speed: 4,
    name: "Jugador 1",
    rating: 80,
    lastDirX: 1,
    lastDirY: 0,
    nitro: 100,
    lastPowerShot: 0
};

let p2OrCpu = {
    x: 620,
    y: 225,
    radius: 20,
    baseSpeed: 3.5,
    speed: 3.5,
    name: "CPU Bot",
    rating: 80,
    lastDirX: -1,
    lastDirY: 0,
    nitro: 100,
    lastPowerShot: 0,
    reactionRate: 0.05,
    isHuman: false
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
    
    todosLosJugadores.forEach((p, index) => {
        const option = document.createElement("option");
        option.value = index;
        const nacion = p.country?.flag ? p.country.flag : '';
        option.textContent = `${nacion} ${p.name} (${p.rating} OVR - ${p.position})`;
        
        playerSelect.appendChild(option);
        if (player2Select) {
            const opt2 = option.cloneNode(true);
            player2Select.appendChild(opt2);
        }
    });

    if (player2Select && player2Select.options.length > 1) {
        player2Select.selectedIndex = 1;
    }
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup", e => { keys[e.key] = false; });

    gameModeSelect.addEventListener("change", () => {
        if (gameModeSelect.value === "2P") {
            p2PlayerGroup.style.display = "flex";
            difficultyGroup.style.display = "none";
        } else {
            p2PlayerGroup.style.display = "none";
            difficultyGroup.style.display = "flex";
        }
    });

    startGameBtn.addEventListener("click", reiniciarPartido);
}

function reiniciarPartido() {
    // Configurar P1
    const p1Idx = playerSelect.value;
    const p1Data = todosLosJugadores[p1Idx] || { name: "Jugador 1", rating: 85 };
    player1.name = p1Data.name;
    player1.rating = p1Data.rating;
    player1.baseSpeed = 3.5 + (player1.rating / 100) * 2.2;
    player1.nitro = 100;
    player1.lastPowerShot = 0;

    imgP1Badge.src = p1BadgeSelect.value;
    imgCpuBadge.src = cpuBadgeSelect.value;

    // Configurar P2 o CPU
    if (gameModeSelect.value === "2P") {
        p2OrCpu.isHuman = true;
        const p2Idx = player2Select.value;
        const p2Data = todosLosJugadores[p2Idx] || { name: "Jugador 2", rating: 85 };
        p2OrCpu.name = p2Data.name;
        p2OrCpu.rating = p2Data.rating;
        p2OrCpu.baseSpeed = 3.5 + (p2OrCpu.rating / 100) * 2.2;
    } else {
        p2OrCpu.isHuman = false;
        p2OrCpu.name = "CPU Bot";
        const diff = difficultySelect.value;
        if (diff === "fácil") {
            p2OrCpu.baseSpeed = 2.5;
            p2OrCpu.reactionRate = 0.03;
        } else if (diff === "normal") {
            p2OrCpu.baseSpeed = 3.6;
            p2OrCpu.reactionRate = 0.06;
        } else { // difícil
            p2OrCpu.baseSpeed = 4.8;
            p2OrCpu.reactionRate = 0.1;
        }
    }
    p2OrCpu.nitro = 100;
    p2OrCpu.lastPowerShot = 0;

    resetPosiciones();
    scoreP1 = 0;
    scoreCpu = 0;

    iniciarTemporizador();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    bucleJuego();
}

function iniciarTemporizador() {
    clearInterval(timerInterval);
    matchTime = 180; // 3 minutos

    timerInterval = setInterval(() => {
        matchTime--;

        let m = Math.floor(matchTime / 60);
        let s = matchTime % 60;
        let str = `⏱️ Tiempo: ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

        if (gameTimerElement) gameTimerElement.textContent = str;

        if (matchTime <= 0) {
            clearInterval(timerInterval);
            cancelAnimationFrame(gameLoopId);
            alert(`¡FIN DEL PARTIDO!\nResultado: ${player1.name} ${scoreP1} - ${scoreCpu} ${p2OrCpu.name}`);
        }
    }, 1000);
}

function resetPosiciones() {
    player1.x = 180;
    player1.y = canvas.height / 2;
    
    p2OrCpu.x = canvas.width - 180;
    p2OrCpu.y = canvas.height / 2;

    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 0;
    ball.vy = 0;
}

function bucleJuego() {
    actualizarJuego();
    dibujarJuego();
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    const now = Date.now();

    // --- CONTROLES Y MOVIMIENTO PLAYER 1 ---
    let dx1 = 0, dy1 = 0;
    if (keys["ArrowUp"]) dy1 -= 1;
    if (keys["ArrowDown"]) dy1 += 1;
    if (keys["ArrowLeft"]) dx1 -= 1;
    if (keys["ArrowRight"]) dx1 += 1;

    // Nitro (P1: Q)
    if (keys["q"] || keys["Q"]) {
        if (player1.nitro > 0) {
            player1.speed = player1.baseSpeed * 1.6;
            player1.nitro = Math.max(0, player1.nitro - 0.8);
        } else {
            player1.speed = player1.baseSpeed;
        }
    } else {
        player1.speed = player1.baseSpeed;
        player1.nitro = Math.min(100, player1.nitro + 0.2); // Recarga progresiva
    }

    if (dx1 !== 0 || dy1 !== 0) {
        let mag = Math.hypot(dx1, dy1);
        player1.lastDirX = dx1 / mag;
        player1.lastDirY = dy1 / mag;
        player1.x += (dx1 / mag) * player1.speed;
        player1.y += (dy1 / mag) * player1.speed;
    }

    player1.x = Math.max(player1.radius, Math.min(canvas.width - player1.radius, player1.x));
    player1.y = Math.max(player1.radius, Math.min(canvas.height - player1.radius, player1.y));

    // --- CONTROLES Y MOVIMIENTO PLAYER 2 O CPU ---
    if (p2OrCpu.isHuman) {
        let dx2 = 0, dy2 = 0;
        if (keys["w"] || keys["W"]) dy2 -= 1;
        if (keys["s"] || keys["S"]) dy2 += 1;
        if (keys["a"] || keys["A"]) dx2 -= 1;
        if (keys["d"] || keys["D"]) dx2 += 1;

        // Nitro (P2: E)
        if (keys["e"] || keys["E"]) {
            if (p2OrCpu.nitro > 0) {
                p2OrCpu.speed = p2OrCpu.baseSpeed * 1.6;
                p2OrCpu.nitro = Math.max(0, p2OrCpu.nitro - 0.8);
            } else {
                p2OrCpu.speed = p2OrCpu.baseSpeed;
            }
        } else {
            p2OrCpu.speed = p2OrCpu.baseSpeed;
            p2OrCpu.nitro = Math.min(100, p2OrCpu.nitro + 0.2);
        }

        if (dx2 !== 0 || dy2 !== 0) {
            let mag = Math.hypot(dx2, dy2);
            p2OrCpu.lastDirX = dx2 / mag;
            p2OrCpu.lastDirY = dy2 / mag;
            p2OrCpu.x += (dx2 / mag) * p2OrCpu.speed;
            p2OrCpu.y += (dy2 / mag) * p2OrCpu.speed;
        }
    } else {
        // Lógica Adaptable de la CPU según dificultad
        const diff = difficultySelect.value;
        let targetX = ball.x;
        let targetY = ball.y;

        if (ball.x < canvas.width / 2) {
            targetX = canvas.width - 120;
            targetY = ball.y * 0.7 + (canvas.height / 2) * 0.3; 
        }

        // Dificultad Normal/Difícil usan Nitro si la pelota está lejos
        if ((diff === "normal" || diff === "difícil") && Math.hypot(ball.x - p2OrCpu.x, ball.y - p2OrCpu.y) > 150 && p2OrCpu.nitro > 20) {
            p2OrCpu.speed = p2OrCpu.baseSpeed * 1.5;
            p2OrCpu.nitro -= 0.5;
        } else {
            p2OrCpu.speed = p2OrCpu.baseSpeed;
            p2OrCpu.nitro = Math.min(100, p2OrCpu.nitro + 0.2);
        }

        p2OrCpu.x += (targetX - p2OrCpu.x) * p2OrCpu.reactionRate;
        p2OrCpu.y += (targetY - p2OrCpu.y) * p2OrCpu.reactionRate;
    }

    p2OrCpu.x = Math.max(p2OrCpu.radius, Math.min(canvas.width - p2OrCpu.radius, p2OrCpu.x));
    p2OrCpu.y = Math.max(p2OrCpu.radius, Math.min(canvas.height - p2OrCpu.radius, p2OrCpu.y));

    // --- PELOTA PEGADA (CONTROL) ---
    let distP1Ball = Math.hypot(ball.x - player1.x, ball.y - player1.y);
    let distP2Ball = Math.hypot(ball.x - p2OrCpu.x, ball.y - p2OrCpu.y);
    let pelotaPegada = false;

    // P1 Control (Shift)
    if (keys["Shift"] && distP1Ball < player1.radius + ball.radius + 15) {
        pelotaPegada = true;
        ball.x = player1.x + player1.lastDirX * (player1.radius + ball.radius + 2);
        ball.y = player1.y + player1.lastDirY * (player1.radius + ball.radius + 2);
        ball.vx = 0; ball.vy = 0;
    }
    
    // P2 Control (G) o CPU Normal/Difícil
    const cpuCanControl = (!p2OrCpu.isHuman && (difficultySelect.value === "normal" || difficultySelect.value === "difícil"));
    if ((keys["g"] || keys["G"] || cpuCanControl) && !pelotaPegada && distP2Ball < p2OrCpu.radius + ball.radius + 15) {
        pelotaPegada = true;
        ball.x = p2OrCpu.x + p2OrCpu.lastDirX * (p2OrCpu.radius + ball.radius + 2);
        ball.y = p2OrCpu.y + p2OrCpu.lastDirY * (p2OrCpu.radius + ball.radius + 2);
        ball.vx = 0; ball.vy = 0;
    }

    // --- DEFENSA / ENTRADA (P1: X | P2: R | CPU en Todas las Dificultades) ---
    // P1 Defensa (Quitar pelota a P2)
    if (keys["x"] || keys["X"]) {
        if (Math.hypot(p2OrCpu.x - player1.x, p2OrCpu.y - player1.y) < player1.radius + p2OrCpu.radius + 20) {
            let angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
            ball.vx = Math.cos(angle) * 12;
            ball.vy = Math.sin(angle) * 12;
        }
    }

    // P2 o CPU Defensa
    const cpuDefend = (!p2OrCpu.isHuman); // CPU usa defensa en todas las dificultades
    if (keys["r"] || keys["R"] || cpuDefend) {
        if (Math.hypot(player1.x - p2OrCpu.x, player1.y - p2OrCpu.y) < player1.radius + p2OrCpu.radius + 20) {
            let angle = Math.atan2(ball.y - p2OrCpu.y, ball.x - p2OrCpu.x);
            ball.vx = Math.cos(angle) * 12;
            ball.vy = Math.sin(angle) * 12;
        }
    }

    // --- FÍSICAS DEL BALÓN ---
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

        // Rebotes
        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy) * 0.85;
        } else if (ball.y + ball.radius >= canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy = -Math.abs(ball.vy) * 0.85;
        }

        resolverColisionEntidadBalon(player1);
        resolverColisionEntidadBalon(p2OrCpu);
    }

    // --- DISPAROS Y POWERSHOT ---
    // P1 Disparo (Espacio)
    if (keys[" "] && distP1Ball < player1.radius + ball.radius + 20) {
        let angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
        ball.vx = Math.cos(angle) * 10;
        ball.vy = Math.sin(angle) * 10;
    }

    // P2 Disparo (F)
    if (keys["f"] || keys["F"]) {
        if (distP2Ball < p2OrCpu.radius + ball.radius + 20) {
            let angle = Math.atan2(ball.y - p2OrCpu.y, ball.x - p2OrCpu.x);
            ball.vx = Math.cos(angle) * 10;
            ball.vy = Math.sin(angle) * 10;
        }
    }

    // P1 PowerShot (Z)
    if ((keys["z"] || keys["Z"]) && (now - player1.lastPowerShot >= POWERSHOT_COOLDOWN) && distP1Ball < player1.radius + ball.radius + 25) {
        let angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
        ball.vx = Math.cos(angle) * 17.5;
        ball.vy = Math.sin(angle) * 17.5;
        player1.lastPowerShot = now;
    }

    // P2 PowerShot (T) o CPU Difícil
    const cpuPowerShot = (!p2OrCpu.isHuman && difficultySelect.value === "difícil" && ball.x > canvas.width * 0.6);
    if (((keys["t"] || keys["T"]) || cpuPowerShot) && (now - p2OrCpu.lastPowerShot >= POWERSHOT_COOLDOWN) && distP2Ball < p2OrCpu.radius + ball.radius + 25) {
        let angle = Math.atan2(ball.y - p2OrCpu.y, ball.x - p2OrCpu.x);
        ball.vx = Math.cos(angle) * 17.5;
        ball.vy = Math.sin(angle) * 17.5;
        p2OrCpu.lastPowerShot = now;
    }

    // --- GOLES ---
    const goalTop = canvas.height / 2 - 60;
    const goalBottom = canvas.height / 2 + 60;

    if (ball.x - ball.radius <= 0) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            scoreCpu++;
            resetPosiciones();
        } else {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.85;
        }
    }

    if (ball.x + ball.radius >= canvas.width) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            scoreP1++;
            resetPosiciones();
        } else {
            ball.x = canvas.width - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.85;
        }
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

function dibujarJuego() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgPitch.complete && imgPitch.naturalWidth > 0) {
        ctx.drawImage(imgPitch, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dibujar Jugadores
    dibujarJugadorCanvas(player1, imgP1Badge, "#00ffff");
    dibujarJugadorCanvas(p2OrCpu, imgCpuBadge, "#ff0055");

    // Dibujar Balón
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Marcador
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Poppins, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${player1.name} ${scoreP1} - ${scoreCpu} ${p2OrCpu.name}`, canvas.width / 2, 35);

    // Indicadores de Nitro
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(20, 20, player1.nitro * 1.2, 8);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(20, 20, 120, 8);

    ctx.fillStyle = "#ff0055";
    ctx.fillRect(canvas.width - 140, 20, p2OrCpu.nitro * 1.2, 8);
    ctx.strokeRect(canvas.width - 140, 20, 120, 8);
}

function dibujarJugadorCanvas(entidad, imgEscudo, colorBorde) {
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
}

// ==============================
// EVENTOS Y EVENT LISTENERS
// ==============================

searchButton.addEventListener("click", buscarJugador);

searchInput.addEventListener("keyup", () => {
    buscarJugador();
});

nextBtn.addEventListener("click", () => {
    if (offset + limite < jugadoresFiltrados.length) {
        offset += limite;
        renderizarPaginaActual();
    }
});

previousBtn.addEventListener("click", () => {
    if (offset - limite >= 0) {
        offset -= limite;
        renderizarPaginaActual();
    }
});

// INICIALIZAR
cargarDatosAPI();
