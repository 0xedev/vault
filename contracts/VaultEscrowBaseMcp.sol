// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VaultDeals.sol";
import "./VaultNFT.sol";

/**
 * @title VaultEscrowBaseMcp
 * @notice Base MCP-compatible wrapper. Exposes the same nft()/deals()
 *         interface as VaultEscrow, but accepts an explicit child admin so it
 *         can be deployed through a CREATE2 factory without making the factory
 *         the VaultNFT/VaultDeals admin.
 */
contract VaultEscrowBaseMcp {
    VaultNFT public immutable nft;
    VaultDeals public immutable deals;

    constructor(address _usdc, uint256 _platformFeeBps, address _admin) {
        nft = new VaultNFT(_usdc, _platformFeeBps, _admin);
        deals = new VaultDeals(_usdc, _platformFeeBps, _admin);
    }
}
