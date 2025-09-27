import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Web3 from 'web3';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Web3 setup - Base Sepolia
const web3 = new Web3(process.env.RPC_URL);

// Contract addresses
const CHEST_ADDRESS = process.env.CHEST_CONTRACT_ADDRESS;
const LOBBY_ADDRESS = process.env.LOBBY_CONTRACT_ADDRESS;
// Add your random contract address here
const RANDOM_CONTRACT_ADDRESS = process.env.RANDOM_CONTRACT_ADDRESS;

// Chest Contract ABI
const CHEST_ABI = [
  {
    "inputs": [{"internalType": "uint64", "name": "sequenceNumber", "type": "uint64"}],
    "name": "activateFallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestChestOpening",
    "outputs": [{"internalType": "uint64", "name": "sequenceNumber", "type": "uint64"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "openChestWithFallback",
    "outputs": [{"internalType": "uint64", "name": "sequenceNumber", "type": "uint64"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserCoins",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint64", "name": "sequenceNumber", "type": "uint64"}],
    "name": "getRequestStatus",
    "outputs": [
      {"internalType": "address", "name": "requester", "type": "address"},
      {"internalType": "bool", "name": "fulfilled", "type": "bool"},
      {"internalType": "uint256", "name": "coinsReceived", "type": "uint256"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "string", "name": "status", "type": "string"},
      {"internalType": "string", "name": "randomnessSource", "type": "string"},
      {"internalType": "bool", "name": "canFallback", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserChestRequests",
    "outputs": [
      {"internalType": "uint64[]", "name": "sequenceNumbers", "type": "uint64[]"},
      {"internalType": "bool[]", "name": "fulfilled", "type": "bool[]"},
      {"internalType": "uint256[]", "name": "coinsWon", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "timestamps", "type": "uint256[]"},
      {"internalType": "string[]", "name": "status", "type": "string[]"},
      {"internalType": "string[]", "name": "randomnessSource", "type": "string[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEntropyFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint64", "name": "sequenceNumber", "type": "uint64"}],
    "name": "canActivateFallback",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Lobby Contract ABI
const LOBBY_ABI = [ 
  {
    "inputs": [{"internalType": "address", "name": "killerAddress", "type": "address"}, {"internalType": "address", "name": "victimAddress", "type": "address"}],
    "name": "recordPlayerElimination",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "generateGameLeaderboard",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]", "name": "leaderboard", "type": "address[]"}],
    "name": "distributeRewards",
    "outputs": [],
    "stateMutability": "nonpayable",  
    "type": "function"
  }
];

// Random Contract ABI
const RANDOM_ABI = [
  {
    "inputs": [],
    "name": "random",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "caller", "type": "address"},
      {"indexed": false, "internalType": "uint8", "name": "number", "type": "uint8"}
    ],
    "name": "RandomGenerated",
    "type": "event"
  }
];

// Create contract instances
const chestContract = new web3.eth.Contract(CHEST_ABI, CHEST_ADDRESS);
const lobbyContract = new web3.eth.Contract(LOBBY_ABI, LOBBY_ADDRESS);
const randomContract = new web3.eth.Contract(RANDOM_ABI, RANDOM_CONTRACT_ADDRESS);

// Helper function to convert BigInt values to strings
const convertBigIntToString = (obj) => {
  if (typeof obj === 'bigint') {
    return obj.toString();
  } else if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToString(value);
    }
    return result;
  }
  return obj;
};

io.on('connection', (socket) => {
  console.log('Unity connected:', socket.id);
  
  // Add debug logging for all incoming events
  socket.onAny((eventName, data) => {
    console.log(`📨 Received event: ${eventName}`, data);
  });

  // Simple test endpoint
  socket.on('test-connection', (data) => {
    console.log('🧪 Test connection received:', data);
    socket.emit('test-response', {
      success: true,
      message: 'Server is working!',
      timestamp: new Date().toISOString()
    });
  });

  // RANDOM NUMBER GENERATION FUNCTION
  socket.on('generate-random-number', async (data) => {
    try {
      console.log("🎲 Generating random number...");

      const adminPrivateKey = process.env.PRIVATE_KEY;
      if (!adminPrivateKey) throw new Error("PRIVATE_KEY not set in environment");

      const account = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
      web3.eth.accounts.wallet.add(account);

      const tx = randomContract.methods.random();
      const gas = await tx.estimateGas({ from: account.address });
      const txData = tx.encodeABI();

      const txObject = {
        from: account.address,
        to: RANDOM_CONTRACT_ADDRESS,
        data: txData,
        gas
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, adminPrivateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      console.log("✅ Random number generated:", receipt.transactionHash);

      // Listen for the RandomGenerated event to get the actual random number
      const eventSignature = web3.eth.abi.encodeEventSignature({
        name: 'RandomGenerated',
        type: 'event',
        inputs: [
          { type: 'address', name: 'caller', indexed: true },
          { type: 'uint8', name: 'number', indexed: false }
        ]
      });

      // Get the event from the transaction receipt
      let randomNumber = null;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          if (log.topics[0] === eventSignature) {
            const decodedLog = web3.eth.abi.decodeLog(
              [
                { type: 'address', name: 'caller', indexed: true },
                { type: 'uint8', name: 'number', indexed: false }
              ],
              log.data,
              log.topics.slice(1)
            );
            randomNumber = parseInt(decodedLog.number);
            break;
          }
        }
      }

      socket.emit('random-number-result', {
        success: true,
        txHash: receipt.transactionHash,
        randomNumber: randomNumber,
        caller: account.address,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("❌ Error generating random number:", error);
      socket.emit('random-number-result', {
        success: false,
        error: error.message
      });
    }
  });

  // CHEST CONTRACT FUNCTIONS
  
  // Get user coins from chest contract
  socket.on('get-user-coins', async (data) => {
    try {
      const { userAddress } = data;
      const coins = await chestContract.methods.getUserCoins(userAddress).call();
      
      socket.emit('user-coins-result', {
        success: true,
        coins: coins.toString(),
        userAddress: userAddress
      });
      
    } catch (error) {
      console.error('Get user coins error:', error);
      socket.emit('user-coins-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Get chest request status
  socket.on('get-request-status', async (data) => {
    try {
      const { sequenceNumber } = data;
      const result = await chestContract.methods.getRequestStatus(sequenceNumber).call();
      
      socket.emit('request-status-result', {
        success: true,
        sequenceNumber: sequenceNumber,
        requester: result[0],
        fulfilled: result[1],
        coinsReceived: result[2].toString(),
        timestamp: result[3].toString(),
        status: result[4],
        randomnessSource: result[5],
        canFallback: result[6]
      });
      
    } catch (error) {
      console.error('Get request status error:', error);
      socket.emit('request-status-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Get user chest requests
  socket.on('get-user-chest-requests', async (data) => {
    try {
      const { userAddress } = data;
      const result = await chestContract.methods.getUserChestRequests(userAddress).call();
      
      socket.emit('user-chest-requests-result', {
        success: true,
        userAddress: userAddress,
        sequenceNumbers: convertBigIntToString(result[0]),
        fulfilled: result[1],
        coinsWon: convertBigIntToString(result[2]),
        timestamps: convertBigIntToString(result[3]),
        status: result[4],
        randomnessSource: result[5]
      });
      
    } catch (error) {
      console.error('Get user chest requests error:', error);
      socket.emit('user-chest-requests-result', {
        success: false,
        error: error.message
      });
    }
  });

  // LOBBY CONTRACT FUNCTIONS
  
  // Get lobby players
  socket.on('get-current-lobby-players', async (data) => {
    try {
      const players = await lobbyContract.methods.getLobbyPlayers().call();
      console.log('Lobby players:', players);
      
      socket.emit('lobby-players-result', {
        success: true,
        players: players,
        playerCount: players.length
      });
      
    } catch (error) {
      console.error('Get lobby players error:', error);
      socket.emit('lobby-players-result', {
        success: false,
        error: error.message
      });
    }
  });

  socket.on('send-kill-data', async(data) => {
    try {
      const { killerAddress, victimAddress } = data;

      console.log(`Recording elimination: killer=${killerAddress}, victim=${victimAddress}`);

      const adminPrivateKey = process.env.PRIVATE_KEY;
      if (!adminPrivateKey) throw new Error("PRIVATE_KEY not set in environment");

      const account = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
      web3.eth.accounts.wallet.add(account);

      const tx = lobbyContract.methods.recordPlayerElimination(killerAddress, victimAddress);
      const gas = await tx.estimateGas({ from: account.address });
      const txData = tx.encodeABI();

      const txObject = {
        from: account.address,
        to: LOBBY_ADDRESS,
        data: txData,
        gas
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, adminPrivateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
      console.log("✅ Kill recorded:", receipt.transactionHash);

      socket.emit('kill-data-result', {
        success: true,
        txHash: receipt.transactionHash,
        killerAddress,
        victimAddress
      });

    } catch (error) {
      console.error("❌ Error recording kill:", error);
      socket.emit('kill-data-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Generate game leaderboard
  socket.on('generate-game-leaderboard', async () => {
    try {
      console.log("⚡ Generating game leaderboard...");

      const adminPrivateKey = process.env.PRIVATE_KEY;
      if (!adminPrivateKey) throw new Error("PRIVATE_KEY not set in environment");

      const account = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
      web3.eth.accounts.wallet.add(account);

      const tx = lobbyContract.methods.generateGameLeaderboard();
      const gas = await tx.estimateGas({ from: account.address });
      const txData = tx.encodeABI();

      const txObject = {
        from: account.address,
        to: LOBBY_ADDRESS,
        data: txData,
        gas
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, adminPrivateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      console.log("✅ Leaderboard generated:", receipt.transactionHash);

      // fetch leaderboard after tx mined
      const leaderboard = await lobbyContract.methods.generateGameLeaderboard().call();

      socket.emit('generate-game-leaderboard-result', {
        success: true,
        txHash: receipt.transactionHash,
        leaderboard
      });

    } catch (error) {
      console.error("❌ Error generating leaderboard:", error);
      socket.emit('generate-game-leaderboard-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Distribute rewards
  socket.on('distribute-rewards', async (data) => {
    try {
      const { leaderboard } = data;
      if (!leaderboard || leaderboard.length === 0) {
        throw new Error("Leaderboard is required to distribute rewards");
      }

      console.log("⚡ Distributing rewards for leaderboard:", leaderboard);

      const adminPrivateKey = process.env.PRIVATE_KEY;
      if (!adminPrivateKey) throw new Error("PRIVATE_KEY not set in environment");

      const account = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
      web3.eth.accounts.wallet.add(account);

      const tx = lobbyContract.methods.distributeRewards(leaderboard);
      const gas = await tx.estimateGas({ from: account.address });
      const txData = tx.encodeABI();

      const txObject = {
        from: account.address,
        to: LOBBY_ADDRESS,
        data: txData,
        gas
      };

      const signedTx = await web3.eth.accounts.signTransaction(txObject, adminPrivateKey);
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      console.log("✅ Rewards distributed:", receipt.transactionHash);

      socket.emit('distribute-rewards-result', {
        success: true,
        txHash: receipt.transactionHash,
        leaderboard
      });

    } catch (error) {
      console.error("❌ Error distributing rewards:", error);
      socket.emit('distribute-rewards-result', {
        success: false,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Unity disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Smart Contract Server running on port ${PORT}`);
  console.log(`Chest Contract: ${CHEST_ADDRESS}`);
  console.log(`Lobby Contract: ${LOBBY_ADDRESS}`);
  console.log(`Random Contract: ${RANDOM_CONTRACT_ADDRESS}`);
});
