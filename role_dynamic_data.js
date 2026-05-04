const role_actions_mafia = require('./role_actions_mafia');
const role_actions_villager = require('./role_actions_villager');

let role_database = {
    sheriff: {
        role: 'sheriff',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        role_revealed: false,
        game_ability_used: true,
        room: "office",
        action_day: false,
        action_night: true,
        mandatory: true,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    doctor: {
        role: 'doctor',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        role_revealed: false,
        game_ability_used: true,
        room: "office",
        action_day: false,
        action_night: true,
        mandatory: true,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    bodyguard: {
        role: 'bodyguard',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        role_revealed: false,
        game_ability_used: true,
        room: "office",
        action_day: false,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    deputy: {
        role: 'deputy',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        role_revealed: false,
        game_ability_used: false,
        room: "bedroom",
        action_day: false,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    gaoler: {
        role: 'gaoler',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        role_revealed: false,
        game_ability_used: true,
        room: "bedroom",
        action_day: true,
        action_night: false,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    mayor: {
        role: 'mayor',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        game_ability_used: false,
        role_revealed: false,
        room: "bedroom",
        action_day: true,
        action_night: false,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    medium: {
        role: 'medium',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        game_ability_used: false,
        role_revealed: false,
        room: "bedroom",
        action_day: true,
        action_night: false,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    undertaker: {
        role: 'undertaker',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        game_ability_used: false,
        role_revealed: false,
        room: "bedroom",
        action_day: false,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    veteran: {
        role: 'veteran',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'villager',
        visible_faction: "villager",
        game_ability_used: false,
        role_revealed: false,
        room: "bedroom",
        action_day: true,
        action_night: false,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    framer: {
        role: 'framer',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'mafia',
        visible_faction: "mafia",
        game_ability_used: true,
        role_revealed: false,
        room: "outside",
        action_day: true,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    godfather: {
        role: 'godfather',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'mafia',
        visible_faction: "mafia",
        game_ability_used: true,
        role_revealed: false,
        room: "outside",
        action_day: true,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    imposter: {
        role: 'imposter',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'mafia',
        visible_faction: "mafia",
        game_ability_used: true,
        role_revealed: false,
        room: "outside",
        action_day: true,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    },
    kidnapper: {
        role: 'kidnapper',
        active: false,
        player_number: null,
        player: null,
        alive: true,
        faction: 'mafia',
        visible_faction: "mafia",
        game_ability_used: true,
        role_revealed: false,
        room: "outside",
        action_day: true,
        action_night: true,
        mandatory: false,
        socketId: null,
        isHost: false, 
        isReady: false
    }
};

let role_action_functions = {
    sheriff: {
        day: role_actions_villager.no_action,
        night: role_actions_villager.night_sheriff
    }, 
    doctor: {
        day: role_actions_villager.no_action,
        night: role_actions_villager.night_doctor
    },
    bodyguard: {
        day: role_actions_villager.no_action,
        night: role_actions_villager.night_bodyguard
    },
    deputy: {
        day: role_actions_villager.no_action,
        night: role_actions_villager.night_deputy
    },
    gaoler: {
        day: role_actions_villager.day_gaoler,
        night: role_actions_villager.no_action
    },
    mayor: {
        day: role_actions_villager.day_mayor,
        night: role_actions_villager.no_action
    },
    medium: {
        day: role_actions_villager.day_medium,
        night: role_actions_villager.no_action
    }, 
    undertaker: {
        day: role_actions_villager.no_action,
        night: role_actions_villager.night_undertaker
    },
    veteran: {
        day: role_actions_villager.day_veteran,
        night: role_actions_villager.no_action
    },
    framer: {
        day: role_actions_mafia.day_framer,
        night: role_actions_mafia.generic_night_mafia
    },
    godfather: {
        day: role_actions_mafia.day_godfather,
        night: role_actions_mafia.generic_night_mafia
    },
    imposter: {
        day: role_actions_mafia.day_imposter,
        night: role_actions_mafia.generic_night_mafia
    },
    kidnapper: {
        day: role_actions_mafia.day_kidnapper,
        night: role_actions_mafia.generic_night_mafia
    }
};

const game_makeup = {
    4: {
        mafia: 1,
        villager: 3
    },
    5: {
        mafia: 1,
        villager: 4
    },
    6: {
        mafia: 1,
        villager: 5
    },
    7: {
        mafia: 2,
        villager: 5
    },
    8: {
        mafia: 2,
        villager: 6
    },
    9: {
        mafia: 2,
        villager: 7
    },
    10: {
        mafia: 3,
        villager: 7
    },
    11: {
        mafia: 3,
        villager: 8
    },
    12: {
        mafia: 3,
        villager: 9
    }
}

let day_data = {
    mayor_reveal: false, // if set to true, mayor will reveal their role and this will remain true for the rest of the game
    medium_used: false, // if set to true, medium will use ceremony this coming night
    veteran_used: false, // if set to true, veteran will be on alert this coming night
    player_gaoled: null,
    player_kidnapped: null,
    framer_used: false,
    godfather_used: false,
    framer_framed: null,
    imposter_used: false, 
    voted_today: null
};

let night_data = {
    sheriff_seen: null,
    doctor_saved: null,
    bodyguard_guarded: null,
    deputy_seen: null,
    mafia_target: null,
    undertaker_Seen: null

};

function reset_day_data() {
    // keep mayor reveal status
    const mayorData = getRole('mayor');
    const mayorReveal = mayorData ? mayorData.role_revealed : false;

    // keep godfather reveal status
    const godfatherData = getRole('godfather');
    const godfatherReveal = godfatherData ? godfatherData.role_revealed : false;

    // reset previous framer target
    if (day_data.framer_used) {
        setVisibleFaction(day_data.framer_framed, 'villager');
    }
    // set framer room to outside upon reset    
    if (day_data.framer_used) {
        setRoom('framer', 'outside');
    }
    // reset imposter
    if (day_data.imposter_used) {
        setVisibleFaction('imposter', 'mafia');
    }
    // set framer room to outside upon reset
    if (day_data.imposter_used) {
        setRoom('imposter', 'outside');
    }
    // if medium used, update medium room to bedroom upon reset
    if (day_data.medium_used) {
        setRoom('medium', 'bedroom');
    }
        
    day_data = {
        mayor_reveal: mayorReveal,
        godfather_reveal: godfatherReveal,
        medium_used: false, 
        veteran_used: false,
        player_gaoled: null,
        player_kidnapped: null,
        framer_used: false,
        framer_framed: null,
        godfather_used: false,
        imposter_used: false, 
        voted_today: null
    };
}

function reset_night_data() {
    night_data = {
        sheriff_seen: null,
        doctor_saved: null,
        bodyguard_guarded: null,
        deputy_seen: null,
        mafia_target: null, 
        undertaker_Seen: null
    };
}

// Helper functions for working with the role data
function getRole(roleName) {
    return role_database[roleName];
}

function getActionFunction(roleName, time) {
    if (role_action_functions[roleName] && role_action_functions[roleName][time]) {
        return role_action_functions[roleName][time];
    }
}

function getMandatoryRoles() {
    return Object.values(role_database).filter(role => role.mandatory);
}

function getRolesByFaction(faction) {
    return Object.values(role_database).filter(role => role.faction === faction);
}

function getAllRoleNames() {
    return Object.keys(role_database);
}

function getRolesByPlayer() {
    // Return list of player names with role and socket id
    let rolesByPlayer = {};
    for (const roleName in role_database) {
        const role = role_database[roleName];
        if (role.player) {
            rolesByPlayer[role.player] = {
                role: roleName,
                socketId: role.socketId
            };
        }
    }
    return rolesByPlayer;
}

function setVisibleFaction(roleName, faction) {
    role_database[roleName].visible_faction = faction;
}

function setGameAbilityUsed(roleName, used) {
    role_database[roleName].game_ability_used = used;
}

function setRoleRevealed(roleName, revealed) {
    role_database[roleName].role_revealed = revealed;
}

function setRoom(roleName, room) {
    role_database[roleName].room = room;
}

function setConnectedPlayersData(roleName, socketId, isHost, isReady) {
    role_database[roleName].socketId = socketId;
    role_database[roleName].isHost = isHost;
    role_database[roleName].isReady = isReady;
}

function updatePlayerToEliminated(playerNumber) {
    for (const [roleName, roleData] of Object.entries(role_database)) {
        if (roleData.player_number === playerNumber) {
            roleData.alive = false;
            roleData.room = "eliminated";
            break;
        }
    }
}

function getAlivePlayers() {
    return Object.entries(role_database)
        .filter(([_, data]) => data.alive && data.active)
        .map(([_, data]) => data.player)
        .filter(player => player !== null);
}

function getEliminatedPlayers() {
    return Object.entries(role_database)
        .filter(([_, data]) => !data.alive && data.active)
        .map(([_, data]) => data.player)
        .filter(player => player !== null);
}

function getPlayersByAlignment(alignment) {
    return Object.entries(role_database)
        .filter(([_, data]) => data.alive && data.active && data.visible_faction === alignment)
        .map(([_, data]) => data.player)
        .filter(player => player !== null);
}

// Helper function to find player by number
function findPlayerByNumber(targetNumber) {
    for (const [roleName, roleData] of Object.entries(role_database)) {
        if (roleData.player_number === targetNumber && roleData.alive) {
            return {
                player: roleData.player,
                role: roleName
            };
        }
    }
    return null;
}

function assignRoleToPlayer(players) {
    // Get game makeup for this number of players
    const game_setup = game_makeup[players.length];
    
    // Get mandatory roles
    const mandatory_roles = getMandatoryRoles();
    const mandatory_role_names = mandatory_roles.map(role => role.role);
    console.log(`Mandatory roles found:`, mandatory_roles);
    console.log(`Mandatory role names:`, mandatory_role_names);
    
    // Get all available roles by faction
    const villager_roles = getRolesByFaction('villager').map(role => role.role);
    const mafia_roles = getRolesByFaction('mafia').map(role => role.role);
    
    // Build the list of roles to assign
    const roles_to_assign = [];
    console.log(`Game setup for ${players.length} players:`, game_setup);
    
    // Add mandatory roles first
    for (const mandatory_role of mandatory_role_names) {
        if (mandatory_role === 'sheriff' || mandatory_role === 'doctor' || mandatory_role === 'mafiosi') {
            roles_to_assign.push(mandatory_role);
            console.log(`Added mandatory role: ${mandatory_role}`);
        }
    }
    
    // Add additional villager roles to meet the game makeup
    let villager_count_needed = game_setup.villager - roles_to_assign.filter(r => villager_roles.includes(r)).length;
    const available_villager_roles = villager_roles.filter(r => !roles_to_assign.includes(r));
    console.log(`Villager roles available:`, available_villager_roles);
    console.log(`Villager count needed: ${villager_count_needed}`);

    // shuffle the contents of the available_villager_roles array randomly
    available_villager_roles.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < villager_count_needed && i < available_villager_roles.length; i++) {
        roles_to_assign.push(available_villager_roles[i]);
        console.log(`Added villager role: ${available_villager_roles[i]}`);
    }
    
    // Add additional mafia roles to meet the game makeup
    let mafia_count_needed = game_setup.mafia - roles_to_assign.filter(r => mafia_roles.includes(r)).length;
    const available_mafia_roles = mafia_roles.filter(r => !roles_to_assign.includes(r));
    
    // shuffle the contents of the available_mafia_roles array randomly
    available_mafia_roles.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < mafia_count_needed && i < available_mafia_roles.length; i++) {
        roles_to_assign.push(available_mafia_roles[i]);
    }
    
    // Shuffle players and assign roles
    const shuffled_players = [...players].sort(() => Math.random() - 0.5);
    const assigned_roles = {};
    
    for (let i = 0; i < Math.min(shuffled_players.length, roles_to_assign.length); i++) {
        assigned_roles[shuffled_players[i]] = roles_to_assign[i];
        
        // Update the role_dynamic_data
        if (role_database[roles_to_assign[i]]) {
            role_database[roles_to_assign[i]].active = true;
            role_database[roles_to_assign[i]].player = shuffled_players[i];
            role_database[roles_to_assign[i]].player_number = i + 1;
        }
    }
    
    return assigned_roles;
}

module.exports = {
    role_database,
    role_action_functions,
    day_data,
    night_data,
    reset_day_data,
    reset_night_data,
    getRole,
    getActionFunction,
    getMandatoryRoles,
    getRolesByFaction,
    getAllRoleNames,
    getRolesByPlayer,
    setVisibleFaction,
    setGameAbilityUsed,
    setRoom,
    setConnectedPlayersData,
    updatePlayerToEliminated,
    getAlivePlayers,
    getEliminatedPlayers,
    getPlayersByAlignment,
    findPlayerByNumber,
    assignRoleToPlayer
};
