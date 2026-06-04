const socket = io();

// ==================== LOBBY STATE ====================
let currentScreen = 'menu';
let playerName = '';
let isHost = false;
let players = [];
let myRole = '';
let myFaction = '';
let myRoleData = null; // Store full role data for ability visibility checks

// ==================== GAME STATE ====================
let currentPhase = null;
let phaseTimer = null;
let phaseTimeRemaining = 0;
let phaseTimeLimit = 0;
let playersReadyToSkip = new Set();
let totalPlayers = 0;
let currentPhaseEndTimestamp = null;

// Game players and data
let gamePlayers = [];
let myPlayerNumber = null;
let inactiveHouses = [];
let abilityUsed = false;
let currentHoveredHouse = null;
let voteConfirmed = false;
let skipped = false;

// Chat history
let chatHistory = {
    main: [],
    second: [] // dead or mafia
};

// Player positions (for movement sync)
let playerPositions = {}; // { playerId: {x, y, status} }
let dotX = 600;
let dotY = 450;
const DOT_SPEED = 5;
const DOT_RADIUS = 25;
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 900;

// Keys currently pressed
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

let isInputFocused = false;
let timeRemaining = 240;
let currentPhaseData = null;

// ==================== DOM ELEMENTS ====================
// Lobby
const lobbyContainer = document.getElementById('lobby-container');
const gameContainer = document.getElementById('game-container');
const menuSection = document.getElementById('menu-section');
const hostSection = document.getElementById('host-section');
const joinSection = document.getElementById('join-section');
const playersSection = document.getElementById('players-section');
const statusMessage = document.getElementById('statusMessage');
const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const hostNameInput = document.getElementById('hostName');
const joinNameInput = document.getElementById('joinName');
const joinCodeInput = document.getElementById('joinCode');
const hostGameBtn = document.getElementById('hostGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const playersList = document.getElementById('playersList');
const startGameBtn = document.getElementById('startGameBtn');
const backFromHostBtn = document.getElementById('backFromHostBtn');
const backFromJoinBtn = document.getElementById('backFromJoinBtn');
const backFromPlayersBtn = document.getElementById('backFromPlayersBtn');

// Game UI
const dot = document.getElementById('dot');
const townImage = document.getElementById('townImage');
const playerList = document.getElementById('playerList');
const roleSpan = document.getElementById('roleSpan');
const phaseTitle = document.getElementById('phaseTitle');
const timer = document.getElementById('timer');
const abilityStatus = document.getElementById('abilityStatus');
const skipBtn = document.getElementById('skipBtn');
const voteBtn = document.getElementById('voteBtn');
const voteBtnHint = document.getElementById('voteBtnHint');
const rulesBtn = document.getElementById('rulesBtn');
const rulesModal = document.getElementById('rulesModal');

// ==================== SOCKET EVENTS ====================
socket.on('connect', () => {
    console.log('Connected to server');
    updateStatus('Connected to server!');
});

socket.on('game-hosted', (data) => {
    const { gameCode, players: connectedPlayers } = data;
    updateStatus(`Game hosted! Code: ${gameCode}`);
    showPlayersSection();
    updatePlayersList(connectedPlayers);
});

socket.on('host-error', (data) => {
    const { message } = data;
    updateStatus(message, 'error');
});

socket.on('join-success', (data) => {
    const { players: connectedPlayers } = data;
    updateStatus('Joined game successfully!');
    showPlayersSection();
    updatePlayersList(connectedPlayers);
});

socket.on('join-error', (data) => {
    const { message } = data;
    updateStatus(message, 'error');
});

socket.on('players-updated', (connectedPlayers) => {
    players = connectedPlayers;
    updatePlayersList(connectedPlayers);
});

socket.on('can-start-game', (data) => {
    const { canStart } = data;
    if (isHost && canStart) {
        startGameBtn.style.display = 'block';
        updateStatus('All players ready! You can start the game.');
    } else {
        startGameBtn.style.display = 'none';
        updateStatus('Waiting for players...');
    }
});

socket.on('game-starting', (data) => {
    const { message } = data;
    updateStatus(message);
});

socket.on('role-assignment', (data) => {
    const { message, role, faction } = data;
    updateStatus(message);
    myRole = role;
    myFaction = faction;
    if (roleSpan) {
        roleSpan.textContent = role.toUpperCase();
        roleSpan.style.color = faction === 'mafia' ? 'var(--colour-mafia)' : 'var(--colour-alive)';
    }
});

// Game phase updates
socket.on('phase-start', (data) => {
    const { phase, participantList, roleData, dayData, nightData, duration, endTimestamp } = data || {};
    currentPhaseData = data;
    currentPhase = phase; // Track current phase for visibility logic
    myRoleData = roleData; // Store role data for ability visibility checks
    
    // Reset skip status for new phase
    skipped = false;
    if (skipBtn) {
        skipBtn.textContent = 'Skip Phase';
        skipBtn.disabled = false;
        skipBtn.style.opacity = '1';
    }
    
    // Show game UI and hide lobby
    lobbyContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    
    // Store player data
    if (Array.isArray(participantList)) {
        gamePlayers = participantList.map((p, idx) => ({
            id: idx + 1,
            player_number: idx + 1,
            name: p.name,
            status: p.alive ? 'alive' : 'dead',
            active: p.active,
            alive: p.alive
        }));
        
        // Store total player count for skip display
        totalPlayers = gamePlayers.length;
        
        // Map current user to their player number if possible
        const normalizedSelfName = playerName?.trim().toLowerCase();
        const selfEntry = gamePlayers.find(p => p.name?.trim().toLowerCase() === normalizedSelfName);
        myPlayerNumber = selfEntry ? selfEntry.player_number : null;
        
        inactiveHouses = [];
        for (let i = gamePlayers.length + 1; i <= 12; i++) inactiveHouses.push(i);
        
        renderPlayerList();
        renderHouses();
        renderPlayerNames();
    }
    
    // Update background
    updateBackgroundForPhase(phase, roleData);
    
    // Update timer
    if (duration) {
        timeRemaining = duration;
        updateTimerDisplay();
    }
    
    // Update phase title
    if (phaseTitle) {
        const titleMap = { start: 'Game Start', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
        phaseTitle.textContent = `${titleMap[phase] || phase} Phase`;
    }
});

socket.on('phase-end', () => {
    if (phaseTimer) {
        clearInterval(phaseTimer);
        phaseTimer = null;
    }
    currentPhase = null;
});

// Receive chat messages from server
socket.on('chat-message-receive', (data) => {
    const { window, sender, text } = data || {};
    if (!window || !text) return;

    const messagesId = `chat-${window}-messages`;
    const messagesDiv = document.getElementById(messagesId);
    if (!messagesDiv) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    // Check if this is the current player's message
    const isOwnMessage = (sender === playerName);
    const senderClass = isOwnMessage ? 'chat-message-sender-own' : 'chat-message-sender';
    
    messageElement.innerHTML = `<span class="${senderClass}">${sender}:</span> <span class="chat-message-text">${text}</span>`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Receive player position updates
socket.on('player-position', (data) => {
    const { socketId, x, y } = data || {};
    if (socketId !== socket.id) {
        // Store other players' positions for rendering
        playerPositions[socketId] = { x, y };
    }
});

// Receive skip phase updates
socket.on('phase-skip-update', (data) => {
    const { playersReady } = data || {};
    if (playersReady) {
        // Update skip counter display at top
        const skipDisplay = document.getElementById('skipped');
        if (skipDisplay && totalPlayers > 0) {
            skipDisplay.textContent = `${playersReady.length}/${totalPlayers}`;
        }
    }
});

// ==================== LOBBY FUNCTIONS ====================
function showHostSection() {
    currentScreen = 'host';
    menuSection.style.display = 'none';
    joinSection.style.display = 'none';
    hostSection.style.display = 'block';
    updateStatus('Enter your name and host a game');
}

function showJoinSection() {
    currentScreen = 'join';
    menuSection.style.display = 'none';
    hostSection.style.display = 'none';
    joinSection.style.display = 'block';
    updateStatus('Enter your name and game code to join');
}

function showPlayersSection() {
    menuSection.style.display = 'none';
    hostSection.style.display = 'none';
    joinSection.style.display = 'none';
    playersSection.style.display = 'block';
}

function backToMenu() {
    menuSection.style.display = 'block';
    hostSection.style.display = 'none';
    joinSection.style.display = 'none';
    playersSection.style.display = 'none';
    
    hostNameInput.value = '';
    joinNameInput.value = '';
    joinCodeInput.value = '';
    
    playerName = '';
    isHost = false;
    players = [];
    
    if (socket.connected) {
        socket.disconnect();
        socket.connect();
    }
    
    updateStatus('Welcome to Mafia Game!');
}

function hostGame() {
    const name = hostNameInput.value.trim();
    if (!name) {
        updateStatus('Please enter your name', 'error');
        return;
    }
    if (name.length > 10) {
        updateStatus('Name must be 10 characters or less', 'error');
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(name)) {
        updateStatus('Name can only contain letters and numbers', 'error');
        return;
    }
    
    playerName = name;
    isHost = true;
    socket.emit('host-game', { playerName: name });
    updateStatus('Hosting game...');
}

function joinGame() {
    const name = joinNameInput.value.trim();
    const code = joinCodeInput.value.trim();
    
    if (!name || !code) {
        updateStatus('Please enter both name and game code', 'error');
        return;
    }
    if (name.length > 10) {
        updateStatus('Name must be 10 characters or less', 'error');
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(name)) {
        updateStatus('Name can only contain letters and numbers', 'error');
        return;
    }
    if (code.length !== 4) {
        updateStatus('Game code must be 4 digits', 'error');
        return;
    }
    
    playerName = name;
    isHost = false;
    socket.emit('join-game', { playerName: name, inputCode: code });
    updateStatus('Joining game...');
}

function startGame() {
    const playerNames = players.map(p => p.name);
    socket.emit('start-game', { playerNames: playerNames });
    updateStatus('Starting game...');
}

function updatePlayersList(playersData) {
    players = playersData;
    playersList.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'lobby-player-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;
        
        playerDiv.appendChild(nameSpan);
        playersList.appendChild(playerDiv);
    });
}

function updateStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = type === 'error' ? 'status-error' : 'status-success';
}

// ==================== GAME UI FUNCTIONS ====================
function renderPlayerList() {
    playerList.innerHTML = '';
    gamePlayers.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-item ${player.status}`;
        
        // Create name and status sections
        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = player.name;
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'player-status';
        statusSpan.textContent = player.alive ? 'Alive' : 'Dead';
        
        playerDiv.appendChild(nameSpan);
        playerDiv.appendChild(statusSpan);
        playerList.appendChild(playerDiv);
    });
}

function renderHouses() {
    // Hide houses if player is in certain rooms (bedroom, office, prison, eliminated)
    const restrictedRooms = ['bedroom', 'office', 'prison', 'eliminated'];
    const shouldHideHouses = myRoleData && restrictedRooms.includes(myRoleData.room);
        console.log("ShouldHideHouses" + shouldHideHouses);
    console.log("myRoleData: " + myRoleData);
    
    for (let i = 1; i <= 12; i++) {
        const houseImg = document.getElementById(`house${i}`);
        const nameDiv = document.getElementById(`name${i}`);
        
        if (shouldHideHouses) {
            if (houseImg) houseImg.style.display = 'none';
            if (nameDiv) nameDiv.style.display = 'none';
            continue;
        }
        
        if (houseImg) houseImg.style.display = 'block';
        if (nameDiv) nameDiv.style.display = 'block';
        
        if (!houseImg) continue;
        
        if (inactiveHouses.includes(i)) {
            houseImg.src = 'images/inactive_house.png';
        } else {
            const player = gamePlayers.find(p => p.player_number === i);
            if (player && player.status === 'dead') {
                houseImg.src = 'images/dead_house.png';
            } else {
                houseImg.src = 'images/active_house.png';
            }
        }
    }
}

function renderPlayerNames() {
    for (let i = 1; i <= 12; i++) {
        const nameDiv = document.getElementById(`name${i}`);
        if (!nameDiv) continue;
        
        const player = gamePlayers.find(p => p.player_number === i);
        if (player && !inactiveHouses.includes(i)) {
            nameDiv.textContent = player.name;
            nameDiv.className = `player-name ${player.status}`;
        } else {
            nameDiv.textContent = '';
        }
    }
}

function updateBackgroundForPhase(phase, roleData) {
    function tryImagePath(name) {
        return `images/${name}_crop.png`;
    }
    
    if (phase === 'morning') {
        townImage.src = tryImagePath('town_morning');
    } else if (phase === 'afternoon') {
        townImage.src = tryImagePath('town_afternoon');
    } else if (phase === 'evening') {
        townImage.src = tryImagePath('town_evening');
    } else if (phase === 'night' && roleData) {
        const room = roleData.room || 'outside';
        switch (room) {
            case 'bedroom':
                townImage.src = tryImagePath('bedroom');
                break;
            case 'office':
                townImage.src = tryImagePath('office');
                break;
            case 'eliminated':
                townImage.src = tryImagePath('elimination');
                break;
            case 'outside':
            default:
                townImage.src = tryImagePath('town_night');
                break;
        }
    } else {
        townImage.src = tryImagePath('town_morning');
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    if (timer) timer.textContent = display;
}

// ==================== ABILITY & VOTE FUNCTIONS ====================
function updateAbilityStatus() {
    if (!abilityStatus) return;
    
    // Determine visibility
    const selfPlayer = myPlayerNumber !== null ? gamePlayers.find(p => p.player_number === myPlayerNumber) : null;
    const isDead = selfPlayer ? !selfPlayer.alive : false;
    const isDayPhase = ['morning', 'afternoon'].includes(currentPhase);
    const isNightPhase = currentPhase === 'night';
    const isEveningPhase = currentPhase === 'evening';
    
    // Check if role has day/night actions using action_day and action_night flags
    const hasDayAction = Boolean(myRoleData?.action_day);
    const hasNightAction = Boolean(myRoleData?.action_night);
    
    // Hide ability button for:
    // - Dead players (always)
    // - Evening phase (never)
    // - Day phases if role has no day action
    // - Night phase if role has no night action
    const shouldHideAbility = isDead || isEveningPhase || 
        (isDayPhase && !hasDayAction) || 
        (isNightPhase && !hasNightAction);
    
    const abilityContainer = abilityStatus?.parentElement;
    if (shouldHideAbility) {
        if (abilityContainer) abilityContainer.style.display = 'none';
        abilityStatus.style.display = 'none';
        return;
    }
    if (abilityContainer) abilityContainer.style.display = 'block';
    abilityStatus.style.display = 'block';
    
    if (abilityUsed) {
        abilityStatus.textContent = 'Ability already used';
        abilityStatus.className = 'ability-used';
    } else {
        abilityStatus.textContent = 'Use ability today';
        abilityStatus.className = 'ability-ready';
    }
}

function toggleAbility() {
    abilityUsed = !abilityUsed;
    updateAbilityStatus();
    // Emit ability use to server with target player number if hovering over a house
    const data = { action: 'toggle' };
    if (currentHoveredHouse) {
        data.target_player_number = currentHoveredHouse;
    }
    socket.emit('use-ability', data);
}

function skipPhase() {
    if (!skipped) {
        skipped = true;
        if (skipBtn) {
            skipBtn.textContent = 'Phase Skipped';
            skipBtn.disabled = true;
            skipBtn.style.opacity = '0.6';
        }
        socket.emit('player-skip-phase', { player: socket.id, phase: currentPhase });
    }
}

function detectHouseAtDot() {
    const dotRadiusX = 25;
    const dotRadiusY = 25;
    
    for (let i = 1; i <= 12; i++) {
        const house = document.getElementById(`house${i}`);
        if (!house) continue;
        
        const left = parseInt(house.style.left);
        const top = parseInt(house.style.top);
        const width = parseInt(house.style.width);
        const height = parseInt(house.style.height);
        
        if (dotX + dotRadiusX > left &&
            dotX - dotRadiusX < left + width &&
            dotY + dotRadiusY > top &&
            dotY - dotRadiusY < top + height) {
            return i;
        }
    }
    return null;
}

function updateVoteButton() {
    // Determine if voting should be visible
    const selfPlayer = myPlayerNumber !== null ? gamePlayers.find(p => p.player_number === myPlayerNumber) : null;
    const isDead = selfPlayer ? !selfPlayer.alive : false;
    const isNightPhase = currentPhase === 'night';
    const isMorningOrEvening = ['morning', 'evening'].includes(currentPhase);
    const isVillager = myFaction === 'villager';
    
    // Hide vote button for:
    // - Dead players (always)
    // - Morning/Evening phases (voting only during afternoon)
    // - Night phase for villagers (only mafia votes at night)
    const shouldHideVote = isDead || isMorningOrEvening || (isNightPhase && isVillager);
    
    const voteContainer = voteBtn?.parentElement;
    if (shouldHideVote) {
        if (voteContainer) voteContainer.style.display = 'none';
        voteBtn.style.display = 'none';
        if (voteBtnHint) voteBtnHint.style.display = 'none';
        return;
    }
    if (voteContainer) voteContainer.style.display = 'block';
    voteBtn.style.display = 'block';
    if (voteBtnHint) voteBtnHint.style.display = 'block';
    
    const hoveredHouse = detectHouseAtDot();
    
    if (hoveredHouse && !voteConfirmed) {
        const player = gamePlayers.find(p => p.player_number === hoveredHouse);
        if (player) {
            currentHoveredHouse = hoveredHouse;
            voteBtn.textContent = `Vote ${player.name}`;
            voteBtn.classList.add('vote-active');
            voteBtnHint.textContent = `Press F or click to vote for ${player.name}`;
        }
    } else if (!voteConfirmed) {
        currentHoveredHouse = null;
        voteBtn.textContent = 'Vote';
        voteBtn.classList.remove('vote-active');
        voteBtnHint.textContent = 'Press F or click here to vote';
    }
}

function confirmVote(houseNumber) {
    if (voteConfirmed) return;
    
    const player = gamePlayers.find(p => p.player_number === houseNumber);
    if (player) {
        voteConfirmed = true;
        voteBtn.textContent = `${player.name} was voted`;
        voteBtn.classList.remove('vote-active');
        voteBtn.classList.add('vote-confirmed');
        voteBtnHint.textContent = 'Vote confirmed';
        voteBtn.disabled = true;
        
        // Emit vote to server
        socket.emit('add-vote', { target_player_number: houseNumber });
    }
}

// ==================== MOVEMENT FUNCTIONS ====================
function updateDot() {
    let newX = dotX;
    let newY = dotY;
    
    if (keys.w) newY -= DOT_SPEED;
    if (keys.s) newY += DOT_SPEED;
    if (keys.a) newX -= DOT_SPEED;
    if (keys.d) newX += DOT_SPEED;
    
    newX = Math.max(DOT_RADIUS, Math.min(IMAGE_WIDTH - DOT_RADIUS, newX));
    newY = Math.max(DOT_RADIUS, Math.min(IMAGE_HEIGHT - DOT_RADIUS, newY));
    
    dotX = newX;
    dotY = newY;
    
    dot.style.left = dotX + 'px';
    dot.style.top = dotY + 'px';
    
    // Broadcast position
    socket.emit('player-move', { x: dotX, y: dotY });
}

function renderOtherPlayerDots() {
    // Only render other dots during day phases (morning, afternoon, evening)
    const isDayPhase = ['morning', 'afternoon', 'evening'].includes(currentPhase);
    if (!isDayPhase) {
        // Remove any existing other-player dots
        document.querySelectorAll('.other-dot').forEach(el => el.remove());
        return;
    }
    
    // Remove old dots (except the main dot)
    document.querySelectorAll('.other-dot').forEach(el => el.remove());
    
    // Render other players' dots
    for (const [socketId, position] of Object.entries(playerPositions)) {
        if (socketId === socket.id) continue; // Skip own dot
        
        // Find player status in gamePlayers
        let playerStatus = 'alive'; // Default
        let playerName = 'Player';
        
        // Map socketId to player number through currentPhaseData if available
        // For now, create a generic other-player dot
        const otherDot = document.createElement('div');
        otherDot.className = `dot other-dot ${playerStatus}`;
        otherDot.style.left = (position.x) + 'px';
        otherDot.style.top = (position.y) + 'px';
        
        const imageWrapper = document.querySelector('.image-wrapper');
        if (imageWrapper) {
            imageWrapper.appendChild(otherDot);
        }
    }
}

// ==================== CHAT FUNCTIONS ====================
function sendChatMessage(chatWindow) {
    const inputId = `chat-${chatWindow}-input`;
    const input = document.getElementById(inputId);
    
    if (!input || input.value.trim() === '') return;
    
    // Only emit to server - don't render locally
    // Server will send it back to all clients including sender
    socket.emit('chat-message', { window: chatWindow, message: input.value });
    
    input.value = '';
}

function closeRules() {
    rulesModal.classList.add('hidden');
}

// ==================== EVENT LISTENERS ====================
// Lobby
hostBtn.addEventListener('click', showHostSection);
joinBtn.addEventListener('click', showJoinSection);
hostGameBtn.addEventListener('click', hostGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);
backFromHostBtn.addEventListener('click', backToMenu);
backFromJoinBtn.addEventListener('click', backToMenu);
backFromPlayersBtn.addEventListener('click', backToMenu);

// Game UI
abilityStatus?.addEventListener('click', toggleAbility);
skipBtn?.addEventListener('click', skipPhase);
voteBtn?.addEventListener('click', () => {
    if (currentHoveredHouse && !voteConfirmed) confirmVote(currentHoveredHouse);
});
rulesBtn?.addEventListener('click', () => {
    rulesModal.classList.remove('hidden');
});
rulesModal?.addEventListener('click', (e) => {
    if (e.target === rulesModal) closeRules();
});

// Chat inputs
const chatMainInput = document.getElementById('chat-main-input');
const chatSecondInput = document.getElementById('chat-second-input');

chatMainInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage('main');
});

chatSecondInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage('second');
});

chatMainInput?.addEventListener('focus', () => { isInputFocused = true; });
chatMainInput?.addEventListener('blur', () => { isInputFocused = false; });
chatSecondInput?.addEventListener('focus', () => { isInputFocused = true; });
chatSecondInput?.addEventListener('blur', () => { isInputFocused = false; });

// Also track focus on lobby inputs to prevent hotkeys during lobby
hostNameInput?.addEventListener('focus', () => { isInputFocused = true; });
hostNameInput?.addEventListener('blur', () => { isInputFocused = false; });
joinNameInput?.addEventListener('focus', () => { isInputFocused = true; });
joinNameInput?.addEventListener('blur', () => { isInputFocused = false; });
joinCodeInput?.addEventListener('focus', () => { isInputFocused = true; });
joinCodeInput?.addEventListener('blur', () => { isInputFocused = false; });

chatMainInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        isInputFocused = false;
        chatMainInput.blur();
    }
});

chatSecondInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        isInputFocused = false;
        chatSecondInput.blur();
    }
});

// Keyboard
document.addEventListener('keydown', (e) => {
    if (isInputFocused) return;
    
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (key === 'e') {
        e.preventDefault();
        toggleAbility();
    }
    if (key === 'q') {
        e.preventDefault();
        skipPhase();
    }
    if (key === 'f') {
        e.preventDefault();
        if (currentHoveredHouse && !voteConfirmed) confirmVote(currentHoveredHouse);
    }
    if (key === 'r') {
        e.preventDefault();
        const isOpen = !rulesModal.classList.contains('hidden');
        if (isOpen) closeRules();
        else rulesModal.classList.remove('hidden');
    }
});

document.addEventListener('keyup', (e) => {
    if (isInputFocused) return;
    
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
});

// ==================== MAIN ANIMATION LOOP ====================
function animate() {
    updateDot();
    renderOtherPlayerDots(); // Render other players' positions
    updateVoteButton();
    updateAbilityStatus(); // Update ability button visibility
    updateTimerDisplay(); // Update timer display every frame
    requestAnimationFrame(animate);
}

// Start animation when game loads
window.addEventListener('load', () => {
    animate();
    
    // Start timer update loop
    const timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateTimerDisplay();
        }
    }, 1000);
});

// Initialize game UI
if (townImage.complete) {
    dot.className = 'dot alive';
}
