const text_input = require('./text_input');
const role_dynamic_data = require('./role_dynamic_data');
const ability_handler = require('./ability_handler');

function no_action(socketId) {
    // Roles with no action still return a resolved promise
    return Promise.resolve();
}

function night_sheriff(socketId) {
    // Sheriff can choose a player to investigate their role type
    // Server-side Socket.IO version
    
    return new Promise(async (resolve) => {
        try {
            console.log('[SHERIFF] Waiting for ability trigger');
            // Wait for client to trigger ability with target
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[SHERIFF] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            // Find the player by number using helper function
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[SHERIFF] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            // Get the visible faction from role_dynamic_data
            const targetRoleData = role_dynamic_data.getRole(playerInfo.role);
            const visibleFaction = targetRoleData.visible_faction;
            
            console.log(`[SHERIFF] Investigated Player ${targetNumber} (${playerInfo.player}) - Faction: ${visibleFaction}`);
            
            // Populate sheriff_seen in night_data
            role_dynamic_data.night_data.sheriff_seen = {
                player_number: targetNumber,
                player_name: playerInfo.player,
                faction: visibleFaction
            };
            
            resolve();
        } catch (err) {
            console.error('[SHERIFF] Error:', err.message);
            resolve(); // Don't block phase on error
        }
    });
}

function night_doctor(socketId) {
    // Doctor can choose a player to protect from mafia elimination
    
    return new Promise(async (resolve) => {
        try {
            console.log('[DOCTOR] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[DOCTOR] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[DOCTOR] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            console.log(`[DOCTOR] Protected Player ${targetNumber} (${playerInfo.player})`);
            
            // Populate doctor_saved in night_data
            role_dynamic_data.night_data.doctor_saved = {
                player_number: targetNumber,
                player_name: playerInfo.player
            };
            
            resolve();
        } catch (err) {
            console.error('[DOCTOR] Error:', err.message);
            resolve();
        }
    });
}

function night_bodyguard(socketId) {
    // Bodyguard can choose a player to guard from attacks
    
    return new Promise(async (resolve) => {
        try {
            console.log('[BODYGUARD] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[BODYGUARD] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[BODYGUARD] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            console.log(`[BODYGUARD] Guarded Player ${targetNumber} (${playerInfo.player})`);
            
            // Populate bodyguard_guarded in night_data
            role_dynamic_data.night_data.bodyguard_guarded = {
                player_number: targetNumber,
                player_name: playerInfo.player
            };
            
            resolve();
        } catch (err) {
            console.error('[BODYGUARD] Error:', err.message);
            resolve();
        }
    });
}

function night_deputy(socketId) {
    // Deputy can investigate players, but only if sheriff is dead
    
    return new Promise(async (resolve) => {
        try {
            // Check if deputy's game ability has been used
            const deputyData = role_dynamic_data.getRole('deputy');
            if (deputyData && deputyData.game_ability_used) {
                // Game ability already used, proceed with investigation
                console.log('[DEPUTY] Investigation unlocked (sheriff is dead)');
            } else {
                // Game ability not used yet, check if sheriff is dead
                const sheriffData = role_dynamic_data.getRole('sheriff');
                if (sheriffData && sheriffData.alive) {
                    console.log('[DEPUTY] Sheriff is still alive. Cannot investigate.');
                    resolve();
                    return;
                } else {
                    // Sheriff is dead, set game ability to true
                    role_dynamic_data.setGameAbilityUsed('deputy', true);
                    role_dynamic_data.setRoom('deputy', 'office');
                    console.log('[DEPUTY] Sheriff is dead. Investigation unlocked.');
                }
            }
            
            console.log('[DEPUTY] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[DEPUTY] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[DEPUTY] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            const targetRoleData = role_dynamic_data.getRole(playerInfo.role);
            const visibleFaction = targetRoleData.visible_faction;
            
            console.log(`[DEPUTY] Investigated Player ${targetNumber} (${playerInfo.player}) - Faction: ${visibleFaction}`);
            
            // Populate deputy_seen in night_data
            role_dynamic_data.night_data.deputy_seen = {
                player_number: targetNumber,
                player_name: playerInfo.player,
                faction: visibleFaction
            };
            
            resolve();
        } catch (err) {
            console.error('[DEPUTY] Error:', err.message);
            resolve();
        }
    });
}

function night_undertaker(socketId) {
    // Undertaker learns the role of the player who was eliminated during the previous day
    const votedOutPlayer = role_dynamic_data.day_data.voted_today;

    // if no player was voted out, return early
    if (!votedOutPlayer) {
        console.log('[UNDERTAKER] No player was voted out today.');
        return Promise.resolve();
    }

    return new Promise(async (resolve) => {
        try {
            console.log('[UNDERTAKER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[UNDERTAKER] Ability not triggered');
                resolve();
                return;
            }
            
            // Get the role of the voted out player
            const playerInfo = role_dynamic_data.findPlayerByNumber(votedOutPlayer.player_number);
            if (!playerInfo) {
                resolve();
                return;
            }
            
            const targetRoleData = role_dynamic_data.getRole(playerInfo.role);
            const playerRole = targetRoleData.name;
            console.log(`[UNDERTAKER] Learned that Player ${votedOutPlayer.player_number} (${votedOutPlayer.player_name}) was a ${playerRole}.`);

            // Populate undertaker_Seen in night_data
            role_dynamic_data.night_data.undertaker_Seen = {
                player_number: votedOutPlayer.player_number,
                player_name: votedOutPlayer.player_name,
                role: playerRole
            };
            
            resolve();
        } catch (err) {
            console.error('[UNDERTAKER] Error:', err.message);
            resolve();
        }
    });
}


function day_gaoler(socketId) {
    // Gaoler can jail a player during the day
    
    return new Promise(async (resolve) => {
        try {
            console.log('[GAOLER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[GAOLER] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[GAOLER] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            console.log(`[GAOLER] Jailed Player ${targetNumber} (${playerInfo.player})`);
            
            // Populate player_gaoled in day_data
            role_dynamic_data.day_data.player_gaoled = {
                player_number: targetNumber,
                player_name: playerInfo.player
            };
            
            resolve();
        } catch (err) {
            console.error('[GAOLER] Error:', err.message);
            resolve();
        }
    });
}

function day_mayor(socketId) {
    // Mayor can reveal themselves to the town
    
    const mayorData = role_dynamic_data.getRole('mayor');
    
    // if mayor has already revealed, return early
    if (mayorData && mayorData.game_ability_used) {
        console.log('[MAYOR] Mayor has already revealed themselves.');
        return Promise.resolve();
    }
    
    return new Promise(async (resolve) => {
        try {
            console.log('[MAYOR] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[MAYOR] Ability not triggered');
                resolve();
                return;
            }
            
            console.log(`[MAYOR] The Mayor (${mayorData.player}) reveals themselves to the town!`);
            role_dynamic_data.day_data.mayor_reveal = true;
            role_dynamic_data.setGameAbilityUsed('mayor', true);
            role_dynamic_data.setRoleRevealed('mayor', true);
            
            resolve();
        } catch (err) {
            console.error('[MAYOR] Error:', err.message);
            resolve();
        }
    });
}

function day_medium(socketId) {
    // Medium can reveal themselves to communicate with the dead
    
    const mediumData = role_dynamic_data.getRole('medium');
    
    // if medium has already used their ability, return early
    if (mediumData && mediumData.game_ability_used) {
        console.log('[MEDIUM] Medium has already used their ability.');
        return Promise.resolve();
    }
    
    return new Promise(async (resolve) => {
        try {
            console.log('[MEDIUM] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[MEDIUM] Ability not triggered');
                resolve();
                return;
            }
            
            console.log(`[MEDIUM] The Medium (${mediumData.player}) will use ceremony tonight!`);
            role_dynamic_data.day_data.medium_used = true;
            role_dynamic_data.setGameAbilityUsed('medium', true);
            role_dynamic_data.setRoom('medium', 'eliminated');
            
            resolve();
        } catch (err) {
            console.error('[MEDIUM] Error:', err.message);
            resolve();
        }
    });
}

function day_veteran(socketId) {
    // Veteran can go on alert to kill attackers
    
    const veteranData = role_dynamic_data.getRole('veteran');
    
    // if veteran has already used their ability, return early
    if (veteranData && veteranData.game_ability_used) {
        console.log('[VETERAN] Veteran has already used their ability.');
        return Promise.resolve();
    }
    
    return new Promise(async (resolve) => {
        try {
            console.log('[VETERAN] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[VETERAN] Ability not triggered');
                resolve();
                return;
            }
            
            console.log(`[VETERAN] The Veteran (${veteranData.player}) goes on alert!`);
            role_dynamic_data.day_data.veteran_used = true;
            role_dynamic_data.setGameAbilityUsed('veteran', true);
            
            resolve();
        } catch (err) {
            console.error('[VETERAN] Error:', err.message);
            resolve();
        }
    });
}

module.exports = {
    no_action,
    night_sheriff,
    night_doctor,
    night_bodyguard,
    night_deputy,
    night_undertaker,
    day_gaoler,
    day_mayor,
    day_medium,
    day_veteran
};
