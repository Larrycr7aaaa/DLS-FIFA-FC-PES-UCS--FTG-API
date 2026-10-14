// ===========================================
// DLS 26 CARDS SPA & MINIJUEGO 1P VS CPU
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

        // Cargar Playlist si está en el JSON
        if (data.playlist) {
            inicializarReproductor(data.playlist);
            todosLosJugadores = data.players || [];
        } else {
            todosLosJugadores = Array.isArray(data) ? data : [];
        }

        jugadoresFiltrados = [...todosLosJugadores];
        
        // Carga TODOS los jugadores del JSON al selector del juego
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
// LÓGICA Y MOTOR DEL MINIJUEGO 1P VS CPU
// ===========================================

const playerSelect = document.getElementById("playerSelect");
const p1BadgeSelect = document.getElementById("p1BadgeSelect");
const cpuBadgeSelect = document.getElementById("cpuBadgeSelect");
const difficultySelect = document.getElementById("difficultySelect");
const startGameBtn = document.getElementById("startGameBtn");
// VARIABLES DEL TEMPORIZADOR (script.js)
let totalTime = 180; // 3 minutos en segundos
let timerInterval = null;
const gameTimerElement = document.getElementById("gameTimer");

function iniciarTemporizador() {
    clearInterval(timerInterval);
    totalTime = 180; // Reiniciar a 3 minutos

    timerInterval = setInterval(() => {
        totalTime--;

        let minutos = Math.floor(totalTime / 60);
        let segundos = totalTime % 60;

        // Formato 00:00
        let minStr = minutos < 10 ? "0" + minutos : minutos;
        let secStr = segundos < 10 ? "0" + segundos : segundos;

        if (gameTimerElement) {
            gameTimerElement.textContent = `⏱️ Tiempo: ${minStr}:${secStr}`;
        }

        // Fin del partido
        if (totalTime <= 0) {
            clearInterval(timerInterval);
            cancelAnimationFrame(gameLoopId);
            alert(`¡FIN DEL PARTIDO!\nResultado: ${player1.name} ${scoreP1} - ${scoreCpu} ${cpu.name}`);
        }
    }, 1000);
}

// Llama a esta función dentro de reiniciarPartido()
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameLoopId = null;
let imgP1Badge = new Image();
let imgCpuBadge = new Image();
// DENTRO DE DIBUJARJUEGO() EN SCRIPT.JS

// 1. Calcular minutos y segundos restantes desde una variable startTime
let tiempoTranscurrido = Math.floor((Date.now() - gameStartTime) / 1000);
let tiempoRestante = Math.max(0, 180 - tiempoTranscurrido);

let min = Math.floor(tiempoRestante / 60);
let seg = tiempoRestante % 60;
let timeString = `${min < 10 ? '0' : ''}${min}:${seg < 10 ? '0' : ''}${seg}`;

// 2. Dibujar en el Canvas
ctx.fillStyle = "#ffcc00";
ctx.font = "bold 18px Poppins, sans-serif";
ctx.textAlign = "center";
ctx.fillText(`⏱️ ${timeString}`, canvas.width / 2, 85);

// Fondo usando la imagen FUT.jpg
let imgPitch = new Image();
imgPitch.src = './FUT.jpg';

let keys = {};

// Estado del partido
let scoreP1 = 0;
let scoreCpu = 0;

// Cooldown del PowerShot (20 segundos)
let lastPowerShotTime = 0;
const POWERSHOT_COOLDOWN = 20000; // ms

let player1 = {
    x: 150,
    y: 225,
    radius: 20,
    speed: 4,
    name: "Jugador 1",
    rating: 80,
    lastDirX: 1,
    lastDirY: 0
};

let cpu = {
    x: 650,
    y: 225,
    radius: 20,
    speed: 3.2,
    name: "CPU Bot",
    reactionRate: 0.05
};

let ball = {
    x: 400,
    y: 225,
    radius: 10,
    vx: 0,
    vy: 0,
    friction: 0.94, // Fricción mejorada para control
    maxSpeed: 18   // Límite para evitar atravesar paredes
};

// Carga TODOS los personajes del JSON al menú desplegable
function pobladorSelectorJugadores() {
    if (!playerSelect) return;
    playerSelect.innerHTML = "";
    
    todosLosJugadores.forEach((p, index) => {
        const option = document.createElement("option");
        option.value = index;
        const nacion = p.country?.flag ? p.country.flag : '';
        option.textContent = `${nacion} ${p.name} (${p.rating} OVR - ${p.position})`;
        playerSelect.appendChild(option);
    });
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift", "z", "Z"].includes(e.key)) {
            keys[e.key] = true;
        }
    });

    window.addEventListener("keyup", e => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift", "z", "Z"].includes(e.key)) {
            keys[e.key] = false;
        }
    });

    startGameBtn.addEventListener("click", reiniciarPartido);
}

function reiniciarPartido() {
    // Configurar el jugador que escogió la persona
    const idx = playerSelect.value;
    const pData = todosLosJugadores[idx] || { name: "Jugador 1", rating: 85 };
    player1.name = pData.name;
    player1.rating = pData.rating;
    
    // Velocidad proporcional a la media/rating del futbolista elegido
    player1.speed = 3.5 + (player1.rating / 100) * 2.5;

    // Escudos
    imgP1Badge.src = p1BadgeSelect.value;
    imgCpuBadge.src = cpuBadgeSelect.value;

    // Dificultad Adaptable
    const diff = difficultySelect.value;
    if (diff === "fácil") {
        cpu.speed = 2.5;
        cpu.reactionRate = 0.03;
    } else if (diff === "normal") {
        cpu.speed = 3.6;
        cpu.reactionRate = 0.06;
    } else { // difícil
        cpu.speed = 4.8;
        cpu.reactionRate = 0.1;
    }

    resetPosiciones();
    scoreP1 = 0;
    scoreCpu = 0;
    lastPowerShotTime = 0;

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    bucleJuego();
}

function resetPosiciones() {
    player1.x = 180;
    player1.y = canvas.height / 2;
    
    cpu.x = canvas.width - 180;
    cpu.y = canvas.height / 2;

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
    let dx = 0;
    let dy = 0;

    // 1. Controles de Flechas P1
    if (keys["ArrowUp"]) dy -= 1;
    if (keys["ArrowDown"]) dy += 1;
    if (keys["ArrowLeft"]) dx -= 1;
    if (keys["ArrowRight"]) dx += 1;

    if (dx !== 0 || dy !== 0) {
        let mag = Math.hypot(dx, dy);
        player1.lastDirX = dx / mag;
        player1.lastDirY = dy / mag;

        player1.x += (dx / mag) * player1.speed;
        player1.y += (dy / mag) * player1.speed;
    }

    // Limitar P1 a la pantalla
    player1.x = Math.max(player1.radius, Math.min(canvas.width - player1.radius, player1.x));
    player1.y = Math.max(player1.radius, Math.min(canvas.height - player1.radius, player1.y));

    // 2. IA Adaptable CPU
    let targetX = ball.x;
    let targetY = ball.y;

    if (ball.x < canvas.width / 2) {
        targetX = canvas.width - 120;
        targetY = ball.y * 0.7 + (canvas.height / 2) * 0.3; 
    }

    cpu.x += (targetX - cpu.x) * cpu.reactionRate;
    cpu.y += (targetY - cpu.y) * cpu.reactionRate;

    cpu.x = Math.max(cpu.radius, Math.min(canvas.width - cpu.radius, cpu.x));
    cpu.y = Math.max(cpu.radius, Math.min(canvas.height - cpu.radius, cpu.y));

    // 3. Habilidad: Pelota Pegada (Tecla SHIFT)
    let distP1Ball = Math.hypot(ball.x - player1.x, ball.y - player1.y);
    let esPelotaPegada = false;

    if (keys["Shift"] && distP1Ball < player1.radius + ball.radius + 15) {
        esPelotaPegada = true;
        // Poner pelota justo enfrente del jugador según su dirección de movimiento
        let holdDist = player1.radius + ball.radius + 2;
        ball.x = player1.x + player1.lastDirX * holdDist;
        ball.y = player1.y + player1.lastDirY * holdDist;
        ball.vx = 0;
        ball.vy = 0;
    }

    // 4. Físicas y Movimiento del Balón (Si no está pegada al jugador)
    if (!esPelotaPegada) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        ball.vx *= ball.friction;
        ball.vy *= ball.friction;

        // Limitar la velocidad máxima para evitar que traspase las paredes
        let currentSpeed = Math.hypot(ball.vx, ball.vy);
        if (currentSpeed > ball.maxSpeed) {
            ball.vx = (ball.vx / currentSpeed) * ball.maxSpeed;
            ball.vy = (ball.vy / currentSpeed) * ball.maxSpeed;
        }

        // Colisión de paredes (Superior e Inferior) con rebote asegurado
        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy) * 0.85;
        } else if (ball.y + ball.radius >= canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy = -Math.abs(ball.vy) * 0.85;
        }

        // Colisiones con Jugador y CPU
        resolverColisionEntidadBalon(player1);
        resolverColisionEntidadBalon(cpu);
    }

    // 5. Controles de Disparo
    // Disparo Normal (ESPACIO)
    if (keys[" "]) {
        if (distP1Ball < player1.radius + ball.radius + 20) {
            let angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
            ball.vx = Math.cos(angle) * 10;
            ball.vy = Math.sin(angle) * 10;
        }
    }

    // PowerShot Habilidad Especial (Tecla Z cada 20 segundos)
    const now = Date.now();
    if ((keys["z"] || keys["Z"]) && (now - lastPowerShotTime >= POWERSHOT_COOLDOWN)) {
        if (distP1Ball < player1.radius + ball.radius + 25) {
            let angle = Math.atan2(ball.y - player1.y, ball.x - player1.x);
            ball.vx = Math.cos(angle) * 17.5; // Tiro ultra potente
            ball.vy = Math.sin(angle) * 17.5;
            lastPowerShotTime = now;
        }
    }

    // 6. Porterías y Goles
    const goalTop = canvas.height / 2 - 60;
    const goalBottom = canvas.height / 2 + 60;

    // Portería Izquierda (CPU Anota)
    if (ball.x - ball.radius <= 0) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
            scoreCpu++;
            resetPosiciones();
        } else {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.85;
        }
    }

    // Portería Derecha (Player 1 Anota)
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
        
        // Separar la pelota del jugador para evitar traslapes
        ball.x = entidad.x + Math.cos(angle) * minDist;
        ball.y = entidad.y + Math.sin(angle) * minDist;
    }
}

function dibujarJuego() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo usando la imagen de cancha (FUT.jpg)
    if (imgPitch.complete && imgPitch.naturalWidth > 0) {
        ctx.drawImage(imgPitch, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dibujar Jugador 1
    dibujarJugadorCanvas(player1, imgP1Badge, "#00ffff");

    // Dibujar CPU
    dibujarJugadorCanvas(cpu, imgCpuBadge, "#ff0055");

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
    ctx.fillText(`${player1.name} ${scoreP1} - ${scoreCpu} ${cpu.name}`, canvas.width / 2, 35);

    // Indicador del PowerShot (Cooldown)
    const now = Date.now();
    const timePassed = now - lastPowerShotTime;
    ctx.font = "bold 13px Poppins, sans-serif";

    if (timePassed >= POWERSHOT_COOLDOWN) {
        ctx.fillStyle = "#00ffff";
        ctx.fillText("⚡ POWERSHOT [Z]: ¡LISTO!", canvas.width / 2, 60);
    } else {
        const remaining = Math.ceil((POWERSHOT_COOLDOWN - timePassed) / 1000);
        ctx.fillStyle = "#ffcc00";
        ctx.fillText(`⚡ POWERSHOT [Z]: ${remaining}s`, canvas.width / 2, 60);
    }
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
