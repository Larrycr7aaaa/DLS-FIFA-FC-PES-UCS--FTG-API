const URL = './dls26-cards.json';

// VARIABLES DE APLICACIÓN Y BASE DE DATOS
let todosLosJugadores = [];
let jugadoresFiltrados = [];
let offset = 0;
const limite = 8;

// INVENTARIO Y RECURSOS
let userBalance = {
    coins: "∞",
    gems: 225,
    points: 0,
    specialAgents: 0,
    physios: 0,
    coaches: 0
};

// RONDAS XI IDEAL
let currentRound = 1;
let xiDraftedTeam = { gk: null, defs: [], meds: [], dels: [] };
const RIVAL_CLUBS = [
    "Juventus", "Francia", "Real Madrid", "Barça", "Atlético de Madrid", 
    "Manchester City", "Manchester United", "Athletic Bilbao", "Inter de Milán", 
    "AC Milan", "Arsenal", "Bayern Múnich", "Dortmund", "Bayer Leverkusen"
];

// DOM
const playerContainer = document.getElementById("playerContainer");
const detailContainer = document.getElementById("detailContainer");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const loading = document.getElementById("loading");
const playerCounter = document.getElementById("playerCounter");

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

async function cargarDatosAPI() {
    loading.classList.remove("hidden");
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
        actualizarUIInventario();
        inicializarJuegoCanvas();
    } catch (error) {
        console.error("Error al cargar la API:", error);
    }
    loading.classList.add("hidden");
}

function actualizarUIInventario() {
    document.getElementById("gemsDisplay").textContent = userBalance.gems;
    document.getElementById("invPoints").textContent = userBalance.points;
    document.getElementById("invAgents").textContent = userBalance.specialAgents;
    document.getElementById("invPhysios").textContent = userBalance.physios;
    document.getElementById("invCoaches").textContent = userBalance.coaches;
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
            <p><strong>Dorsal:</strong> N.º ${player.dorsal || 'N/A'}</p>
            <p><strong>${player.team}</strong> - ${player.position}</p>
            <p><strong>OVR:</strong> ${player.rating}</p>
            <button class="btn-info">Ver Información</button>
        </div>
    `;
    card.querySelector(".btn-info").addEventListener("click", () => mostrarDetalle(player));
    playerContainer.appendChild(card);
}

function mostrarDetalle(player) {
    detailContainer.innerHTML = `
        <h2>${player.name} ${player.country ? player.country.flag : ''}</h2>
        <p><strong>Dorsal:</strong> N.º ${player.dorsal || 'N/A'}</p>
        <p><strong>Equipo:</strong> ${player.team}</p>
        <p><strong>Posición:</strong> ${player.position}</p>
        <p><strong>Valoración:</strong> ${player.rating}</p>
        <p><strong>Carta:</strong> ${player.cardType} (${player.year})</p>
    `;
}

// BÚSQUEDA GENERAL INCLUYENDO "DORSALº" / "DORSAL 10" / "N.º 7"
function buscarJugador() {
    let busqueda = searchInput.value.trim().toLowerCase();
    
    // Normalizar término dorsal
    let dorsalMatch = busqueda.match(/dorsal\s*º?\s*(\d+)/i) || busqueda.match(/^º?\s*(\d+)$/);
    let targetDorsal = dorsalMatch ? parseInt(dorsalMatch[1]) : null;

    jugadoresFiltrados = todosLosJugadores.filter(p => {
        if (targetDorsal !== null && p.dorsal === targetDorsal) return true;
        return (
            p.name?.toLowerCase().includes(busqueda) ||
            p.team?.toLowerCase().includes(busqueda) ||
            p.position?.toLowerCase().includes(busqueda) ||
            String(p.rating).includes(busqueda) ||
            String(p.dorsal).includes(busqueda)
        );
    });

    offset = 0;
    renderizarPaginaActual();
}

searchButton.addEventListener("click", buscarJugador);
searchInput.addEventListener("keyup", buscarJugador);

// ===============================================
// MOTOR DE JUEGO & MODO XI IDEAL (9 RONDAS)
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
let isXIMode = false;

let keys = {};
let scoreP1 = 0;
let scoreP2 = 0;

let p1Tactic = 'BAL';
let p2Tactic = 'BAL';

let team1 = { gk: null, def: null, med: null, del: null };
let team2 = { gk: null, def: null, med: null, del: null };

let ball = { x: 425, y: 240, radius: 8, vx: 0, vy: 0, friction: 0.94, holder: null };

function crearEntidad(data, role, number, defaultX, defaultY) {
    return {
        x: defaultX, y: defaultY,
        baseX: defaultX, baseY: defaultY,
        radius: 16,
        speed: 3.6,
        name: data ? data.name : role,
        rating: data ? data.rating : 80,
        image: data ? data.image : '',
        number: data ? (data.dorsal || number) : number,
        role: role,
        energy: 100,
        nitro: 100,
        // Táctica fija personal del jugador
        tacticalScheme: role === 'DEF' ? 'STAY_BACK' : role === 'DEL' ? 'PRESS_HIGH' : 'BOX_TO_BOX'
    };
}

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
    selects.forEach(s => { if (s) s.innerHTML = ""; });

    todosLosJugadores.forEach((p, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `${p.country?.flag || ''} ${p.name} (N.º${p.dorsal || '-'}) [${p.position}]`;
        const pos = (p.position || "").toUpperCase();

        if (["GK", "POR"].includes(pos)) {
            p1Gk?.appendChild(opt.cloneNode(true)); p2Gk?.appendChild(opt.cloneNode(true));
        } else if (["DFC", "DEF", "LD", "LI"].includes(pos)) {
            p1Def?.appendChild(opt.cloneNode(true)); p2Def?.appendChild(opt.cloneNode(true));
        } else if (["MC", "MCO", "MCD"].includes(pos)) {
            p1Med?.appendChild(opt.cloneNode(true)); p2Med?.appendChild(opt.cloneNode(true));
        } else {
            p1Del?.appendChild(opt.cloneNode(true)); p2Del?.appendChild(opt.cloneNode(true));
        }
    });
}

function inicializarJuegoCanvas() {
    window.addEventListener("keydown", e => { keys[e.key] = true; });
    window.addEventListener("keyup", e => { keys[e.key] = false; });

    document.getElementById("startGameBtn")?.addEventListener("click", () => iniciarPartidoModo('STANDARD'));
    document.getElementById("btnOpenXI")?.addEventListener("click", abrirModalXIDraft);
    document.getElementById("btnStartXIDraft")?.addEventListener("click", confirmarEIniciarXIDraft);

    setupTacticButtons('p1', (t) => p1Tactic = t);
    setupTacticButtons('p2', (t) => p2Tactic = t);
}

function setupTacticButtons(prefix, cb) {
    const bDef = document.getElementById(`${prefix}TacticDef`);
    const bBal = document.getElementById(`${prefix}TacticBal`);
    const bAtk = document.getElementById(`${prefix}TacticAtk`);
    
    if(!bDef) return;

    const reset = () => { bDef.classList.remove("active"); bBal.classList.remove("active"); bAtk.classList.remove("active"); };
    bDef.addEventListener("click", () => { reset(); bDef.classList.add("active"); cb('DEF'); });
    bBal.addEventListener("click", () => { reset(); bBal.classList.add("active"); cb('BAL'); });
    bAtk.addEventListener("click", () => { reset(); bAtk.classList.add("active"); cb('ATK'); });
}

// LÓGICA DE DRAFT MODO XI IDEAL (40 ♦)
function abrirModalXIDraft() {
    if (userBalance.gems < 40) {
        alert("¡No tienes suficientes gemas! Requiere 40♦.");
        return;
    }
    document.getElementById("xiDraftModal").classList.remove("hidden");
    poblarOpcionesXIDraft();
}

function poblarOpcionesXIDraft() {
    const container = document.getElementById("xiPlayersGrid");
    container.innerHTML = "";

    const formSelect = document.getElementById("xiFormationSelect").value;
    // Extraer número defensas, medios, delanteros según formación seleccionada
    let parts = formSelect.split("-").map(Number);
    let nDef = parts[0];
    let nMed = parts[1];
    let nDel = parts[2] || 1;

    let html = `<div class="xi-selector-box"><label>Portero (GK):</label><select id="xiGkSel"></select></div>`;

    for (let i = 1; i <= nDef; i++) {
        html += `<div class="xi-selector-box"><label>Defensa ${i}:</label><select id="xiDefSel${i}"></select></div>`;
    }
    for (let i = 1; i <= nMed; i++) {
        html += `<div class="xi-selector-box"><label>Centrocampista ${i}:</label><select id="xiMedSel${i}"></select></div>`;
    }
    for (let i = 1; i <= nDel; i++) {
        html += `<div class="xi-selector-box"><label>Delantero ${i}:</label><select id="xiDelSel${i}"></select></div>`;
    }

    container.innerHTML = html;

    // Llenar los campos creados con los jugadores disponibles
    let selects = container.querySelectorAll("select");
    selects.forEach(sel => {
        todosLosJugadores.forEach((p, idx) => {
            let opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = `${p.name} (N.º${p.dorsal || '-'}) [${p.position}] - ${p.rating}OVR`;
            sel.appendChild(opt);
        });
    });
}

document.getElementById("xiFormationSelect")?.addEventListener("change", poblarOpcionesXIDraft);

function confirmarEIniciarXIDraft() {
    userBalance.gems -= 40;
    actualizarUIInventario();
    document.getElementById("xiDraftModal").classList.add("hidden");
    
    currentRound = 1;
    isXIMode = true;
    iniciarRondaXI();
}

function iniciarRondaXI() {
    let rivalName = RIVAL_CLUBS[Math.floor(Math.random() * RIVAL_CLUBS.length)];
    let diff = currentRound <= 3 ? "Fácil" : currentRound <= 6 ? "Normal" : "Difícil";
    
    alert(`🏆 MODO XI IDEAL - Ronda ${currentRound}/9 (${diff})\nRival: ${rivalName}`);

    // Configuración de equipos para la partida arcade 4v4 de la ronda
    let p1Gk = todosLosJugadores[document.getElementById("xiGkSel")?.value || 0];
    let p1Def = todosLosJugadores[document.getElementById("xiDefSel1")?.value || 1];
    let p1Med = todosLosJugadores[document.getElementById("xiMedSel1")?.value || 2];
    let p1Del = todosLosJugadores[document.getElementById("xiDelSel1")?.value || 3];

    team1.gk = crearEntidad(p1Gk, 'GK', p1Gk.dorsal || 1, 50, 240);
    team1.def = crearEntidad(p1Def, 'DEF', p1Def.dorsal || 4, 180, 240);
    team1.med = crearEntidad(p1Med, 'MED', p1Med.dorsal || 8, 320, 240);
    team1.del = crearEntidad(p1Del, 'DEL', p1Del.dorsal || 9, 410, 240);

    // CPU aleatoria para la ronda
    team2.gk = crearEntidad(todosLosJugadores[13], 'GK', 13, 800, 240);
    team2.def = crearEntidad(todosLosJugadores[17], 'DEF', 5, 670, 240);
    team2.med = crearEntidad(todosLosJugadores[2], 'MED', 7, 530, 240);
    team2.del = crearEntidad(todosLosJugadores[7], 'DEL', 10, 440, 240);

    scoreP1 = 0; scoreP2 = 0;
    resetPosiciones();
    iniciarTemporizador();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    isPaused = false;
    bucleJuego();
}

function iniciarPartidoModo(type) {
    isXIMode = false;
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

    team1.gk = crearEntidad(p1Gk, 'GK', p1Gk?.dorsal || 1, 50, 240);
    team1.def = crearEntidad(p1Def, 'DEF', p1Def?.dorsal || 4, 180, 240);
    team1.med = crearEntidad(p1Med, 'MED', p1Med?.dorsal || 8, 320, 240);
    team1.del = crearEntidad(p1Del, 'DEL', p1Del?.dorsal || 9, 410, 240);

    team2.gk = crearEntidad(p2Gk, 'GK', p2Gk?.dorsal || 13, 800, 240);
    team2.def = crearEntidad(p2Def, 'DEF', p2Def?.dorsal || 3, 670, 240);
    team2.med = crearEntidad(p2Med, 'MED', p2Med?.dorsal || 6, 530, 240);
    team2.del = crearEntidad(p2Del, 'DEL', p2Del?.dorsal || 10, 440, 240);

    scoreP1 = 0; scoreP2 = 0;
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
                finalizarPartido();
            }
        }
    }, 1000);
}

function finalizarPartido() {
    if (isXIMode) {
        if (scoreP1 > scoreP2) {
            let winGems = Math.floor(Math.random() * 41) + 40; // 40-80 gemas
            userBalance.gems += winGems;
            userBalance.points += 600;
            userBalance.specialAgents += 1;
            userBalance.physios += 1;
            userBalance.coaches += 1;
            actualizarUIInventario();

            if (currentRound < 9) {
                alert(`🎉 ¡VICTORIA EN RONDA ${currentRound}!\nRecompensas: +${winGems}♦, +600 DP, +1 Agente, +1 Fisio, +1 Entrenador.\nAvanzas a la siguiente ronda.`);
                currentRound++;
                iniciarRondaXI();
            } else {
                alert("🏆 ¡FELICIDADES! ¡HAS COMPLETADO LAS 9 RONDAS DEL MODO XI IDEAL!");
            }
        } else {
            alert("❌ Has sido eliminado en esta ronda. Vuelve a intentarlo.");
        }
    } else {
        alert(`Fin del partido. Resultado: P1 ${scoreP1} - ${scoreP2} P2`);
    }
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
        resolverColisionesEntidades();
        dibujarJuego();
    }
    gameLoopId = requestAnimationFrame(bucleJuego);
}

function actualizarJuego() {
    // MOVIMIENTO P1 DELANTERO
    let speed1 = team1.del.speed * (team1.del.energy / 100);
    if (keys["w"] || keys["W"]) team1.del.y -= speed1;
    if (keys["s"] || keys["S"]) team1.del.y += speed1;
    if (keys["a"] || keys["A"]) team1.del.x -= speed1;
    if (keys["d"] || keys["D"]) team1.del.x += speed1;

    // ENTRADA P1 Y QUITAR BALÓN / REDUCIR ENERGÍA EN UN 20%
    if (keys["x"] || keys["X"]) {
        const rivales = [team2.def, team2.med, team2.del];
        rivales.forEach(r => {
            if (r && Math.hypot(r.x - team1.del.x, r.y - team1.del.y) < 35) {
                // Quitar balón
                if (ball.holder === r) ball.holder = team1.del;
                // Penalizar energía rival en un 20%
                r.energy = Math.max(0, r.energy - 20);
                // Impulso físico de desmarque
                r.x += (r.x - team1.del.x) * 0.5;
            }
        });
    }

    // TÁCTICAS Y RUTA DE JUGADORES
    movimientoTácticoAI(team1.def, ball, 1, p1Tactic);
    movimientoTácticoAI(team1.med, ball, 1, p1Tactic);

    movimientoTácticoAI(team2.def, ball, -1, p2Tactic);
    movimientoTácticoAI(team2.med, ball, -1, p2Tactic);
    movimientoTácticoAI(team2.del, ball, -1, p2Tactic);

    // LÓGICA PREVENCIÓN AUTOGOLES Y DESPEJES IA
    if (ball.holder === team2.del && ball.x < 350) {
        ball.holder = null;
        let angle = Math.atan2(240 - team2.del.y, 20 - team2.del.x);
        ball.vx = Math.cos(angle) * 11;
        ball.vy = Math.sin(angle) * 11;
    }

    // BALÓN
    if (ball.holder) {
        ball.x = ball.holder.x + (ball.holder.x < 425 ? 14 : -14);
        ball.y = ball.holder.y;
    } else {
        ball.x += ball.vx; ball.y += ball.vy;
        ball.vx *= ball.friction; ball.vy *= ball.friction;
    }

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

function movimientoTácticoAI(entidad, balon, dir, tactica) {
    if (!entidad) return;

    let offsetTactic = tactica === 'ATK' ? dir * 90 : tactica === 'DEF' ? dir * -70 : 0;
    let targetX = entidad.baseX + offsetTactic + (balon.x - 425) * 0.25;
    let targetY = balon.y * 0.5 + entidad.baseY * 0.5;

    // Respetar Esquema Táctico Personalizado por Posición
    if (entidad.tacticalScheme === 'STAY_BACK') targetX = Math.min(targetX, 250);

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

    // Balón
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

    // DORSAL EXTRAÍDO DEL JSON
    ctx.fillStyle = "#000";
    ctx.font = "bold 12px Poppins";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.number, p.x, p.y);

    if (badgeImg.complete && badgeImg.naturalWidth > 0) {
        ctx.drawImage(badgeImg, p.x - 8, p.y - 32, 16, 16);
    }

    // Barra de energía (Refleja pérdidas por entradas)
    ctx.fillStyle = p.energy > 30 ? "#00ff00" : "#ff0000";
    ctx.fillRect(p.x - 12, p.y + 18, (p.energy / 100) * 24, 3);
}

cargarDatosAPI();
