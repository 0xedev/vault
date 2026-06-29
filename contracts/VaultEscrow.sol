// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VaultEscrow
 * @notice Deployer + type re-export for backward compatibility.
 *         Deploy VaultNFT for NFT-collateralised loans and VaultDeals for digital asset escrow.
 */
import "./VaultNFT.sol";
import "./VaultDeals.sol";

contract VaultEscrow {
    VaultNFT public immutable nft;
    VaultDeals public immutable deals;

    constructor(address _usdc, uint256 _platformFeeBps) {
        nft = new VaultNFT(_usdc, _platformFeeBps);
        deals = new VaultDeals(_usdc, _platformFeeBps);
    }
}
