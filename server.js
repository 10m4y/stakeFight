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
const CHEST_ADDRESS = '0xB4Dd7437486D6615579f950602329B2073E4225b';
const LOBBY_ADDRESS = '0x8054056D3c1341bA27A8127c39AE0956d1794CF1';

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
    "inputs": [],
    "name": "stakeAndJoin",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"}],
    "name": "setUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]", "name": "leaderboard", "type": "address[]"}],
    "name": "distributeRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLobbyPlayers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_addr", "type": "address"}],
    "name": "getUsername",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRequiredETHAmount",
    "outputs": [
      {"internalType": "uint256", "name": "ethPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "requiredWei", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "ethAmount", "type": "uint256"}],
    "name": "checkStakeAmount",
    "outputs": [
      {"internalType": "uint256", "name": "usdValue", "type": "uint256"},
      {"internalType": "bool", "name": "isValid", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "hasStaked",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "inLobby",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalStaked",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardsDistributed",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Create contract instances
const chestContract = new web3.eth.Contract(CHEST_ABI, CHEST_ADDRESS);
const lobbyContract = new web3.eth.Contract(LOBBY_ABI, LOBBY_ADDRESS);

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

  // Get entropy fee
  socket.on('get-entropy-fee', async (data) => {
    try {
      const fee = await chestContract.methods.getEntropyFee().call();
      console.log('Entropy fee (wei):', fee.toString());
      socket.emit('entropy-fee-result', {
        success: true,
        fee: fee.toString(),
        feeInEth: web3.utils.fromWei(fee.toString(), 'ether')
      });
      
    } catch (error) {
      console.error('Get entropy fee error:', error);
      socket.emit('entropy-fee-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Request chest opening
  socket.on('request-chest-opening', async () => {
    try {
        const fromAddress = '0x87259355d99E78c381c314EC9A5cEbb4859eed79';
        const valueWei = 15000000000001; // Amount of ETH to send in wei
        const privateKey = process.env.PRIVATE_KEY; // Private key of the sender
      // Build transaction
      const tx = {
        from: fromAddress,
        to: CHEST_ADDRESS,
        value: valueWei,
        data: chestContract.methods.requestChestOpening().encodeABI(),
        // gas: 200000 // Adjust as needed
      };
      const gas = await web3.eth.estimateGas(tx);
    const gasPrice = await web3.eth.getGasPrice();

    const signedTx = await web3.eth.accounts.signTransaction(
    { ...tx, gas, gasPrice },
    privateKey
    );
      // Sign transaction
    //   const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
      console.log('Signed transaction:', signedTx);

      // Send transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(receipt);

      function cleanBigInts(obj) {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(cleanBigInts);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, cleanBigInts(v)])
    );
  }
  return obj;
}

const safeReceipt = cleanBigInts(receipt);

socket.emit('request-chest-opening-result', {
  success: true,
  txHash: receipt.transactionHash,
  receipt: safeReceipt
});

    } catch (error) {
      console.error('Request chest opening error:', error);
      socket.emit('request-chest-opening-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Activate fallback for chest opening
  socket.on('activate-fallback', async (data) => {
    try {
      // Hardcode user address to be same as fromAddress for server-controlled wallet
      const fromAddress = '0x87259355d99E78c381c314EC9A5cEbb4859eed79';
      const userAddress = fromAddress; // Hardcoded - same wallet for both transaction sender and user
      const privateKey = process.env.PRIVATE_KEY;
      
      // Get sequenceNumber from data if provided, otherwise auto-detect
      let targetSequenceNumber = data?.sequenceNumber;
      
      // If no sequence number provided, find the latest unfulfilled request that can use fallback
      if (!targetSequenceNumber) {
        console.log('🔍 Auto-detecting sequence number for fallback...');
        
        // Get user's chest requests
        const userRequests = await chestContract.methods.getUserChestRequests(userAddress).call();
        const sequenceNumbers = userRequests[0]; // Array of sequence numbers
        const fulfilled = userRequests[1]; // Array of fulfillment status
        
        // Find the latest unfulfilled request that can activate fallback
        for (let i = sequenceNumbers.length - 1; i >= 0; i--) {
          if (!fulfilled[i]) {
            const canFallback = await chestContract.methods.canActivateFallback(sequenceNumbers[i]).call();
            if (canFallback) {
              targetSequenceNumber = sequenceNumbers[i];
              console.log('✅ Found fallback-eligible sequence number:', targetSequenceNumber.toString());
              break;
            }
          }
        }
        
        if (!targetSequenceNumber) {
          throw new Error('No fallback-eligible requests found for this user');
        }
      }
      
      if (!targetSequenceNumber) {
        throw new Error('Sequence number is required');
      }
      
      // Verify that fallback can be activated for this sequence number
      const canFallback = await chestContract.methods.canActivateFallback(targetSequenceNumber).call();
      if (!canFallback) {
        throw new Error(`Fallback cannot be activated for sequence number ${targetSequenceNumber}`);
      }
      
      console.log('🔄 Activating fallback for sequence number:', targetSequenceNumber.toString());
      
      // Build transaction
      const tx = {
        from: fromAddress,
        to: CHEST_ADDRESS,
        data: chestContract.methods.activateFallback(targetSequenceNumber).encodeABI(),
      };
      
      // Estimate gas and get gas price
      const gas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      
      // Sign transaction
      const signedTx = await web3.eth.accounts.signTransaction(
        { ...tx, gas, gasPrice },
        privateKey
      );
      
      console.log('📝 Signed fallback transaction');
      
      // Send transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log('✅ Fallback activated successfully:', receipt.transactionHash);
      
      // Clean BigInt values for JSON response
      const cleanBigInts = (obj) => {
        if (typeof obj === "bigint") return obj.toString();
        if (Array.isArray(obj)) return obj.map(cleanBigInts);
        if (obj && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, cleanBigInts(v)])
          );
        }
        return obj;
      };
      
      const safeReceipt = cleanBigInts(receipt);
      
      socket.emit('activate-fallback-result', {
        success: true,
        sequenceNumber: targetSequenceNumber.toString(),
        txHash: receipt.transactionHash,
        userAddress: userAddress,
        receipt: safeReceipt
      });
      
    } catch (error) {
      console.error('❌ Activate fallback error:', error);
      socket.emit('activate-fallback-result', {
        success: false,
        error: error.message,
        sequenceNumber: data?.sequenceNumber?.toString() || null,
        userAddress: userAddress
      });
    }
  });

  // Check if fallback can be activated for a specific sequence number
  socket.on('can-activate-fallback', async (data) => {
    try {
      const { sequenceNumber } = data;
      const canActivate = await chestContract.methods.canActivateFallback(sequenceNumber).call();
      
      socket.emit('can-activate-fallback-result', {
        success: true,
        sequenceNumber: sequenceNumber,
        canActivate: canActivate
      });
      
    } catch (error) {
      console.error('Can activate fallback error:', error);
      socket.emit('can-activate-fallback-result', {
        success: false,
        error: error.message
      });
    }
  });

  // LOBBY CONTRACT FUNCTIONS
  
  // Get lobby players
  socket.on('get-lobby-players', async (data) => {
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

  // Get username
  socket.on('get-username', async (data) => {
    try {
      const { userAddress } = data;
      const username = await lobbyContract.methods.getUsername(userAddress).call();
      
      socket.emit('username-result', {
        success: true,
        userAddress: userAddress,
        username: username
      });
      
    } catch (error) {
      console.error('Get username error:', error);
      socket.emit('username-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Set username
  socket.on('set-username', async (data) => {
    try {
      const { username } = data;
      const fromAddress = '0x87259355d99E78c381c314EC9A5cEbb4859eed79';
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!username || username.trim() === '') {
        throw new Error('Username is required and cannot be empty');
      }
      
      console.log('🏷️ Setting username:', username, 'for address:', fromAddress);
      
      // Build transaction
      const tx = {
        from: fromAddress,
        to: LOBBY_ADDRESS,
        data: lobbyContract.methods.setUsername(username).encodeABI(),
      };
      
      // Estimate gas and get gas price
      const gas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      
      // Sign transaction
      const signedTx = await web3.eth.accounts.signTransaction(
        { ...tx, gas, gasPrice },
        privateKey
      );
      
      console.log('📝 Signed setUsername transaction');
      
      // Send transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log('✅ Username set successfully:', receipt.transactionHash);
      
      // Clean BigInt values for JSON response
      const cleanBigInts = (obj) => {
        if (typeof obj === "bigint") return obj.toString();
        if (Array.isArray(obj)) return obj.map(cleanBigInts);
        if (obj && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, cleanBigInts(v)])
          );
        }
        return obj;
      };
      
      const safeReceipt = cleanBigInts(receipt);
      
      socket.emit('set-username-result', {
        success: true,
        username: username,
        userAddress: fromAddress,
        txHash: receipt.transactionHash,
        receipt: safeReceipt
      });
      
    } catch (error) {
      console.error('❌ Set username error:', error);
      socket.emit('set-username-result', {
        success: false,
        error: error.message,
        username: data?.username || null,
        userAddress: '0x87259355d99E78c381c314EC9A5cEbb4859eed79'
      });
    }
  });

  // Get required ETH amount
  socket.on('get-required-eth', async (data) => {
    try {
      const result = await lobbyContract.methods.getRequiredETHAmount().call();
      
      socket.emit('required-eth-result', {
        success: true,
        ethPrice: result[0].toString(),
        requiredWei: result[1].toString(),
        requiredEth: web3.utils.fromWei(result[1].toString(), 'ether')
      });
      
    } catch (error) {
      console.error('Get required ETH error:', error);
      socket.emit('required-eth-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Check stake amount
  socket.on('check-stake-amount', async (data) => {
    try {
      const { ethAmount } = data;
      const weiAmount = web3.utils.toWei(ethAmount.toString(), 'ether');
      const result = await lobbyContract.methods.checkStakeAmount(weiAmount).call();
      
      socket.emit('stake-amount-result', {
        success: true,
        ethAmount: ethAmount,
        usdValue: result[0].toString(),
        isValid: result[1]
      });
      
    } catch (error) {
      console.error('Check stake amount error:', error);
      socket.emit('stake-amount-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Check if user has staked (read-only)
  socket.on('check-has-staked', async (data) => {
    try {
      const { userAddress } = data;
      const hasStaked = await lobbyContract.methods.hasStaked(userAddress).call();
      
      socket.emit('has-staked-result', {
        success: true,
        userAddress: userAddress,
        hasStaked: hasStaked
      });
      
    } catch (error) {
      console.error('Check has staked error:', error);
      socket.emit('has-staked-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Check if user is in lobby (read-only)
  socket.on('check-in-lobby', async (data) => {
    try {
      const { userAddress } = data;
      const inLobby = await lobbyContract.methods.inLobby(userAddress).call();
      
      socket.emit('in-lobby-result', {
        success: true,
        userAddress: userAddress,
        inLobby: inLobby
      });
      
    } catch (error) {
      console.error('Check in lobby error:', error);
      socket.emit('in-lobby-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Get total staked amount
  socket.on('get-total-staked', async (data) => {
    try {
      const totalStaked = await lobbyContract.methods.totalStaked().call();
      
      socket.emit('total-staked-result', {
        success: true,
        totalStaked: totalStaked.toString(),
        totalStakedEth: web3.utils.fromWei(totalStaked.toString(), 'ether')
      });
      
    } catch (error) {
      console.error('Get total staked error:', error);
      socket.emit('total-staked-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Check if rewards are distributed
  socket.on('rewards-distributed', async (data) => {
    try {
      const distributed = await lobbyContract.methods.rewardsDistributed().call();
      
      socket.emit('rewards-distributed-result', {
        success: true,
        rewardsDistributed: distributed
      });
      
    } catch (error) {
      console.error('Rewards distributed error:', error);
      socket.emit('rewards-distributed-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Get ETH balance
  socket.on('get-eth-balance', async (data) => {
    try {
      const { address } = data;
      const balance = await web3.eth.getBalance(address);
      const balanceInEth = web3.utils.fromWei(balance, 'ether');
      
      socket.emit('eth-balance-result', {
        success: true,
        balance: balance,
        balanceEth: balanceInEth,
        address
      });
    } catch (error) {
      socket.emit('eth-balance-result', {
        success: false,
        error: error.message
      });
    }
  });

  // Distribute rewards (Admin function)
  socket.on('distribute-rewards', async (data) => {
    try {
      const { leaderboard } = data; // Array of addresses in order of ranking
      const fromAddress = '0x87259355d99E78c381c314EC9A5cEbb4859eed79';
      const privateKey = process.env.PRIVATE_KEY;
      
      if (!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) {
        throw new Error('Leaderboard is required and must be a non-empty array of addresses');
      }
      
      // Validate addresses
      for (let address of leaderboard) {
        if (!web3.utils.isAddress(address)) {
          throw new Error(`Invalid address in leaderboard: ${address}`);
        }
      }
      
      console.log('🏆 Distributing rewards to leaderboard:', leaderboard);
      
      // Build transaction
      const tx = {
        from: fromAddress,
        to: LOBBY_ADDRESS,
        data: lobbyContract.methods.distributeRewards(leaderboard).encodeABI(),
      };
      
      // Estimate gas and get gas price
      const gas = await web3.eth.estimateGas(tx);
      const gasPrice = await web3.eth.getGasPrice();
      
      // Sign transaction
      const signedTx = await web3.eth.accounts.signTransaction(
        { ...tx, gas, gasPrice },
        privateKey
      );
      
      console.log('📝 Signed distributeRewards transaction');
      
      // Send transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log('✅ Rewards distributed successfully:', receipt.transactionHash);
      
      // Clean BigInt values for JSON response
      const cleanBigInts = (obj) => {
        if (typeof obj === "bigint") return obj.toString();
        if (Array.isArray(obj)) return obj.map(cleanBigInts);
        if (obj && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, cleanBigInts(v)])
          );
        }
        return obj;
      };
      
      const safeReceipt = cleanBigInts(receipt);
      
      socket.emit('distribute-rewards-result', {
        success: true,
        leaderboard: leaderboard,
        txHash: receipt.transactionHash,
        receipt: safeReceipt
      });
      
    } catch (error) {
      console.error('❌ Distribute rewards error:', error);
      socket.emit('distribute-rewards-result', {
        success: false,
        error: error.message,
        leaderboard: data?.leaderboard || null
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
});