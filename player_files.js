

const text_input = require('./text_input');
const role_dynamic_data = require('./role_dynamic_data');
const phases = require('./phases');

async function add_players() {
    let playerCount = 0;
    let players = [];
    let gameStarted = false;
    console.log("Press P to add a player (need 4-12 players), M to start game");
    
    return new Promise((resolve) => {
        const handleInput = async (key) => {
            if (gameStarted) return;
            
            // Trim the input to remove newline characters
            const trimmedKey = key.toString().trim().toLowerCase();
            
            if (trimmedKey === 'p') {
                if (playerCount >= 12) {
                    console.log('Maximum 12 players reached! Starting game...');
                    gameStarted = true;
                    process.stdin.removeListener('data', handleInput);
                    resolve(players);
                    return;
                }
                
                const playerName = await text_input.getInput(`Enter player ${playerCount + 1} name: `);
                
                if (playerName.trim()) {
                    players.push(playerName.trim());
                    playerCount = players.length;
                    console.log(`Added: ${playerName.trim()} (Total players: ${playerCount})`);
                    
                    // Check if we've reached 12 players
                    if (playerCount >= 12) {
                        console.log('Maximum 12 players reached! Starting game...');
                        gameStarted = true;
                        process.stdin.removeListener('data', handleInput);
                        resolve(players);
                        return;
                    }
                } else {
                    console.log('No player added.');
                }
                
                console.log("Press P to add another player, M to start game");
            } else if (trimmedKey === 'm') {
                if (playerCount < 4) {
                    console.log('Need at least 4 players to start!');
                    return;
                }
                
                console.log('Starting game...');
                gameStarted = true;
                process.stdin.removeListener('data', handleInput);
                resolve(players);
            }
        };
        
        // Set up the listener to keep listening
        process.stdin.on('data', handleInput);
        process.stdin.resume(); // Make sure stdin is active
        process.stdin.setEncoding('utf8'); // Ensure proper encoding
    });
}

function continue_game_setup(players, io, connectedPlayers) {
    console.log(`Starting game with ${players.length} players: ${players.join(', ')}`);

    // populate the role_dynamic_data file with players
    const assigned_roles = role_dynamic_data.assignRoleToPlayer(players);
    
    // Create detailed role assignment log
    console.log(`Role Assignments`);
    
    for (const [playerName, roleName] of Object.entries(assigned_roles)) {
        const roleInfo = role_dynamic_data.getRole(roleName);
        console.log(`Player ${roleInfo.player_number}: ${playerName} -> ${roleName} (${roleInfo.faction})`);
    }

    // populate the connected players data in role_dynamic_data for all players
    // they need to be referenced by their role, not their player name in this function
    for (const player of players) {
        role_dynamic_data.setConnectedPlayersData(assigned_roles[player], connectedPlayers.find(p => p.name === player)?.socketId, connectedPlayers.find(p => p.name === player)?.isHost, connectedPlayers.find(p => p.name === player)?.isReady);
    }
    
    // Return assigned roles to caller (server will start phases)
    return assigned_roles;
}

module.exports = {
    add_players,
    continue_game_setup
};
