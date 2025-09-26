// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Wizard lobby contract for hackathon
/// - Each player must stake Sepolia-ETH worth >= $1 (via Pyth ETH/USD feed)
/// - Single lobby (2..4 players). Unity (off-chain) runs the game timer.
/// - Owner (game server) submits the final leaderboard and contract pays 60%/40% to top 2.

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract WizardLobbySepolia is ReentrancyGuard {
    /// ---------- CONFIG ----------
    uint256 public constant MAX_PLAYERS = 4;
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant WINNER_SHARE_BPS = 6000; // 60.00% (basis points)
    uint256 public constant SECOND_SHARE_BPS = 4000; // 40.00%
    uint256 public constant BPS_DENOM = 10000;

    /// Require USD value = 1 USD exactly
    uint256 public constant MINIMUM_USD = 1 * 10 ** 18; // $1 in 8 decimals (Pyth format)

    /// Pyth price feed ID for ETH/USD
    bytes32 public constant ETH_USD_PRICE_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    /// ---------- STATE ----------
    address public owner;
    address[] public lobby;
    mapping(address => bool) public inLobby;
    mapping(address => string) public username;
    mapping(address => bool) public hasStaked;

    uint256 public totalStaked;
    bool public rewardsDistributed;

    /// Pyth contract interface
    IPyth public pyth;

    /// ---------- EVENTS ----------
    event UsernameSet(address indexed player, string username);
    event PlayerStakedAndJoined(address indexed player, string username, uint256 amountWei);
    event LobbyFull(address[] players);
    event RewardsDistributed(address indexed winner, uint256 winnerAmount, address indexed second, uint256 secondAmount);
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    /// ---------- CONSTRUCTOR ----------
    constructor(address _pythContract) {
        owner = msg.sender;
        pyth = IPyth(_pythContract);
    }

    /// ---------- MODIFIERS ----------
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    /// ---------- PRICE FUNCTIONS ----------
    function getPrice() internal view returns (PythStructs.Price memory) {
        return pyth.getPriceUnsafe(ETH_USD_PRICE_FEED_ID);
    }

    function getRawPrice() external view returns (int64) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace);
        return price.price;
    }

 function getExponent() external view returns (int32) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace);
        return price.expo;
    }
    /// @notice Convert ETH amount to USD value (8 decimals to match Pyth format)
    function getConversionRate(uint256 ethAmount) internal view returns (uint256) {
        PythStructs.Price memory price = getPrice();
        require(price.price > 0, "invalid price from oracle");
        
        // Convert price to proper format
        uint256 adjustedPrice;
        if (price.expo >= 0) {
            adjustedPrice = uint256(uint64(price.price)) * (10 ** uint32(price.expo));
        } else {
            adjustedPrice = uint256(uint64(price.price)) / (10 ** uint32(-price.expo));
        }
        
        // Calculate USD value: (ethAmount * pricePerETH) / 1e18
        uint256 usdValue = (ethAmount * adjustedPrice) ;
        return usdValue;
    }

    /// ---------- USER FUNCTIONS ----------
    /// @notice Set or update a username for caller (required before staking)
    function setUsername(string calldata _name) external {
        require(bytes(_name).length > 0, "empty name");
        username[msg.sender] = _name;
        emit UsernameSet(msg.sender, _name);
    }

    /// @notice Stake SEP-ETH equivalent to $1 USD and join lobby
    function stakeAndJoin() external payable nonReentrant {
        require(bytes(username[msg.sender]).length > 0, "set username first");
        require(!inLobby[msg.sender], "already in lobby");
        require(lobby.length < MAX_PLAYERS, "lobby full");
        require(msg.value > 0, "no ETH sent");

        uint256 usdValue = getConversionRate(msg.value);
        require(usdValue >= MINIMUM_USD, "stake must be at least $1 USD");

        // Register in lobby
        lobby.push(msg.sender);
        inLobby[msg.sender] = true;
        hasStaked[msg.sender] = true;
        totalStaked += msg.value;

        emit PlayerStakedAndJoined(msg.sender, username[msg.sender], msg.value);

        if (lobby.length == MAX_PLAYERS) {
            emit LobbyFull(lobby);
        }
    }

    /// ---------- ADMIN FUNCTIONS ----------
    /// @notice Owner distributes rewards after match ends
    function distributeRewards(address[] calldata leaderboard) external onlyOwner nonReentrant {
        require(lobby.length >= MIN_PLAYERS, "not enough players");
        require(leaderboard.length == lobby.length, "leaderboard size mismatch");
        require(!rewardsDistributed, "already distributed");

        // Verify leaderboard contains exactly the same addresses as lobby
        for (uint256 i = 0; i < leaderboard.length; i++) {
            require(inLobby[leaderboard[i]], "leaderboard contains non-lobby player");
        }

        // Check for duplicate addresses in leaderboard
        for (uint256 i = 0; i < leaderboard.length; i++) {
            for (uint256 j = i + 1; j < leaderboard.length; j++) {
                require(leaderboard[i] != leaderboard[j], "duplicate address in leaderboard");
            }
        }

        address winner = leaderboard[0];
        address second = leaderboard[1];

        uint256 pool = totalStaked;
        require(pool > 0, "empty pool");

        uint256 winnerAmount = (pool * WINNER_SHARE_BPS) / BPS_DENOM;
        uint256 secondAmount = (pool * SECOND_SHARE_BPS) / BPS_DENOM;

        require(winnerAmount + secondAmount <= pool, "payout overflow");

        // Mark distributed before external calls
        rewardsDistributed = true;

        // Send payouts
        (bool success1,) = payable(winner).call{value: winnerAmount}("");
        require(success1, "transfer to winner failed");

        (bool success2,) = payable(second).call{value: secondAmount}("");
        require(success2, "transfer to second failed");

        emit RewardsDistributed(winner, winnerAmount, second, secondAmount);

        // Reset lobby for next game
        _resetLobby();
    }

    /// ---------- VIEW FUNCTIONS ----------
    function getLobbyPlayers() external view returns (address[] memory) {
        return lobby;
    }

    function getUsername(address _addr) external view returns (string memory) {
        return username[_addr];
    }

    /// ---------- EMERGENCY FUNCTIONS ----------
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "no balance");
        
        (bool success,) = payable(owner).call{value: balance}("");
        require(success, "withdraw failed");
        
        emit EmergencyWithdraw(owner, balance);
        _resetLobby();
    }

    /// ---------- INTERNAL FUNCTIONS ----------
    function _resetLobby() internal {
        // Clear mappings for all lobby players
        for (uint256 i = 0; i < lobby.length; i++) {
            address player = lobby[i];
            inLobby[player] = false;
            hasStaked[player] = false;
        }
        delete lobby;
        totalStaked = 0;
        rewardsDistributed = false;
    }
}