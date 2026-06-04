const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const player_files = require('./player_files');
const role_dynamic_data = require('./role_dynamic_data');
const phases = require('./phases');
const ability_handler = require('./ability_handler');

let connectedPlayers = {}; // Dictionary with game codes as keys, player arrays as values
let gameCode = '';
let hostSocket = null;
let gameState = 'waiting'; // waiting, setup, playing

function generateGameCode() {
    return Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0');
} 

function validatePlayerName(name, existingPlayers) {
    // Remove HTML tags and special characters for basic injection protection
    const sanitizedName = name.replace(/<[^>]*>/g, '').replace(/[^\w\s]/g, '').trim();
    
    // Check if name is empty after sanitization
    if (!sanitizedName) {
        return { valid: false, error: 'Name cannot be empty' };
    }
    
    // Check length (max 10 characters)
    if (sanitizedName.length > 10) {
        return { valid: false, error: 'Name must be 10 characters or less' };
    }
    
    // Check if name contains only letters and numbers
    if (!/^[a-zA-Z0-9]+$/.test(sanitizedName)) {
        return { valid: false, error: 'Name can only contain letters and numbers' };
    }
    
    // Check if name already exists (case insensitive)
    if (existingPlayers.find(p => p.name.toLowerCase() === sanitizedName.toLowerCase())) {
        return { valid: false, error: 'Player name already taken' };
    }
    
    return { valid: true, sanitizedName: sanitizedName };
}

function createServer() {
    const httpServer = http.createServer((req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Simple static file server: map URL to local file
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/' || reqPath === '/index.html') {
            return serveFile(res, 'index.html');
        }
        // strip leading /
        if (reqPath.startsWith('/')) reqPath = reqPath.slice(1);

        // Special-case socket.io client served from node_modules
        if (reqPath === 'socket.io/socket.io.js') {
            return serveFile(res, 'node_modules/socket.io/client-dist/socket.io.js');
        }

        // If file exists in project, serve it with inferred content-type
        if (fs.existsSync(reqPath) && fs.statSync(reqPath).isFile()) {
            return serveFile(res, reqPath);
        }

        res.writeHead(404);
        res.end('Not Found');
    });
    
    // Create Socket.IO server
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // Remove player from their game code
            for (const code in connectedPlayers) {
                connectedPlayers[code] = connectedPlayers[code].filter(p => p.socketId !== socket.id);
            }
            // If host disconnects, reset game
            if (hostSocket === socket) {
                hostSocket = null;
                gameCode = '';
                gameState = 'waiting';
            }
            // Broadcast updated player list
            io.emit('players-updated', connectedPlayers[gameCode] || []);
        });
        
        socket.on('host-game', (data) => {
            const { playerName } = data;
            
            // Validate player name against current game's players
            const currentGamePlayers = connectedPlayers[gameCode] || [];
            const nameValidation = validatePlayerName(playerName, currentGamePlayers);
            if (!nameValidation.valid) {
                socket.emit('host-error', { message: nameValidation.error });
                return;
            }
            
            // Generate new game code
            gameCode = generateGameCode();
            hostSocket = socket;
            gameState = 'setup';
            
            // Initialize players array for this game code
            if (!connectedPlayers[gameCode]) {
                connectedPlayers[gameCode] = [];
            }
            
            // Add host as first player
            const hostPlayer = {
                name: nameValidation.sanitizedName,
                socketId: socket.id,
                isHost: true,
                ready: false
            };
            connectedPlayers[gameCode] = [hostPlayer];
            
            // Send game code to host
            socket.emit('game-hosted', { gameCode, players: connectedPlayers[gameCode] });
            
            // Broadcast to all players
            io.emit('players-updated', connectedPlayers[gameCode]);
            
            console.log(`Game hosted with code: ${gameCode} by ${nameValidation.sanitizedName}`);
        });
        
        socket.on('join-game', (data) => {
            const { playerName, inputCode } = data;
            
            // Validate game code
            if (inputCode !== gameCode || gameState !== 'setup') {
                socket.emit('join-error', { message: 'Invalid game code or game not available' });
                return;
            }
            
            // Get current game's players
            const currentGamePlayers = connectedPlayers[gameCode] || [];
            
            // Check if game is full (max 12 players)
            if (currentGamePlayers.length >= 12) {
                socket.emit('join-error', { message: 'Game is full (maximum 12 players)' });
                return;
            }
            
            // Validate player name
            const nameValidation = validatePlayerName(playerName, currentGamePlayers);
            if (!nameValidation.valid) {
                socket.emit('join-error', { message: nameValidation.error });
                return;
            }
            
            // Add new player
            const newPlayer = {
                name: nameValidation.sanitizedName,
                socketId: socket.id,
                isHost: false,
                ready: false
            };
            connectedPlayers[gameCode].push(newPlayer);
            
            // Send success to joining player
            socket.emit('join-success', { players: connectedPlayers[gameCode] });
            
            // Broadcast updated player list to everyone
            io.emit('players-updated', connectedPlayers[gameCode]);
            
            // Check if host can start game (4+ players)
            if (connectedPlayers[gameCode].length >= 4) {
                hostSocket?.emit('can-start-game', { canStart: true });
            }
            
            console.log(`${nameValidation.sanitizedName} joined game ${gameCode}`);
        });
        
        socket.on('start-game', (data) => {
            const { playerNames } = data;
            
            // Only host can start game
            if (socket !== hostSocket) {
                socket.emit('start-error', { message: 'Only host can start game' });
                return;
            }
            
            // Get ready players from current game code
            const readyPlayers = connectedPlayers[gameCode]
                .filter(p => playerNames.includes(p.name))
                .map(p => p.name);
            
            if (readyPlayers.length < 4) {
                socket.emit('start-error', { message: 'Need at least 4 players to start' });
                return;
            }
            
            gameState = 'playing';
            
            // Start the game with ready players
            console.log('Starting game with players:', readyPlayers);
            
            // Get role assignments
            const assigned_roles = player_files.continue_game_setup(readyPlayers, io, connectedPlayers[gameCode]);
            
            // Send role assignments to all players
            for (const [playerName, roleName] of Object.entries(assigned_roles)) {
                const faction = role_dynamic_data.getRole(roleName).faction;
                const roleMessage = faction === 'mafia' ? 
                    `<span style="color: darkred;">Your role is ${roleName}</span>` : 
                    `<span style="color: darkblue;">Your role is ${roleName}</span>`;
                
                // Find player's socket and send role
                const playerSocket = connectedPlayers[gameCode].find(p => p.name === playerName)?.socketId;
                if (playerSocket) {
                    io.to(playerSocket).emit('role-assignment', { 
                        message: roleMessage,
                        role: roleName,
                        faction: faction
                    });
                }
            }
            
            // Notify all players that game is starting
            io.emit('game-starting', { message: 'Game is starting!' });

            // Initialize phases module and start progression asynchronously
            phases.initialiseSocketIO(io, () => connectedPlayers[gameCode]);
            (async () => {
                try {
                    const winner = await phases.phase_progresser();
                    console.log(`Game ended! Winner: ${winner}`);
                    io.emit('game-end', { winner });
                } catch (err) {
                    console.error('Phase progresser error:', err);
                }
            })();
        });

        // Handle votes from clients (vote by player number)
        socket.on('add-vote', (data) => {
            try {
                const { target_player_number } = data;
                // find voter player number by socket id
                const rolesByPlayer = role_dynamic_data.getRolesByPlayer();
                let voterNumber = null;
                for (const [playerName, roleInfo] of Object.entries(rolesByPlayer)) {
                    if (roleInfo.socketId === socket.id) {
                        const roleName = roleInfo.role;
                        const roleData = role_dynamic_data.getRole(roleName);
                        if (roleData) voterNumber = roleData.player_number;
                        break;
                    }
                }

                if (voterNumber && typeof target_player_number === 'number') {
                    const voting = require('./voting');
                    voting.add_vote(voterNumber, target_player_number);
                }
            } catch (err) {
                console.error('add-vote handler error:', err);
            }
        });

        // Handle ability use from clients
        socket.on('use-ability', (data) => {
            try {
                const { action, target_player_number } = data || {};
                const rolesByPlayer = role_dynamic_data.getRolesByPlayer();
                let roleNameForSocket = null;
                let playerNameForSocket = null;
                for (const [playerName, roleInfo] of Object.entries(rolesByPlayer)) {
                    if (roleInfo.socketId === socket.id) {
                        roleNameForSocket = roleInfo.role;
                        playerNameForSocket = playerName;
                        break;
                    }
                }

                if (!roleNameForSocket) return;

                // Map common day abilities to day_data and role flags
                switch (roleNameForSocket) {
                    case 'mayor':
                        role_dynamic_data.day_data.mayor_reveal = true;
                        role_dynamic_data.setGameAbilityUsed('mayor', true);
                        break;
                    case 'medium':
                        role_dynamic_data.day_data.medium_used = true;
                        role_dynamic_data.setGameAbilityUsed('medium', true);
                        role_dynamic_data.setRoom('medium', 'eliminated');
                        break;
                    case 'veteran':
                        role_dynamic_data.day_data.veteran_used = true;
                        role_dynamic_data.setGameAbilityUsed('veteran', true);
                        break;
                    case 'framer':
                        if (target_player_number) {
                            role_dynamic_data.day_data.framer_used = true;
                            role_dynamic_data.day_data.framer_framed = { player_number: target_player_number, player_name: null };
                            // find role by player number
                            for (const [rn, rd] of Object.entries(role_dynamic_data.role_database)) {
                                if (rd.player_number === target_player_number) {
                                    role_dynamic_data.day_data.framer_framed.player_name = rd.player;
                                    role_dynamic_data.setVisibleFaction(rn, 'mafia');
                                    break;
                                }
                            }
                        }
                        break;
                    case 'imposter':
                        role_dynamic_data.day_data.imposter_used = true;
                        role_dynamic_data.setVisibleFaction('imposter', 'villager');
                        break;
                    case 'kidnapper':
                        if (target_player_number) {
                            role_dynamic_data.day_data.player_kidnapped = { player_number: target_player_number, player_name: null };
                            for (const [rn, rd] of Object.entries(role_dynamic_data.role_database)) {
                                if (rd.player_number === target_player_number) {
                                    role_dynamic_data.day_data.player_kidnapped.player_name = rd.player;
                                    role_dynamic_data.day_data.player_kidnapped.role = rn;
                                    break;
                                }
                            }
                        }
                        break;
                    // Night roles that choose a target
                    case 'doctor':
                        if (target_player_number) {
                            role_dynamic_data.night_data.doctor_saved = { player_number: target_player_number, player_name: null };
                            for (const [rn, rd] of Object.entries(role_dynamic_data.role_database)) if (rd.player_number === target_player_number) role_dynamic_data.night_data.doctor_saved.player_name = rd.player;
                        }
                        break;
                    case 'sheriff':
                        if (target_player_number) {
                            // store visible faction result
                            const playerRole = Object.entries(role_dynamic_data.role_database).find(([rn, rd]) => rd.player_number === target_player_number);
                            const visibleFaction = playerRole ? role_dynamic_data.role_database[playerRole[0]].visible_faction : null;
                            role_dynamic_data.night_data.sheriff_seen = { player_number: target_player_number, player_name: playerRole ? playerRole[1].player : null, faction: visibleFaction };
                        }
                        break;
                    case 'bodyguard':
                        if (target_player_number) {
                            role_dynamic_data.night_data.bodyguard_guarded = { player_number: target_player_number, player_name: null };
                            for (const [rn, rd] of Object.entries(role_dynamic_data.role_database)) if (rd.player_number === target_player_number) role_dynamic_data.night_data.bodyguard_guarded.player_name = rd.player;
                        }
                        break;
                    case 'deputy':
                        if (target_player_number) {
                            const playerRole = Object.entries(role_dynamic_data.role_database).find(([rn, rd]) => rd.player_number === target_player_number);
                            role_dynamic_data.night_data.deputy_seen = { player_number: target_player_number, player_name: playerRole ? playerRole[1].player : null, faction: playerRole ? role_dynamic_data.role_database[playerRole[0]].visible_faction : null };
                        }
                        break;
                }
                
                // Trigger ability promise resolution with target data
                const targetData = target_player_number ? { target: target_player_number } : null;
                ability_handler.triggerAbility(socket.id, targetData);
            } catch (err) {
                console.error('use-ability handler error:', err);
            }
        });

        // Handle chat messages from clients (with permission rules)
        socket.on('chat-message', (data) => {
            try {
                const { window, message } = data || {};
                const rolesByPlayer = role_dynamic_data.getRolesByPlayer();
                let playerName = null;
                let roleName = null;
                
                for (const [pName, roleInfo] of Object.entries(rolesByPlayer)) {
                    if (roleInfo.socketId === socket.id) {
                        playerName = pName;
                        roleName = roleInfo.role;
                        break;
                    }
                }

                if (!playerName || !message) return;

                const roleData = role_dynamic_data.getRole(roleName);
                const isAlive = roleData?.alive;
                const isMafia = roleData?.faction === 'mafia';

                // Determine who can receive this message based on window and player status
                let recipientSockets = [];

                if (window === 'main') {
                    // Main chat: available to all during day, disabled during night
                    // For now, broadcast to all (server will enforce phase restrictions)
                    const allRoles = role_dynamic_data.getRolesByPlayer();
                    recipientSockets = Object.values(allRoles).map(r => r.socketId).filter(Boolean);
                } else if (window === 'second') {
                    // Dead chat or Mafia chat
                    if (!isAlive) {
                        // Dead player: can chat with other dead players and shaman (if shaman used ability)
                        const allRoles = role_dynamic_data.getRolesByPlayer();
                        recipientSockets = Object.entries(allRoles)
                            .filter(([rn, r]) => {
                                const rd = role_dynamic_data.getRole(rn);
                                return !rd.alive || (rn === 'medium' && role_dynamic_data.day_data.medium_used);
                            })
                            .map(([_, r]) => r.socketId)
                            .filter(Boolean);
                    } else if (isMafia) {
                        // Mafia chat (only living mafia)
                        const allRoles = role_dynamic_data.getRolesByPlayer();
                        recipientSockets = Object.entries(allRoles)
                            .filter(([rn, r]) => {
                                const rd = role_dynamic_data.getRole(rn);
                                return rd.alive && rd.faction === 'mafia';
                            })
                            .map(([_, r]) => r.socketId)
                            .filter(Boolean);
                    }
                }

                // Broadcast message to allowed recipients
                recipientSockets.forEach(recipSocket => {
                    io.to(recipSocket).emit('chat-message-receive', { window, sender: playerName, text: message });
                });
            } catch (err) {
                console.error('chat-message handler error:', err);
            }
        });

        // Handle player movement/position updates
        socket.on('player-move', (data) => {
            try {
                const { x, y } = data || {};
                if (typeof x === 'number' && typeof y === 'number') {
                    // Store position and broadcast to all other players
                    io.emit('player-position', { socketId: socket.id, x, y });
                }
            } catch (err) {
                console.error('player-move handler error:', err);
            }
        });

        // Forward phase-related client events to phases module
        socket.on('player-skip-phase', (data) => {
            phases.handlePlayerSkip(data);
        });

        socket.on('phase-complete', (data) => {
            phases.handlePhaseComplete(data);
        });

        socket.on('player-action', (data) => {
            phases.handlePlayerAction(data);
        });
    });
    
    
    httpServer.listen(5001, () => {
        console.log('Server running on http://localhost:5001');
    });
}

function serveFile(res, filename, contentType) {
    try {
        const data = fs.readFileSync(filename);
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml'
        };
        const ct = contentType || types[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(data);
    } catch (err) {
        res.writeHead(404);
        res.end('File not found');
    }
}

createServer();
