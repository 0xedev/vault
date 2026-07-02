// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console2.sol";
import "../contracts/VaultEscrow.sol";
import "../contracts/VaultEscrowBaseMcp.sol";

contract DeployVaultEscrowScript is Script {
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    bytes32 internal constant DEFAULT_SALT = keccak256("vault.base-mcp.deploy.v1");

    struct DeployConfig {
        address usdc;
        uint256 platformFeeBps;
        address admin;
        bytes32 salt;
    }

    function run() external returns (VaultEscrow escrow) {
        address usdc = vm.envOr("USDC", BASE_USDC);
        uint256 platformFeeBps = vm.envOr("PLATFORM_FEE_BPS", uint256(150));

        vm.startBroadcast();
        escrow = new VaultEscrow(usdc, platformFeeBps);
        vm.stopBroadcast();

        console2.log("VaultEscrow", address(escrow));
        console2.log("VaultNFT", address(escrow.nft()));
        console2.log("VaultDeals", address(escrow.deals()));
    }

    function writeBaseMcpPayload() external returns (address predictedEscrow) {
        DeployConfig memory config = _baseMcpConfig();
        bytes memory initCode = abi.encodePacked(
            type(VaultEscrowBaseMcp).creationCode,
            abi.encode(config.usdc, config.platformFeeBps, config.admin)
        );

        predictedEscrow = _create2Address(config.salt, keccak256(initCode));
        bytes memory callData = abi.encodePacked(config.salt, initCode);

        string memory path = vm.envOr("BASE_MCP_DEPLOY_JSON", string("deployments/base-mcp-deploy.json"));
        string memory object = "baseMcpDeploy";

        vm.serializeString(object, "chain", "base");
        vm.serializeAddress(object, "to", CREATE2_DEPLOYER);
        vm.serializeString(object, "value", "0x0");
        vm.serializeBytes(object, "data", callData);
        vm.serializeAddress(object, "predictedEscrow", predictedEscrow);
        vm.serializeAddress(object, "predictedNft", _createAddress(predictedEscrow, 1));
        vm.serializeAddress(object, "predictedDeals", _createAddress(predictedEscrow, 2));
        vm.serializeAddress(object, "admin", config.admin);
        vm.serializeAddress(object, "usdc", config.usdc);
        vm.serializeUint(object, "platformFeeBps", config.platformFeeBps);
        string memory json = vm.serializeBytes32(object, "salt", config.salt);
        vm.writeJson(json, path);

        console2.log("Wrote Base MCP deployment payload", path);
        console2.log("send_calls.to", CREATE2_DEPLOYER);
        console2.log("predictedEscrow", predictedEscrow);
        console2.log("predictedNft", _createAddress(predictedEscrow, 1));
        console2.log("predictedDeals", _createAddress(predictedEscrow, 2));
    }

    function _baseMcpConfig() internal view returns (DeployConfig memory config) {
        config.usdc = vm.envOr("USDC", BASE_USDC);
        config.platformFeeBps = vm.envOr("PLATFORM_FEE_BPS", uint256(150));
        config.admin = vm.envAddress("ADMIN");
        config.salt = vm.envOr("SALT", DEFAULT_SALT);
        require(config.admin != address(0), "ADMIN required");
        require(config.platformFeeBps <= 500, "fee too high");
    }

    function _create2Address(bytes32 salt, bytes32 initCodeHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), CREATE2_DEPLOYER, salt, initCodeHash)))));
    }

    function _createAddress(address deployer, uint256 nonce) internal pure returns (address) {
        require(nonce > 0 && nonce < 128, "nonce unsupported");
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, uint8(nonce))))));
    }
}
