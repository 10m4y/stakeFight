// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ArenaGame {
    // Structure to store player statistics
    struct PlayerStats {
        uint256 kills;
        uint256 deaths;
    }
    
    // Mapping to store player statistics (links address to kills/deaths)
    mapping(address => PlayerStats) public playerStats;
    
    // Array to keep track of all players who have participated
    address[] public allPlayers;
    
    // Mapping to check if player is already added to allPlayers array
    mapping(address => bool) public isPlayerAdded;
    
    // Events for transparency
    event PlayerKilled(address indexed killer, address indexed victim, bool isSuicide);
    event LeaderboardCreated(address[] sortedPlayers);
    
    /**
     * @dev Function 1: Record death/kill event
     * @param killer Address of the player who made the kill (can be address(0) for suicide)
     * @param victim Address of the player who was killed
     */
    function recordDeath(address killer, address victim) external {
        require(victim != address(0), "Victim address cannot be zero");
        
        bool isSuicide = (killer == address(0) || killer == victim);
        
        // Add victim to allPlayers array if not already added
        if (!isPlayerAdded[victim]) {
            allPlayers.push(victim);
            isPlayerAdded[victim] = true;
        }
        
        // Update victim's death count
        playerStats[victim].deaths++;
        
        // If not suicide, update killer's stats
        if (!isSuicide) {
            // Add killer to allPlayers array if not already added
            if (!isPlayerAdded[killer]) {
                allPlayers.push(killer);
                isPlayerAdded[killer] = true;
            }
            
            // Update killer's kill count
            playerStats[killer].kills++;
        }
        
        emit PlayerKilled(killer, victim, isSuicide);
    }
    
    /**
     * @dev Function 2: Create leaderboard and return addresses sorted by kills
     * @return Array of player addresses sorted by kills in descending order
     */
    function createLeaderboard() external returns (address[] memory) {
        require(allPlayers.length > 0, "No players have participated yet");
        
        // Create a copy of allPlayers array for sorting
        address[] memory sortedPlayers = new address[](allPlayers.length);
        for (uint i = 0; i < allPlayers.length; i++) {
            sortedPlayers[i] = allPlayers[i];
        }
        
        // Sort players by kills using bubble sort (descending order)
        for (uint i = 0; i < sortedPlayers.length - 1; i++) {
            for (uint j = 0; j < sortedPlayers.length - i - 1; j++) {
                // Compare kills - if equal, compare deaths (fewer deaths = better rank)
                if (playerStats[sortedPlayers[j]].kills < playerStats[sortedPlayers[j + 1]].kills ||
                    (playerStats[sortedPlayers[j]].kills == playerStats[sortedPlayers[j + 1]].kills && 
                     playerStats[sortedPlayers[j]].deaths > playerStats[sortedPlayers[j + 1]].deaths)) {
                    
                    // Swap addresses
                    address temp = sortedPlayers[j];
                    sortedPlayers[j] = sortedPlayers[j + 1];
                    sortedPlayers[j + 1] = temp;
                }
            }
        }
        
        emit LeaderboardCreated(sortedPlayers);
        return sortedPlayers;
    }
    
    // Additional utility functions for querying data
    
    /**
     * @dev Get player statistics
     * @param player Address of the player
     * @return kills Number of kills
     * @return deaths Number of deaths
     */
    function getPlayerStats(address player) external view returns (uint256 kills, uint256 deaths) {
        return (playerStats[player].kills, playerStats[player].deaths);
    }
    
    /**
     * @dev Get all players who have participated
     * @return Array of all player addresses
     */
    function getAllPlayers() external view returns (address[] memory) {
        return allPlayers;
    }
    
    /**
     * @dev Get total number of players
     * @return Number of players who have participated
     */
    function getTotalPlayers() external view returns (uint256) {
        return allPlayers.length;
    }
    
    /**
     * @dev Reset all game data (useful for testing or new tournaments)
     */
    function resetGame() external {
        // Reset all player stats
        for (uint i = 0; i < allPlayers.length; i++) {
            address player = allPlayers[i];
            playerStats[player].kills = 0;
            playerStats[player].deaths = 0;
            isPlayerAdded[player] = false;
        }
        
        // Clear the players array
        delete allPlayers;
    }
}