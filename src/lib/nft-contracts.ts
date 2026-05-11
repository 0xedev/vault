export const NFT_CONTRACTS: Record<string, string> = {
  "Meridian Genesis": "0x8a90cab2b38dba80c64b41e9867b9c09c1e33b63",
  Aperture: "0xdbdf2e1c9e5c84fe99ba6e39c75aa7ffe2f893b0",
  "Hollow Forms": "0x7a14f86e4429d3ce2b3a0987c9a78d0e6e021a45",
  "Cipher Drones": "0x4b61413d4392c806e0d10144c6e8c0f2c8e2a31d",
  "Solene Mirrors": "0xb1e9d6412d1b3a2b4178f7e28fc9e194c6c1b542",
  "Halo Pass": "0x91a72d2d1c1f3e0a5b8d7e6c4f3a2b1d0e9c8b7a",
  "Strata Index": "0x3a8b1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
  "Veil Quartet": "0x5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
  "CryptoPunks": "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
  "BAYC": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
  "Azuki": "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
  "Pudgy Penguins": "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8",
};

export const NFT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
] as const;
