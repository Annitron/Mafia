const text_input = require('./text_input');
const role_dynamic_data = require('./role_dynamic_data');
const ability_handler = require('./ability_handler');

function generic_night_mafia(socketId) {
    // Generic mafia night action - no special ability, just wait and resolve
    return new Promise(async (resolve) => {
        try {
            // Mafia members don't have individual night actions, they just vote
            await ability_handler.waitForAbilityTrigger(socketId, 60000);
        } catch (err) {
            // Timeout is acceptable - they don't need to do anything
        }
        resolve();
    });
}

function day_framer(socketId) {
    // Framer can frame a player to make them appear as mafia
    
    return new Promise(async (resolve) => {
        try {
            console.log('[FRAMER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[FRAMER] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[FRAMER] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            console.log(`[FRAMER] Framed Player ${targetNumber} (${playerInfo.player}) as mafia`);
            
            // Set framed player's visible faction to mafia
            role_dynamic_data.setVisibleFaction(playerInfo.role, 'mafia');
            
            role_dynamic_data.day_data.framer_used = true;
            role_dynamic_data.day_data.framer_framed = {
                player_number: targetNumber,
                player_name: playerInfo.player
            };
            
            // Set framer room to bedroom for next night phase
            role_dynamic_data.setRoom('framer', 'bedroom');
            
            resolve();
        } catch (err) {
            console.error('[FRAMER] Error:', err.message);
            resolve();
        }
    });
}

function day_godfather(socketId) {
    // Godfather can reveal themselves to the town
    
    const godfatherData = role_dynamic_data.getRole('godfather');
    
    // if godfather has already used ability once, then reveal themselves to the town
    if (godfatherData && godfatherData.game_ability_used) {
        console.log('[GODFATHER] Godfather revealed themselves.');
        role_dynamic_data.setRoleRevealed('godfather', true);
        return Promise.resolve();
    }
    
    return new Promise(async (resolve) => {
        try {
            console.log('[GODFATHER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[GODFATHER] Ability not triggered');
                resolve();
                return;
            }
            
            console.log(`[GODFATHER] The Godfather (${godfatherData.player}) reveals themselves to the town!`);
            role_dynamic_data.day_data.godfather_used = true;
            role_dynamic_data.setGameAbilityUsed('godfather', true);
            
            resolve();
        } catch (err) {
            console.error('[GODFATHER] Error:', err.message);
            resolve();
        }
    });
}

function day_imposter(socketId) {
    // Imposter can disguise as a villager
    
    const imposterData = role_dynamic_data.getRole('imposter');
    
    return new Promise(async (resolve) => {
        try {
            console.log('[IMPOSTER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData) {
                console.log('[IMPOSTER] Ability not triggered');
                resolve();
                return;
            }
            
            console.log(`[IMPOSTER] The Imposter (${imposterData.player}) disguises as villager!`);
            
            role_dynamic_data.day_data.imposter_used = true;
            role_dynamic_data.setVisibleFaction('imposter', 'villager');
            role_dynamic_data.setRoom('imposter', 'bedroom');
            
            resolve();
        } catch (err) {
            console.error('[IMPOSTER] Error:', err.message);
            resolve();
        }
    });
}

function day_kidnapper(socketId) {
    // Kidnapper can kidnap a player
    
    return new Promise(async (resolve) => {
        try {
            console.log('[KIDNAPPER] Waiting for ability trigger');
            const targetData = await ability_handler.waitForAbilityTrigger(socketId, 60000);
            
            if (!targetData || !targetData.target) {
                console.log('[KIDNAPPER] No target provided');
                resolve();
                return;
            }
            
            const targetNumber = targetData.target;
            const playerInfo = role_dynamic_data.findPlayerByNumber(targetNumber);
            
            if (!playerInfo) {
                console.log(`[KIDNAPPER] Player ${targetNumber} not found or not alive`);
                resolve();
                return;
            }
            
            console.log(`[KIDNAPPER] Kidnapped Player ${targetNumber} (${playerInfo.player})`);
            
            role_dynamic_data.day_data.player_kidnapped = {
                player_number: targetNumber,
                player_name: playerInfo.player,
                role: playerInfo.role
            };
            
            resolve();
        } catch (err) {
            console.error('[KIDNAPPER] Error:', err.message);
            resolve();
        }
    });
}

module.exports = {
    generic_night_mafia,
    day_framer,
    day_godfather,
    day_imposter,
    day_kidnapper
};