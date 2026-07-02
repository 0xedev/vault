export const ESCROW_ABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_usdc",
        type: "address",
        internalType: "address",
      },
      {
        name: "_platformFeeBps",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deals",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract VaultDeals",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nft",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract VaultNFT",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const ERC721_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const VaultNFT_ABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_usdc",
        type: "address",
        internalType: "address",
      },
      {
        name: "_platformFeeBps",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_admin",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "GRACE_PERIOD",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "SIGNED_LOAN_OFFER_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "acceptOffer",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        internalType: "address",
      },
      {
        name: "acceptedAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "acceptedApr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "acceptedTerm",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptSignedOffer",
    inputs: [
      {
        name: "offer",
        type: "tuple",
        internalType: "struct VaultNFT.SignedLoanOffer",
        components: [
          {
            name: "listingId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "lender",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "apr",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "term",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "expiry",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addAdmin",
    inputs: [
      {
        name: "newAdmin",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "adminCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "admins",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelOfferNonce",
    inputs: [
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelOfferNonces",
    inputs: [
      {
        name: "nonces",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCollateral",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dispute",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getDeadline",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListingSummary",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct VaultNFT.ListingSummary",
        components: [
          {
            name: "id",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "listing",
            type: "tuple",
            internalType: "struct VaultNFT.Listing",
            components: [
              {
                name: "borrower",
                type: "address",
                internalType: "address",
              },
              {
                name: "nftContract",
                type: "address",
                internalType: "address",
              },
              {
                name: "nftTokenId",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "principal",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "apr",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "term",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedLender",
                type: "address",
                internalType: "address",
              },
              {
                name: "acceptedAmount",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedApr",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedTerm",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "fundedAt",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "repaidSoFar",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "stage",
                type: "uint8",
                internalType: "enum VaultNFT.Stage",
              },
            ],
          },
          {
            name: "escrowBalance",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "offerCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "totalDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "paid",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "remaining",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getListings",
    inputs: [
      {
        name: "startId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct VaultNFT.ListingSummary[]",
        components: [
          {
            name: "id",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "listing",
            type: "tuple",
            internalType: "struct VaultNFT.Listing",
            components: [
              {
                name: "borrower",
                type: "address",
                internalType: "address",
              },
              {
                name: "nftContract",
                type: "address",
                internalType: "address",
              },
              {
                name: "nftTokenId",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "principal",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "apr",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "term",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedLender",
                type: "address",
                internalType: "address",
              },
              {
                name: "acceptedAmount",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedApr",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "acceptedTerm",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "fundedAt",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "repaidSoFar",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "stage",
                type: "uint8",
                internalType: "enum VaultNFT.Stage",
              },
            ],
          },
          {
            name: "escrowBalance",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "offerCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "totalDue",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "paid",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "remaining",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLoanOffer",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "offer",
        type: "tuple",
        internalType: "struct VaultNFT.Offer",
        components: [
          {
            name: "apr",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "term",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "deposit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOfferCount",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOfferLenders",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRepaymentDue",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "totalDue",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "paid",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "remaining",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserActivities",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct VaultCore.Activity[]",
        components: [
          {
            name: "action",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "market",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "subjectId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "actor",
            type: "address",
            internalType: "address",
          },
          {
            name: "counterparty",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "timestamp",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "status",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "metadataHash",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserBoughtDealIds",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserDealIds",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserDealOfferIds",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserLoanOfferListingIds",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserNftListingIds",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserProfile",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "profile",
        type: "tuple",
        internalType: "struct VaultCore.ProfileCounters",
        components: [
          {
            name: "nftListingCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "dealListingCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "boughtDealCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "loanOfferCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "dealOfferCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "lockedUSDC",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "activeLoanCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "activeDealCount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "lifetimeVolume",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "activityCount",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isAdmin",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isOfferNonceUnavailable",
    inputs: [
      {
        name: "signer",
        type: "address",
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lenderDeposits",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listNFT",
    inputs: [
      {
        name: "nftContract",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "listingCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listingEscrowBalance",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "listings",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "borrower",
        type: "address",
        internalType: "address",
      },
      {
        name: "nftContract",
        type: "address",
        internalType: "address",
      },
      {
        name: "nftTokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "principal",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "acceptedLender",
        type: "address",
        internalType: "address",
      },
      {
        name: "acceptedAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "acceptedApr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "acceptedTerm",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "fundedAt",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "repaidSoFar",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "stage",
        type: "uint8",
        internalType: "enum VaultNFT.Stage",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "offers",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "apr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "onERC721Received",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeeBps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "removeAdmin",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repay",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repayPartial",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "partialAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolve",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "nftToLender",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPlatformFee",
    inputs: [
      {
        name: "newFeeBps",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTreasury",
    inputs: [
      {
        name: "newTreasury",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitOffer",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateListing",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newApr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newTerm",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateOffer",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newApr",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newTerm",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usedOrCancelledOfferNonces",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawOffer",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "AdminAdded",
    inputs: [
      {
        name: "admin",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AdminRemoved",
    inputs: [
      {
        name: "admin",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Cancelled",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DefaultClaimed",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "nftContract",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Disputed",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Listed",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "borrower",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "nftContract",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ListingUpdated",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferAccepted",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferNonceCancelled",
    inputs: [
      {
        name: "signer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferSubmitted",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "apr",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "term",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OfferWithdrawn",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformFeeUpdated",
    inputs: [
      {
        name: "newFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Repaid",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Resolved",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "outcome",
        type: "uint8",
        indexed: false,
        internalType: "enum VaultNFT.Stage",
      },
      {
        name: "nftToLender",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SignedOfferAccepted",
    inputs: [
      {
        name: "listingId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "lender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TreasurySet",
    inputs: [
      {
        name: "oldTreasury",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newTreasury",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "UserActivityRecorded",
    inputs: [
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "activityId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "action",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "market",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "subjectId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "actor",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "counterparty",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "timestamp",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "status",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "metadataHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AlreadyOffered",
    inputs: [],
  },
  {
    type: "error",
    name: "ContractPaused",
    inputs: [],
  },
  {
    type: "error",
    name: "GracePeriodNotPassed",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidStage",
    inputs: [
      {
        name: "current",
        type: "uint8",
        internalType: "enum VaultNFT.Stage",
      },
      {
        name: "expected",
        type: "uint8",
        internalType: "enum VaultNFT.Stage",
      },
    ],
  },
  {
    type: "error",
    name: "NotAdmin",
    inputs: [],
  },
  {
    type: "error",
    name: "NotBorrower",
    inputs: [],
  },
  {
    type: "error",
    name: "NotLender",
    inputs: [],
  },
  {
    type: "error",
    name: "NotNFTOwner",
    inputs: [],
  },
  {
    type: "error",
    name: "NotParty",
    inputs: [],
  },
  {
    type: "error",
    name: "OfferExpired",
    inputs: [],
  },
  {
    type: "error",
    name: "OfferMismatch",
    inputs: [],
  },
  {
    type: "error",
    name: "OfferNonceUnavailable",
    inputs: [],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [],
  },
] as const;

export const VaultDeals_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_usdc",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_platformFeeBps",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "_admin",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AlreadyOffered",
    type: "error",
  },
  {
    inputs: [],
    name: "ContractPaused",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "enum VaultDeals.DealStage",
        name: "current",
        type: "uint8",
      },
      {
        internalType: "enum VaultDeals.DealStage",
        name: "expected",
        type: "uint8",
      },
    ],
    name: "InvalidDealStage",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignature",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAdmin",
    type: "error",
  },
  {
    inputs: [],
    name: "NotDealParty",
    type: "error",
  },
  {
    inputs: [],
    name: "OfferExpired",
    type: "error",
  },
  {
    inputs: [],
    name: "OfferNonceUnavailable",
    type: "error",
  },
  {
    inputs: [],
    name: "TransferFailed",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address",
      },
    ],
    name: "AdminAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address",
      },
    ],
    name: "AdminRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "DealCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sellerAmount",
        type: "uint256",
      },
    ],
    name: "DealConfirmed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newDeadline",
        type: "uint256",
      },
    ],
    name: "DealDeadlineExtended",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "DealDelivered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "DealDisputed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DealFunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
    ],
    name: "DealListed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DealOfferAccepted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DealOfferSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DealOfferWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "DealRefunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "buyerAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "sellerAmount",
        type: "uint256",
      },
    ],
    name: "DealResolved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "MiniAppCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
    ],
    name: "MiniAppListed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "MiniAppSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "signer",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
    ],
    name: "OfferNonceCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "Paused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "newFee",
        type: "uint256",
      },
    ],
    name: "PlatformFeeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
    ],
    name: "SignedDealOfferAccepted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "oldTreasury",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newTreasury",
        type: "address",
      },
    ],
    name: "TreasurySet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [],
    name: "Unpaused",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "activityId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "action",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "market",
        type: "uint8",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "subjectId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "actor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "counterparty",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "status",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
    ],
    name: "UserActivityRecorded",
    type: "event",
  },
  {
    inputs: [],
    name: "SIGNED_DEAL_OFFER_TYPEHASH",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
    ],
    name: "acceptDealOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "dealId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "buyer",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "expiry",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
        ],
        internalType: "struct VaultDeals.SignedDealOffer",
        name: "offer",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "acceptSignedDealOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newAdmin",
        type: "address",
      },
    ],
    name: "addAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "admins",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "miniAppId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "buyMiniApp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "cancelDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "miniAppId",
        type: "uint256",
      },
    ],
    name: "cancelMiniApp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
    ],
    name: "cancelOfferNonce",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[]",
        name: "nonces",
        type: "uint256[]",
      },
    ],
    name: "cancelOfferNonces",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "confirmDelivery",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "dealCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "dealEscrowBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "dealKinds",
    outputs: [
      {
        internalType: "enum VaultDeals.DealKind",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "dealOfferDeposits",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "deals",
    outputs: [
      {
        internalType: "address",
        name: "seller",
        type: "address",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
      {
        internalType: "enum VaultDeals.DealStage",
        name: "stage",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "buyerAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sellerAmount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "disputeDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "extendDeadline",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "fundDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "buyer",
        type: "address",
      },
    ],
    name: "getDealOffer",
    outputs: [
      {
        internalType: "uint256",
        name: "deposit",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "active",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "getDealOfferBuyers",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "getDealOfferCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "getDealSummary",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            components: [
              {
                internalType: "address",
                name: "seller",
                type: "address",
              },
              {
                internalType: "address",
                name: "buyer",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "price",
                type: "uint256",
              },
              {
                internalType: "bytes32",
                name: "metadataHash",
                type: "bytes32",
              },
              {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "createdAt",
                type: "uint256",
              },
              {
                internalType: "enum VaultDeals.DealStage",
                name: "stage",
                type: "uint8",
              },
              {
                internalType: "uint256",
                name: "buyerAmount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "sellerAmount",
                type: "uint256",
              },
            ],
            internalType: "struct VaultDeals.Deal",
            name: "deal",
            type: "tuple",
          },
          {
            internalType: "enum VaultDeals.DealKind",
            name: "kind",
            type: "uint8",
          },
          {
            internalType: "uint256",
            name: "miniAppId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "escrowBalance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "offerCount",
            type: "uint256",
          },
        ],
        internalType: "struct VaultDeals.DealSummary",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getDeals",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            components: [
              {
                internalType: "address",
                name: "seller",
                type: "address",
              },
              {
                internalType: "address",
                name: "buyer",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "price",
                type: "uint256",
              },
              {
                internalType: "bytes32",
                name: "metadataHash",
                type: "bytes32",
              },
              {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "createdAt",
                type: "uint256",
              },
              {
                internalType: "enum VaultDeals.DealStage",
                name: "stage",
                type: "uint8",
              },
              {
                internalType: "uint256",
                name: "buyerAmount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "sellerAmount",
                type: "uint256",
              },
            ],
            internalType: "struct VaultDeals.Deal",
            name: "deal",
            type: "tuple",
          },
          {
            internalType: "enum VaultDeals.DealKind",
            name: "kind",
            type: "uint8",
          },
          {
            internalType: "uint256",
            name: "miniAppId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "escrowBalance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "offerCount",
            type: "uint256",
          },
        ],
        internalType: "struct VaultDeals.DealSummary[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "miniAppId",
        type: "uint256",
      },
    ],
    name: "getMiniAppDeal",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            components: [
              {
                internalType: "address",
                name: "seller",
                type: "address",
              },
              {
                internalType: "address",
                name: "buyer",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "price",
                type: "uint256",
              },
              {
                internalType: "bytes32",
                name: "metadataHash",
                type: "bytes32",
              },
              {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "createdAt",
                type: "uint256",
              },
              {
                internalType: "enum VaultDeals.DealStage",
                name: "stage",
                type: "uint8",
              },
              {
                internalType: "uint256",
                name: "buyerAmount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "sellerAmount",
                type: "uint256",
              },
            ],
            internalType: "struct VaultDeals.Deal",
            name: "deal",
            type: "tuple",
          },
          {
            internalType: "enum VaultDeals.DealKind",
            name: "kind",
            type: "uint8",
          },
          {
            internalType: "uint256",
            name: "miniAppId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "escrowBalance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "offerCount",
            type: "uint256",
          },
        ],
        internalType: "struct VaultDeals.DealSummary",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserActivities",
    outputs: [
      {
        components: [
          {
            internalType: "uint8",
            name: "action",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "market",
            type: "uint8",
          },
          {
            internalType: "uint256",
            name: "subjectId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "actor",
            type: "address",
          },
          {
            internalType: "address",
            name: "counterparty",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "status",
            type: "uint8",
          },
          {
            internalType: "bytes32",
            name: "metadataHash",
            type: "bytes32",
          },
        ],
        internalType: "struct VaultCore.Activity[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserBoughtDealIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserDealIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserDealOfferIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserLoanOfferListingIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getUserNftListingIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserProfile",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "nftListingCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "dealListingCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "boughtDealCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "loanOfferCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "dealOfferCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lockedUSDC",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "activeLoanCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "activeDealCount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "lifetimeVolume",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "activityCount",
            type: "uint256",
          },
        ],
        internalType: "struct VaultCore.ProfileCounters",
        name: "profile",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "isAdmin",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "signer",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
    ],
    name: "isOfferNonceUnavailable",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
    ],
    name: "listDeal",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
      {
        internalType: "enum VaultDeals.DealKind",
        name: "kind",
        type: "uint8",
      },
    ],
    name: "listDealWithKind",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "price",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "metadataHash",
        type: "bytes32",
      },
    ],
    name: "listMiniApp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "markDelivered",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "miniAppCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeeBps",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "refundDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "target",
        type: "address",
      },
    ],
    name: "removeAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "buyerAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "sellerAmount",
        type: "uint256",
      },
    ],
    name: "resolveDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newFeeBps",
        type: "uint256",
      },
    ],
    name: "setPlatformFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newTreasury",
        type: "address",
      },
    ],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "submitDealOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newPrice",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "newMetadataHash",
        type: "bytes32",
      },
    ],
    name: "updateDeal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "miniAppId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newPrice",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "newMetadataHash",
        type: "bytes32",
      },
    ],
    name: "updateMiniApp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "usdc",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "usedOrCancelledOfferNonces",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "dealId",
        type: "uint256",
      },
    ],
    name: "withdrawDealOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
