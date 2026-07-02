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
    inputs: [],
    name: "GracePeriodNotPassed",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidSignature",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "enum VaultNFT.Stage",
        name: "current",
        type: "uint8",
      },
      {
        internalType: "enum VaultNFT.Stage",
        name: "expected",
        type: "uint8",
      },
    ],
    name: "InvalidStage",
    type: "error",
  },
  {
    inputs: [],
    name: "NotAdmin",
    type: "error",
  },
  {
    inputs: [],
    name: "NotBorrower",
    type: "error",
  },
  {
    inputs: [],
    name: "NotLender",
    type: "error",
  },
  {
    inputs: [],
    name: "NotNFTOwner",
    type: "error",
  },
  {
    inputs: [],
    name: "NotParty",
    type: "error",
  },
  {
    inputs: [],
    name: "OfferExpired",
    type: "error",
  },
  {
    inputs: [],
    name: "OfferMismatch",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "Cancelled",
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
        name: "lender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "nftContract",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "DefaultClaimed",
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
    name: "Disputed",
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
        name: "borrower",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "nftContract",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
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
        name: "apr",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
    ],
    name: "Listed",
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
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "apr",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
    ],
    name: "ListingUpdated",
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
        name: "lender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "OfferAccepted",
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
        name: "lender",
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
        name: "apr",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
    ],
    name: "OfferSubmitted",
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
        name: "lender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "OfferWithdrawn",
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
        name: "listingId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Repaid",
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
        internalType: "enum VaultNFT.Stage",
        name: "outcome",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "nftToLender",
        type: "bool",
      },
    ],
    name: "Resolved",
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
        indexed: true,
        internalType: "address",
        name: "lender",
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
    name: "SignedOfferAccepted",
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
    name: "GRACE_PERIOD",
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
    name: "SIGNED_LOAN_OFFER_TYPEHASH",
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
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "lender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "acceptedAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "acceptedApr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "acceptedTerm",
        type: "uint256",
      },
    ],
    name: "acceptOffer",
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
            name: "listingId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "lender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "apr",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "term",
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
        internalType: "struct VaultNFT.SignedLoanOffer",
        name: "offer",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "acceptSignedOffer",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "cancelListing",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "claimCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "dispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "getDeadline",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "getListingSummary",
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
                name: "borrower",
                type: "address",
              },
              {
                internalType: "address",
                name: "nftContract",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "nftTokenId",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "principal",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "apr",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "term",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "acceptedLender",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "acceptedAmount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "acceptedApr",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "acceptedTerm",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "fundedAt",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "repaidSoFar",
                type: "uint256",
              },
              {
                internalType: "enum VaultNFT.Stage",
                name: "stage",
                type: "uint8",
              },
            ],
            internalType: "struct VaultNFT.Listing",
            name: "listing",
            type: "tuple",
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
          {
            internalType: "uint256",
            name: "totalDue",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "paid",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "remaining",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType: "struct VaultNFT.ListingSummary",
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
    name: "getListings",
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
                name: "borrower",
                type: "address",
              },
              {
                internalType: "address",
                name: "nftContract",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "nftTokenId",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "principal",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "apr",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "term",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "acceptedLender",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "acceptedAmount",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "acceptedApr",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "acceptedTerm",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "fundedAt",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "repaidSoFar",
                type: "uint256",
              },
              {
                internalType: "enum VaultNFT.Stage",
                name: "stage",
                type: "uint8",
              },
            ],
            internalType: "struct VaultNFT.Listing",
            name: "listing",
            type: "tuple",
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
          {
            internalType: "uint256",
            name: "totalDue",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "paid",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "remaining",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType: "struct VaultNFT.ListingSummary[]",
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
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "lender",
        type: "address",
      },
    ],
    name: "getLoanOffer",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "apr",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "term",
            type: "uint256",
          },
        ],
        internalType: "struct VaultNFT.Offer",
        name: "offer",
        type: "tuple",
      },
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "getOfferCount",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "getOfferLenders",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "getRepaymentDue",
    outputs: [
      {
        internalType: "uint256",
        name: "totalDue",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "paid",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "remaining",
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
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "lenderDeposits",
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
        name: "nftContract",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "apr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
    ],
    name: "listNFT",
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
    inputs: [],
    name: "listingCount",
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
    name: "listingEscrowBalance",
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
    name: "listings",
    outputs: [
      {
        internalType: "address",
        name: "borrower",
        type: "address",
      },
      {
        internalType: "address",
        name: "nftContract",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "nftTokenId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "principal",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "apr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "acceptedLender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "acceptedAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "acceptedApr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "acceptedTerm",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fundedAt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "repaidSoFar",
        type: "uint256",
      },
      {
        internalType: "enum VaultNFT.Stage",
        name: "stage",
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
    name: "offers",
    outputs: [
      {
        internalType: "uint256",
        name: "apr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "term",
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
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "onERC721Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "pure",
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
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "repay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "partialAmount",
        type: "uint256",
      },
    ],
    name: "repayPartial",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "nftToLender",
        type: "bool",
      },
    ],
    name: "resolve",
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
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "apr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "term",
        type: "uint256",
      },
    ],
    name: "submitOffer",
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
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newApr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newTerm",
        type: "uint256",
      },
    ],
    name: "updateListing",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "listingId",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newApr",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newTerm",
        type: "uint256",
      },
    ],
    name: "updateOffer",
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
        name: "listingId",
        type: "uint256",
      },
    ],
    name: "withdrawOffer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
