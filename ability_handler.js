// Helper for coordinating role abilities with Socket.IO
// Allows role functions to wait for client input (E keypress) via socket events

let io = null;
let abilityPromises = {}; // Map of socketId -> { resolve, reject, timeout }
let abilityTargets = {}; // Map of socketId -> target data (player number, etc.)

function initializeAbilityHandler(socketIO) {
    io = socketIO;
}

// Called from server.js when client triggers ability - stores target and resolves wait
function triggerAbility(socketId, targetData = null) {
    if (targetData) {
        abilityTargets[socketId] = targetData;
    }
    
    if (abilityPromises[socketId]) {
        clearTimeout(abilityPromises[socketId].timeout);
        abilityPromises[socketId].resolve(targetData);
        delete abilityPromises[socketId];
    }
}

// Returns a Promise that resolves with the target when client triggers ability
// This replaces text_input.getInput() for role functions
function waitForAbilityTrigger(socketId, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete abilityPromises[socketId];
            delete abilityTargets[socketId];
            reject(new Error('Ability trigger timeout'));
        }, timeoutMs);

        abilityPromises[socketId] = { resolve, reject, timeout };
    });
}

// Get stored target data for a player
function getAbilityTarget(socketId) {
    return abilityTargets[socketId];
}

// Clear stored targets
function clearAbilityTarget(socketId) {
    delete abilityTargets[socketId];
}

module.exports = {
    initializeAbilityHandler,
    triggerAbility,
    waitForAbilityTrigger,
    getAbilityTarget,
    clearAbilityTarget
};
