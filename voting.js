const role_dynamic_data = require('./role_dynamic_data');

let votes = {}

function afternoon_voting_results() {
    // return player with most votes for elimination
    // in the case of a tie between those with most votes, or less than 2 votes received, return null
    // in the case of no votes received, return null

    // Count total votes received
    let totalVotes = 0;
    let maxVotes = 0;
    let playersWithMaxVotes = [];

    // Find player(s) with most votes and count total votes
    for (const [playerNumber, playerData] of Object.entries(votes)) {
        if (playerData.votes > 0) {
            totalVotes += playerData.votes;
        }
        
        if (playerData.votes > maxVotes) {
            maxVotes = playerData.votes;
            playersWithMaxVotes = [{
                player_number: parseInt(playerNumber),
                player_name: playerData.player_name,
                votes: playerData.votes
            }];
        } else if (playerData.votes === maxVotes && playerData.votes > 0) {
            playersWithMaxVotes.push({
                player_number: parseInt(playerNumber),
                player_name: playerData.player_name,
                votes: playerData.votes
            });
        }
    }

    // If no votes received, return null
    if (totalVotes === 0) {
        return null;
    }

    // If less than 2 votes received, return null
    if (totalVotes < 2) {
        return null;
    }

    // If tie among those with most votes, return null
    if (playersWithMaxVotes.length > 1) {
        return null;
    }

    // // if the target's role is virgin and ability is active (check dynamic data), return a random player chosen from the list of players that voted for the virgin
    // const targetRole = Object.entries(role_dynamic_data.role_database)
    //     .find(([_, data]) => data.player_number === playersWithMaxVotes[0].player_number)?.[0];
    
    // if (targetRole === 'virgin' && role_dynamic_data.role_database.virgin.game_ability_used === false) {
    //     const voters = votes[playersWithMaxVotes[0].player_number].voters;
    //     const randomPlayer = voters[Math.floor(Math.random() * voters.length)];

    //     // set virgin ability to true so that this does not activate again
    //     role_dynamic_data.setGameAbilityUsed('virgin', true);
        
    //     return { player_number: randomPlayer, player_name: role_dynamic_data.role_database[randomPlayer]?.player };
    // }

    // Return the single player with most votes
    return playersWithMaxVotes[0];
}

function night_voting_results() {
    // return player with most votes for elimination
    // in the case of a tie between those with most votes, pick a random player from the tied players
    // in the case where no votes are received, return null

    // Count total votes received
    let totalVotes = 0;
    let maxVotes = 0;
    let tiedPlayers = [];

    // Find player(s) with most votes and count total votes
    for (const [playerNumber, playerData] of Object.entries(votes)) {
        if (playerData.votes > 0) {
            totalVotes += playerData.votes;
        }
        
        if (playerData.votes > maxVotes) {
            maxVotes = playerData.votes;
            tiedPlayers = [{
                player_number: parseInt(playerNumber),
                player_name: playerData.player_name,
                votes: playerData.votes
            }];
        } else if (playerData.votes === maxVotes && playerData.votes > 0) {
            tiedPlayers.push({
                player_number: parseInt(playerNumber),
                player_name: playerData.player_name,
                votes: playerData.votes
            });
        }
    }

    // If no votes received, return null
    if (totalVotes === 0) {
        return null;
    }

    // If tie among those with most votes, pick random eliminated player
    if (tiedPlayers.length > 1) {
        const randomIndex = Math.floor(Math.random() * tiedPlayers.length);
        return tiedPlayers[randomIndex];
    }
    
    // Return the single player with most votes
    return tiedPlayers[0];
}

function reset_votes() {
    // populate votes with a list of alive players, their player numbers and vote counts
    // each player starts with 0 votes
    votes = {};
    
    // get all alive players
    const alivePlayers = role_dynamic_data.getAlivePlayers();
    
    // populate votes
    for (const playerName of alivePlayers) {
        // Find the role data for this player to get their player number
        let playerNumber = null;
        for (const [roleName, roleData] of Object.entries(role_dynamic_data.role_database)) {
            if (roleData.player === playerName && roleData.alive) {
                playerNumber = roleData.player_number;
                break;
            }
        }
        
        if (playerNumber !== null) {
            votes[playerNumber] = {
                player_name: playerName,
                votes: 0,
                voters: null
            };
        }
    }
}

function add_vote(voter_player_number, target_player_number) {
    // add a vote to the target player
    votes[target_player_number].votes++;

    // add the voter to the list of voters
    if (!votes[target_player_number].voters) {
        votes[target_player_number].voters = [];
    }
    votes[target_player_number].voters.push(voter_player_number);
}

module.exports = {
    votes,
    afternoon_voting_results,
    night_voting_results,
    reset_votes,
    add_vote
};
