export interface FaucetClaim {
  hasClaimed: boolean;
  amount?: string;
  claimedAt?: string;
  hadPriorBNBActivity: boolean;
  bnbActivityCountBeforeFaucet: number;
}

export interface AirdropRequirements {
  faucetClaim: boolean;
  bnbActivityBeforeFaucet: boolean;
  prixActions: {
    current: number;
    required: number;
    met: boolean;
  };
  stakingActivity: boolean;
  oddysseySlips: {
    current: number;
    required: number;
    met: boolean;
  };
}

export interface SybilFlags {
  suspiciousTransfers: boolean;
  transferOnlyRecipient: boolean;
  consolidationDetected: boolean;
  hasSybilActivity: boolean;
}

export interface ActivityBreakdown {
  poolCreations: number;
  betsPlaced: number;
  stakingActions: number;
  firstPRIXActivity?: string;
  lastPRIXActivity?: string;
}

export interface AirdropInfo {
  snapshotBalance?: string;
  airdropAmount?: string;
  snapshotTakenAt?: string;
}

export interface UserEligibility {
  address: string;
  isEligible: boolean;
  eligibilityStatus: 'eligible' | 'not_eligible' | 'pending_calculation' | 'no_faucet_claim';
  lastUpdated?: string;
  faucetClaim: FaucetClaim;
  requirements: AirdropRequirements;
  sybilFlags: SybilFlags;
  activityBreakdown: ActivityBreakdown;
  airdropInfo?: AirdropInfo | null;
  nextSteps: string[];
}

export interface AirdropStatistics {
  overview: {
    totalFaucetClaims: number;
    totalEligible: number;
    eligibilityRate: number;
    totalEligiblePRIX: string;
    totalAirdropAllocated: string;
    suspiciousWallets: number;
    averagePRIXActions: string;
    averageOddysseySlips: string;
  };
  requirementFunnel: {
    claimedFaucet: number;
    hadBNBActivity: number;
    sufficientPRIXActions: number;
    hasStaking: number;
    sufficientOddyssey: number;
    fullyEligible: number;
  };
  recentActivity: Array<{
    claim_date: string;
    claims_count: number;
  }>;
  latestSnapshot?: {
    name: string;
    blockNumber: number;
    timestamp: string;
    eligibleWallets: number;
    totalEligiblePRIX: string;
    isFinal: boolean;
  } | null;
  constants: {
    totalAirdropPool: string;
    faucetAmountPerUser: string;
    requirements: {
      bnbActivityBeforeFaucet: boolean;
      minPRIXActions: number;
      stakingRequired: boolean;
      minOddysseySlips: number;
    };
  };
}

export interface FaucetClaimRequest {
  userAddress: string;
  signature?: string; // For verification if needed
}

export interface FaucetClaimResponse {
  success: boolean;
  transactionHash?: string;
  message: string;
  error?: string;
} 