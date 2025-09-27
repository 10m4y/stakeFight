// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract RandomNo is ReentrancyGuard {
    uint256 private _nonce;

    // 🔔 Event to notify off-chain listeners
    event RandomGenerated(address indexed caller, uint8 number);

    /// @notice Returns a pseudo-random number in the range [0, 4].
    /// @dev Emits an event with the result. Not secure for high-value randomness.
    function random() public returns (uint8) {
        uint256 r = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao, // ✅ updated for Paris upgrade
                    msg.sender,
                    _nonce
                )
            )
        );
        _nonce += 1;

        uint8 result = uint8(r % 5);

        // emit event so backend can read it
        emit RandomGenerated(msg.sender, result);

        return result;
    }
}