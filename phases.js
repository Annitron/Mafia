// import role_dynamic_data from './role_dynamic_data.js';
// import win_condition from './win_condition.js';
// import voting from './voting.js';
const win_condition = require('./win_condition');
const role_dynamic_data = require('./role_dynamic_data');
const voting = require('./voting');
const ability_handler = require('./ability_handler');

let day_count = 1;

// Socket.IO integration for phase UI
let io = null;
let getConnectedPlayers = null;
let currentPhase = null;
let playersReadyToSkip = new Set();
let _resolvePhase = null;

function getParticipantList() {
    const list = [];
    for (const [roleName, roleData] of Object.entries(role_dynamic_data.role_database)) {
        if (roleData.player) {
            list.push({
                name: roleData.player,
                socketId: roleData.socketId,
                active: roleData.active,
                alive: roleData.alive
            });
        }
    }
    return list;
}

// Execute role abilities for a given phase ('day' or 'night')
async function executePhaseAbilities(phaseType) {
    const allRoles = role_dynamic_data.getRolesByPlayer();
    const abilityPromises = [];
    
    for (const [playerName, roleInfo] of Object.entries(allRoles)) {
        const roleName = roleInfo.role;
        const socketId = roleInfo.socketId;
        const roleData = role_dynamic_data.getRole(roleName);
        
        if (!roleData || !roleData.alive || !roleData.active || !socketId) continue;
        
        // Determine if this role has an action for this phase
        const hasAction = phaseType === 'day' ? roleData.action_day : roleData.action_night;
        if (!hasAction) continue;
        
        // Get the action function (day_action or night_action)
        const actionFunction = role_dynamic_data.getActionFunction(roleName, phaseType);
        if (!actionFunction) continue;
        // const actionFunction = phaseType === 'day' ? roleData.day_action : roleData.night_action;
        // if (!actionFunction) continue;
        
        console.log(`[ABILITY] ${playerName} (${roleName}) starting ${phaseType} action`);
        
        // Create a promise for this ability execution
        const abilityPromise = (async () => {
            try {
                // Call the action function with socketId - it's a Promise that will resolve when ability is triggered
                await actionFunction(socketId);
                console.log(`[ABILITY] ${playerName} (${roleName}) completed ${phaseType} action`);
            } catch (err) {
                console.error(`[ABILITY] Error executing ${roleName} action for ${playerName}:`, err.message);
            }
        })();
        
        abilityPromises.push(abilityPromise);
    }
    
    // Wait for all abilities to complete or timeout
    await Promise.all(abilityPromises);
}

function initialiseSocketIO(socketIO, getConnectedPlayersCallback) {
    io = socketIO;
    getConnectedPlayers = getConnectedPlayersCallback;
    ability_handler.initializeAbilityHandler(socketIO);
}

async function start_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: start`);
    // Calling the getRolesByPlayer function in role_dynamic_database to get the full database
    // from this, form a list of players and their roles to show the player
    let allRoles = role_dynamic_data.getRolesByPlayer();

    // Emit phase start to all players with their role data
    const duration = 15;
    const endTimestamp = Date.now() + duration * 1000;
    const participantList = getParticipantList();
    for (const player in allRoles) {
        const roleName = allRoles[player].role;
        const roleData = role_dynamic_data.getRole(roleName) || {};
        io.to(allRoles[player].socketId).emit('phase-start', {
            phase: 'start',
            roleData: roleData,
            dayData: role_dynamic_data.day_data,
            nightData: role_dynamic_data.night_data,
            totalPlayers: Object.keys(allRoles).length,
            duration,
            endTimestamp,
            participantList
        });
    }

    // wait for phase completion (15 seconds)
    await waitForPhase('start', duration);
}

async function morning_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: morning`);
    // remove previous role ability trackers:     
    role_dynamic_data.reset_day_data();
    // Emit morning phase start to all players
    const allRoles = role_dynamic_data.getRolesByPlayer();
    const players = Object.keys(allRoles);
    const duration = 240;
    const endTimestamp = Date.now() + duration * 1000;
    const participantList = getParticipantList();
    for (const playerName of players) {
        const roleName = allRoles[playerName].role;
        const socketId = allRoles[playerName].socketId;
        const roleData = role_dynamic_data.getRole(roleName) || {};
        io.to(socketId).emit('phase-start', {
            phase: 'morning',
            dayCount: day_count,
            roleData: roleData,
            dayData: role_dynamic_data.day_data,
            nightData: role_dynamic_data.night_data,
            totalPlayers: players.length,
            duration,
            endTimestamp,
            participantList
        });
    }

    // Execute day abilities during morning
    await executePhaseAbilities('day');

    await waitForPhase('morning', duration);
}

async function afternoon_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: afternoon`);
    // reset votes
    voting.reset_votes();
    // Emit afternoon phase start to all players
    const allRoles = role_dynamic_data.getRolesByPlayer();
    const players = Object.keys(allRoles);
    const duration = 30;
    const endTimestamp = Date.now() + duration * 1000;
    const participantList = getParticipantList();
    
    for (const playerName of players) {
        const roleName = allRoles[playerName].role;
        const socketId = allRoles[playerName].socketId;
        const roleData = role_dynamic_data.getRole(roleName) || {};
        io.to(socketId).emit('phase-start', {
            phase: 'afternoon',
            dayCount: day_count,
            roleData: roleData,
            dayData: role_dynamic_data.day_data,
            nightData: role_dynamic_data.night_data,
            totalPlayers: players.length,
            duration,
            endTimestamp,
            participantList
        });
    }

    // Execute day abilities during afternoon
    await executePhaseAbilities('day');

    await waitForPhase('afternoon', duration);
}

async function evening_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: evening`);
    // print to console log who has been voted out
    // update dynamic role status for this player to false
    const votedOutPlayer = voting.afternoon_voting_results();
    if (votedOutPlayer) {
        console.log("Evening phase: " + votedOutPlayer.player_name + " has been voted out");
        role_dynamic_data.updatePlayerToEliminated(votedOutPlayer.player_number);
        role_dynamic_data.day_data.voted_today = votedOutPlayer;
    }

    // Emit evening phase start to all players (duration emission below)
    const duration = 30;
    const endTimestamp = Date.now() + duration * 1000;
    const participantList = getParticipantList();
    const allRoles = role_dynamic_data.getRolesByPlayer();
    const players = Object.keys(allRoles);
    for (const playerName of players) {
        const roleName = allRoles[playerName].role;
        const socketId = allRoles[playerName].socketId;
        const roleData = role_dynamic_data.getRole(roleName) || {};
        io.to(socketId).emit('phase-start', {
            phase: 'evening',
            eliminatedPlayer: votedOutPlayer?.player_name,
            roleData: roleData,
            dayData: role_dynamic_data.day_data,
            nightData: role_dynamic_data.night_data,
            totalPlayers: players.length,
            duration,
            endTimestamp,
            participantList
        });
    }

    await waitForPhase('evening', duration);
}

async function night_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: night`);
    // reset votes
    voting.reset_votes();

    // remove previous role ability uses:     
    role_dynamic_data.reset_night_data();

    // Emit night phase start to all players (duration emission below)
    const duration = 60;
    const endTimestamp = Date.now() + duration * 1000;
    const participantList = getParticipantList();
    const allRoles = role_dynamic_data.getRolesByPlayer();
    const players = Object.keys(allRoles);
    for (const playerName of players) {
        const roleName = allRoles[playerName].role;
        const socketId = allRoles[playerName].socketId;
        const roleData = role_dynamic_data.getRole(roleName) || {};
        io.to(socketId).emit('phase-start', {
            phase: 'night',
            dayCount: day_count,
            roleData: roleData,
            dayData: role_dynamic_data.day_data,
            nightData: role_dynamic_data.night_data,
            totalPlayers: players.length,
            duration,
            endTimestamp,
            participantList
        });
    }

    // Execute night abilities for players with night actions
    await executePhaseAbilities('night');

    await waitForPhase('night', duration);
}

async function dawn_phase() {
    console.log(`[PHASE START] Day: ${day_count}, Phase: dawn`);
  
    // dawn phase is instantaneous and user won't know it exists
    // it is here to process night time mafia eliminations before morning phase starts
    
    // find who was voted out at night  
    const night_voted_out = voting.night_voting_results();
    
    // skip all logic if no one was voted out at night
    if (!night_voted_out) {
        return;
    }

    // check if the bodyguard_guarded is the same as the voted out player; if so update the bodyguard alive status to false and exit this function
    else if (night_voted_out?.player_number === role_dynamic_data.night_data.bodyguard_guarded?.player_number) {
        role_dynamic_data.updatePlayerToEliminated(role_dynamic_data.night_data.bodyguard_guarded.player_number);
        return;
    }

    // check if the doctor_saved is the same as the voted out player; if so exit this function
    else if (night_voted_out?.player_number === role_dynamic_data.night_data.doctor_saved?.player_number) {
        return;
    }

    // check if veteran_used in day_data is true and veteran is the target of the mafia vote
    // if so then update one of the mafia players that voted for the veteran's alive status to false
    else if (role_dynamic_data.day_data.veteran_used && night_voted_out?.player_number === role_dynamic_data.night_data.veteran.player_number) {
        // find the player that voted for the veteran by accessing the votes voters array in voting.js
        const veteran_voters = voting.votes?.[night_voted_out.player_number]?.voters || [];
        // find a mafia player that is in the voters list
        let random_mafia_player_number = null;
        for (const [roleName, roleData] of Object.entries(role_dynamic_data.role_database)) {
            if (roleData.faction === 'mafia' && veteran_voters.includes(roleData.player_number)) {
                random_mafia_player_number = roleData.player_number;
                break;
            }
        }
        if (random_mafia_player_number) {
            role_dynamic_data.updatePlayerToEliminated(random_mafia_player_number);
        }
        return;
    }

    else {  
        // if function reaches here, then update voted player alive status to false
        role_dynamic_data.updatePlayerToEliminated(night_voted_out.player_number);
        return;
    }
    
}

function waitForPhase(phaseName, durationSeconds) {
    return new Promise((resolve) => {
        currentPhase = phaseName;
        playersReadyToSkip.clear();
        _resolvePhase = resolve;

        // main timer
        const mainTimer = setTimeout(() => {
            currentPhase = null;
            _resolvePhase = null;
            // notify clients that phase ended
            if (io) io.emit('phase-end', { phase: phaseName });
            playersReadyToSkip.clear();
            resolve();
        }, durationSeconds * 1000);

        // expose a function to trigger reduced 5 second timer
        function triggerReducedTimer() {
            clearTimeout(mainTimer);
            const newEnd = Date.now() + 5000;
            // notify clients that the phase timer has been reduced
            if (io) io.emit('phase-reduced', { phase: phaseName, endTimestamp: newEnd });
            setTimeout(() => {
                currentPhase = null;
                _resolvePhase = null;
                if (io) io.emit('phase-end', { phase: phaseName });
                playersReadyToSkip.clear();
                resolve();
            }, 5000);
        }

        // store trigger so handlers can call it
        waitForPhase._triggerReducedTimer = triggerReducedTimer;
    });
}

// Handlers to be called by server-side socket listeners
function handlePlayerSkip(data) {
    const { player, phase } = data;
    if (!phase || phase !== currentPhase) return;
    playersReadyToSkip.add(player);

    // find player name from socketId and log it
    const assignedRoles = role_dynamic_data.getRolesByPlayer();
    let playerName = 'Unknown';
    for (const [name, roleInfo] of Object.entries(assignedRoles)) {
        if (roleInfo.socketId === player) {
            playerName = name;
            break;
        }
    }
    console.log(`${playerName} has skipped`);

    // notify clients of skip progress
    const participantSocketIds = Object.values(assignedRoles).map(r => r.socketId).filter(Boolean);
    io.emit('phase-skip-update', { playersReady: Array.from(playersReadyToSkip) });

    if (playersReadyToSkip.size >= participantSocketIds.length && waitForPhase._triggerReducedTimer) {
        waitForPhase._triggerReducedTimer();
    }
}

function handlePhaseComplete(data) {
    // allow clients to mark phase complete manually (treat as unanimous skip)
    if (waitForPhase._triggerReducedTimer) {
        waitForPhase._triggerReducedTimer();
    }
}

function handlePlayerAction(data) {
    // placeholder for future role-specific actions
}

async function phase_progresser() {
    // define win condition variable
    let win_condition_result = null;

    // start phase
    await start_phase();

    // do first night phase separate from the loop
    await night_phase();
    day_count++;

    // loop until a win condition is reached
    while (true) {
        day_count++;
        await dawn_phase();
        await morning_phase();
        await afternoon_phase();
        // only do evening phase if someone was voted in the afternoon
        if (voting.afternoon_voting_results() !== null) {
            await evening_phase();
        }
        // TEMPORARILY DISABLED: Win condition check for continuous looping
        // win_condition_result = win_condition.check_win_condition();
        // if (win_condition_result.break_game) {
        //     return win_condition_result.winner;
        // }
        await night_phase();
        // TEMPORARILY DISABLED: Win condition check for continuous looping
        // win_condition_result = win_condition.check_win_condition();
        // if (win_condition_result.break_game) {
        //     return win_condition_result.winner;
        // }
    }
}

module.exports = {
    phase_progresser,
    initialiseSocketIO,
    handlePlayerSkip,
    handlePhaseComplete,
    handlePlayerAction
};

