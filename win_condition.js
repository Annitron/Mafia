const role_dynamic_data = require('./role_dynamic_data');

function mafia_count() {
    // count number of alive mafia by iterating through role_dynamic_data
    let mafia_count = 0;
    for (const [role, data] of Object.entries(role_dynamic_data)) {
        if (data.alive && role_dynamic_data.getRole(role).faction === 'mafia') {
            mafia_count++;
        }
    }
    return mafia_count;
}

function villager_count() {
    // count number of alive town by iterating through role_dynamic_data
    let villager_count = 0;
    for (const [role, data] of Object.entries(role_dynamic_data)) {
        if (data.alive && role_dynamic_data.getRole(role).faction === 'villager') {
            villager_count++;
        }
    }
    return villager_count;
}

function check_win_condition() {
    // Get alive mafia and villagers
    const mafia_alive = mafia_count();
    const villager_alive = villager_count();
    console.log('Mafia alive:', mafia_alive);
    console.log('Villager alive:', villager_alive);

    // check if mafia has won
    // mafia wins if number of mafia >= number of town (if no activated mayor present), or if number of mafia > number of town (if activated mayor present)
    if (role_dynamic_data.getRole('mayor').game_ability_used) {
        // mayor is activated, so mafia needs to have more than half the town
        if (mafia_alive > villager_alive) {
            return {
                break_game: true,
                winner: 'mafia'
            };
        }
    } else {
        // mayor is not activated, so mafia needs to have at least half the town
        if (mafia_alive >= villager_alive) {
            return {
                break_game: true,
                winner: 'mafia'
            };
        }
    }

    // check if villager has won
    // villager wins if all mafia are dead
    if (mafia_alive === 0) {
        return {
            break_game: true,
            winner: 'villager'
        };
    }

    // no win condition has been met
    return {
        break_game: false,
        winner: null
    };
}

module.exports = {
    check_win_condition
};
