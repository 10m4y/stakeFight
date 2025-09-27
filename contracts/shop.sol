// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChestNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    address public chestOpener;

    constructor(address initialOwner) ERC721("Chest NFT", "CNFT") Ownable(initialOwner) {}

    modifier onlyChestOpener() {
        require(msg.sender == chestOpener, "Not ChestOpener");
        _;
    }

    function setChestOpener(address _chestOpener) external onlyOwner {
        chestOpener = _chestOpener;
    }

    function mint(address to) external onlyChestOpener returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
}
