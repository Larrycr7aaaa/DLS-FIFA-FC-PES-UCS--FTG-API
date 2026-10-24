const URL = './dls26-cards.json';

let todosLosJugadores = [];
let jugadoresFiltrados = [];
let offset = 0;
const limite = 8;

const playerContainer = document.getElementById("playerContainer");
const detailContainer = document.getElementById("detailContainer");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const playerCounter = document.getElementById("playerCounter");

const audioTrack = document.getElementById("audioTrack");
const playPauseBtn = document.getElementById("playPauseBtn");
const trackSelect = document.getElementById("trackSelect");
const trackTitle = document.getElementById("trackTitle");

// REPRODUCTOR
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

async function cargarDatosAPI() {
    loading.classList.remove("hidden");
    try {
        const respuesta = await fetch(URL);
        const data = await respuesta.json();
        todosLosJugadores = data.players || data;
        jugadoresFiltrados = [...todosLosJugadores];
        if (data.playlist) inicializarReproductor(data.playlist);
        
        pobladorSelectorJugadores();
        renderizarPaginaActual();
        inicializarJuegoCanvas();
    } catch (e) { console.error("Error al cargar la base de datos", e); }
    loading.classList.add("hidden");
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
            <img src="${player.image}" alt="${player.name}" onerror="this.src='./images_2.png';">
        </div>
        <div class="card-body">
            <h3>${player.name}</h3>
            <p><strong>${player.team}</strong> - ${player.position}</p>
            <p><strong>OVR:</strong> ${player.rating}</p>
            <button class="btn-info" style="margin-top:8px; width:100%; padding:6px; background:#00ffff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Ver Info</button>
        </div>
    `;
    card.querySelector(".btn-info").addEventListener("click", () => mostrarDetalle(player));
    playerContainer.appendChild(card);
}

function mostrarDetalle(player) {
    detailContainer.innerHTML = `
        <h2>${player.name} ${player.country?.flag || ''}</h2>
        <p><strong>Equipo:</strong> ${player.team}</p>
        <p><strong>Posición:</strong> ${player.position}</p>
        <p><strong>Media:</strong> ${player.rating}</p>
        <p><strong>Carta:</strong> ${player.cardType} (${player.year})</p>
    `;
}

function buscarJugador() {
    const busqueda = searchInput.value.trim().toLowerCase();
    jugadoresFiltrados = todosLosJugadores.filter(p =>
        p.name?.toLowerCase().includes(busqueda) ||
        p.team?.toLowerCase().includes(busqueda) ||
        p.position?.toLowerCase().includes(busqueda) ||
        String(p.rating).includes(busqueda)
    );
    offset = 0;
    renderizarPaginaActual();
}

searchButton.addEventListener("click", buscarJugador);
searchInput.addEventListener("keyup", buscarJugador);

// ===============================================
// MOTOR DE JUEGO DLS 7v7 CON BALÓN PARADO COMPLETO
// ===============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let imgPitch = new Image(); imgPitch.src = './FUT_2.jpg';
let imgGoal = new Image(); imgGoal.src = './PEN.png';
let imgP1Badge = new Image();
let imgCpuBadge = new Image();

let gameLoopId = null;
let timerInterval = null;
let matchTime = 180;
let keys = {};

let scoreP1 = 0;
let scoreCpu = 0;

// ESTADOS DEL PARTIDO
// NORMAL, FREE_KICK, PENALTY, CORNER, GOAL_KICK, INDIRECT_FREE_KICK
let matchState = 'NORMAL';
let takerPlayer = null;
let restartTimer = 0;

let team1 = [];
let team2 = [];

let ball = { x: 450, y: 250, radius: 7, vx: 0, vy: 0, friction: 0.95, holder: null };

function crearJugador(data, role, defaultX, defaultY, teamId) {
    return {
        x: defaultX, y: defaultY,
        baseX: defaultX, baseY: defaultY,
        radius: 14,
        speed: data ? 3.2 + (data.rating / 100) * 1.5 : 3.8,
        name: data ? data.name : role,
        rating: data ? data.rating : 80,
        role: role,
        team: teamId,
        stamina: 100
    };
}

function pobladorSelectorJugadores() {
    const container = document.getElementById("p1SquadSelectors");
    if (!container) return;
    container.innerHTML = "";

    const roles = ["GK", "DEF 1", "DEF 2", "MED 1", "MED 2", "DEL 1", "DEL 2"];
    roles.forEach((r, idx) => {
        const div = document.createElement("div");
        div.innerHTML = `<label style="font-size:0.7rem;">${r}:</label><select id="p1Sel_${idx}"></select>`;
        container.appendChild(div);

        const sel = div.querySelector("select");
        todosLosJugadores.forEach((p, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = `${p.name} (${p.position})`;
            if (i === idx) opt.selected = true;
            sel.appendChild(opt);
        });
    });
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup", e => { keys[e.key] = false; });
    document.getElementById("startGameBtn")?.addEventListener("click", reiniciarPartido);
}

function reiniciarPartido() {
    imgP1Badge.src = document.getElementById("p1BadgeSelect").value;
    imgCpuBadge.src = document.getElementById("cpuBadgeSelect").value;

    const getP1Data = (idx) => todosLosJugadores[document.getElementById(`p1Sel_${idx}`)?.value || idx];

    // ALINEACIÓN 7v7 TEAM 1
    team1 = [
        crearJugador(getP1Data(0), 'GK', 60, 250, 1),
        crearJugador(getP1Data(1), 'DEF', 180, 150, 1),
        crearJugador(getP1Data(2), 'DEF', 180, 350, 1),
        crearJugador(getP1Data(3), 'MED', 320, 180, 1),
        crearJugador(getP1Data(4), 'MED', 320, 320, 1),
        crearJugador(getP1Data(5), 'DEL', 420, 200, 1),
        crearJugador(getP1Data(6), 'DEL', 420, 300, 1)
    ];

    // ALINEACIÓN 7v7 TEAM 2 (CPU / P2)
    team2 = [
        crearJugador(todosLosJugadores[13] || null, 'GK', 840, 250, 2),
        crearJugador(todosLosJugadores[17] || null, 'DEF', 720, 150, 2),
        crearJugador(todosLosJugadores[29] || null, 'DEF', 720, 350, 2),
        crearJugador(todosLosJugadores[2] || null, 'MED', 580, 180, 2),
        crearJugador(todosLosJugadores[3] || null, 'MED', 580, 320, 2),
        crearJugador(todosLosJugadores[7] || null, 'DEL', 480, 200, 2),
        crearJugador(todosLosJugadores[8] || null, 'DEL', 480, 300, 2)
    ];

    scoreP1 = 0; scoreCpu = 0;
    matchState = 'NORMAL';
    resetPosiciones();
    iniciarTemporizador();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    bucleJuego();
}

function iniciarTemporizador() {
    clearInterval(timerInterval);
    matchTime = 180;
    timerInterval = setInterval(() => {
        if (matchTime > 0) {
            matchTime--;
            let m = Math.floor(matchTime / 60);
            let s = matchTime % 60;
            document.getElementById("gameTimer").textContent = `⏱️ Tiempo: ${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
        } else {
            clearInterval(timerInterval);
            cancelAnimationFrame(gameLoopId);
            alert(`¡Fin del partido! Resultado final: P1 ${scoreP1} - ${scoreCpu} P2`);
        }
    }, 1000);
}

function resetPosiciones() {
    ball.x = 450; ball.y = 250; ball.vx = 0; ball.vy = 0; ball.holder = null;

    // Posiciones iniciales
    const p1X = [60, 180, 180, 320, 320, 420, 420];
    const p1Y = [250, 150, 350, 180, 320, 200, 300];
    team1.forEach((p, i) => { p.x = p1X[i]; p.y = p1Y[i]; });

    const p2X = [840, 720, 720, 580, 580, 480, 480];
    const p2Y = [250, 150, 350, 180, 320, 200, 300];
    team2.forEach((p, i) => { p.x = p2X[i]; p.y = p2Y[i]; });
}

function bucleJuego() {
    actualizarJuego();
    dibujarJuego();
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    // GESTIÓN DE BALÓN PARADO
    if (matchState !== 'NORMAL') {
        actualizarBalonParado();
        return;
    }

    // CONTROLES P1 (Delantero principal 5)
    let p1Capt = team1[5];
    let spd = p1Capt.speed;
    if (keys["ArrowUp"]) p1Capt.y -= spd;
    if (keys["ArrowDown"]) p1Capt.y += spd;
    if (keys["ArrowLeft"]) p1Capt.x -= spd;
    if (keys["ArrowRight"]) p1Capt.x += spd;

    p1Capt.x = Math.max(15, Math.min(885, p1Capt.x));
    p1Capt.y = Math.max(15, Math.min(485, p1Capt.y));

    // MOVIMIENTO IA COMPAÑEROS P1 Y CPU
    team1.forEach((p, i) => { if (i !== 5) moverIAPosicional(p, ball); });
    team2.forEach(p => moverIAPosicional(p, ball));

    // FÍSICAS DE BALÓN Y POSESIÓN
    if (ball.holder) {
        ball.x = ball.holder.x + (ball.holder.team === 1 ? 12 : -12);
        ball.y = ball.holder.y;

        // TIRO Y PASE P1
        if (ball.holder === p1Capt) {
            if (keys[" "]) { // Tiro
                ball.holder = null;
                ball.vx = 14; ball.vy = (Math.random() - 0.5) * 4;
            } else if (keys["Shift"]) { // Pase / Centro
                ball.holder = null;
                ball.vx = 9; ball.vy = (Math.random() - 0.5) * 2;
            }
        }
    } else {
        ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= ball.friction; ball.vy *= ball.friction;

        // Capturar posesión
        [...team1, ...team2].forEach(p => {
            if (Math.hypot(ball.x - p.x, ball.y - p.y) < p.radius + ball.radius + 2) {
                ball.holder = p;
            }
        });
    }

    // REGISTRO DE FALTAS, CÓRNERS, SAQUES DE META Y OUTS
    comprobarLímitesYFaltas();
}

function comprobarLímitesYFaltas() {
    // FUERA DE BANDA / TIRO LIBRE INDIRECTO
    if (ball.y <= 10 || ball.y >= 490) {
        prepararBalonParado('INDIRECT_FREE_KICK', ball.x, ball.y <= 10 ? 20 : 480, 1);
        return;
    }

    // GOLES O BALÓN FUERA EN LÍNEAS DE FONDO
    if (ball.x <= 15) {
        if (ball.y > 180 && ball.y < 320) { // Gol P2
            scoreCpu++;
            resetPosiciones();
        } else {
            // Córner o Saque de Meta
            if (ball.vx < 0) prepararBalonParado('GOAL_KICK', 50, 250, 1);
            else prepararBalonParado('CORNER', 20, 20, 2);
        }
    }

    if (ball.x >= 885) {
        if (ball.y > 180 && ball.y < 320) { // Gol P1
            scoreP1++;
            resetPosiciones();
        } else {
            if (ball.vx > 0) prepararBalonParado('GOAL_KICK', 850, 250, 2);
            else prepararBalonParado('CORNER', 880, 20, 1);
        }
    }

    // DETECCIÓN DE ENTRADA / TIRO LIBRE O PENALTI
    if (keys["x"] || keys["X"]) {
        team2.forEach(p => {
            if (Math.hypot(p.x - team1[5].x, p.y - team1[5].y) < 22) {
                if (p.x > 700 && p.y > 120 && p.y < 380) {
                    prepararBalonParado('PENALTY', 780, 250, 1);
                } else {
                    prepararBalonParado('FREE_KICK', p.x, p.y, 1);
                }
            }
        });
    }
}

function prepararBalonParado(tipo, x, y, equipoAtacante) {
    matchState = tipo;
    ball.x = x; ball.y = y; ball.vx = 0; ball.vy = 0; ball.holder = null;
    takerPlayer = equipoAtacante === 1 ? team1[5] : team2[5];
    takerPlayer.x = x - 25; takerPlayer.y = y;
    restartTimer = 180; // 3 segundos para ejecutar
}

function actualizarBalonParado() {
    restartTimer--;
    if (keys[" "] || keys["Shift"] || restartTimer <= 0) {
        let pot = keys[" "] ? 15 : 9;
        let angle = matchState === 'PENALTY' ? 0 : Math.atan2(250 - ball.y, 900 - ball.x);

        ball.vx = Math.cos(angle) * pot;
        ball.vy = Math.sin(angle) * pot;
        matchState = 'NORMAL';
    }
}

function moverIAPosicional(p, b) {
    let targetX = p.baseX + (b.x - 450) * 0.3;
    let targetY = p.baseY + (b.y - 250) * 0.3;

    p.x += (targetX - p.x) * 0.04;
    p.y += (targetY - p.y) * 0.04;
}

function dibujarJuego() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // CAMPO
    if (imgPitch.complete && imgPitch.naturalWidth > 0) {
        ctx.drawImage(imgPitch, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#2b824c";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // PORTERÍAS REALES DLS
    if (imgGoal.complete && imgGoal.naturalWidth > 0) {
        ctx.drawImage(imgGoal, -10, 175, 30, 150);
        ctx.drawImage(imgGoal, canvas.width - 20, 175, 30, 150);
    }

    // DIBUJAR EQUIPOS 7v7
    team1.forEach(p => dibujarJugador(p, "#00ffff", imgP1Badge));
    team2.forEach(p => dibujarJugador(p, "#ff0055", imgCpuBadge));

    // BALÓN
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();

    // INDICADOR BALÓN PARADO Y SCOREBOARD DLS
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Poppins";
    ctx.fillText(`P1: ${scoreP1}  |  P2: ${scoreCpu}`, canvas.width / 2 - 50, 30);

    if (matchState !== 'NORMAL') {
        ctx.fillStyle = "#ffcc00";
        ctx.font = "bold 16px Poppins";
        ctx.fillText(`¡${matchState.replace(/_/g, ' ')}! Presiona ESPACIO o SHIFT`, canvas.width / 2 - 150, 60);
    }

    // RADAR TÁCTICO DLS
    dibujarRadarDLS();
}

function dibujarJugador(p, color, badgeImg) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();

    if (badgeImg.complete && badgeImg.naturalWidth > 0) {
        ctx.drawImage(badgeImg, p.x - 8, p.y - 8, 16, 16);
    }
}

function dibujarRadarDLS() {
    let rx = canvas.width / 2 - 60;
    let ry = canvas.height - 45;
    let rw = 120, rh = 35;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.strokeRect(rx, ry, rw, rh);

    team1.forEach(p => {
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(rx + (p.x / canvas.width) * rw, ry + (p.y / canvas.height) * rh, 3, 3);
    });
    team2.forEach(p => {
        ctx.fillStyle = "#ff0055";
        ctx.fillRect(rx + (p.x / canvas.width) * rw, ry + (p.y / canvas.height) * rh, 3, 3);
    });
}

cargarDatosAPI();
