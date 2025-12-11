import { CONTRACT_ADDRESSES } from '@/config/wagmi';

// Import ABIs - Updated for Diamond Pattern Architecture
import PredinexTokenArtifact from './abis/PredinexToken.json';
import PrixFaucetArtifact from './abis/PrixFaucet.json';
import GuidedOracleArtifact from './abis/GuidedOracle.json';
import OptimisticOracleArtifact from './abis/OptimisticOracle.json';
import PredinexDiamondArtifact from './abis/PredinexDiamond.json'; // Diamond ABI (replaces PoolCore)
import PredinexPoolCoreArtifact from './abis/PredinexPoolCore.json'; // Legacy fallback
import PredinexBoostSystemArtifact from './abis/PredinexBoostSystem.json';
import PredinexComboPoolsArtifact from './abis/PredinexComboPools.json';
import PredinexPoolFactoryArtifact from './abis/PredinexPoolFactory.json';
import PredinexStakingArtifact from './abis/PredinexStaking.json';
import ReputationSystemArtifact from './abis/ReputationSystem.json';
import OddysseyArtifact from './abis/Oddyssey.json'; // Updated Oddyssey ABI
import PredinexH2HArtifact from './abis/PredinexH2H.json';

// Extract ABI arrays from artifacts - handle both formats:
// 1. Direct array: [ {...}, {...} ]
// 2. Object with .abi property: { "abi": [ {...}, {...} ] }
const extractABI = (artifact: any): any[] => {
  if (Array.isArray(artifact)) {
    return artifact; // Already an array
  }
  if (artifact && typeof artifact === 'object' && Array.isArray(artifact.abi)) {
    return artifact.abi; // Extract from .abi property
  }
  // ✅ FIX: If we can't extract, log error and return empty array to prevent runtime errors
  console.error('⚠️ Failed to extract ABI from artifact:', {
    isArray: Array.isArray(artifact),
    hasAbi: !!(artifact && typeof artifact === 'object' && artifact.abi),
    abiIsArray: !!(artifact && typeof artifact === 'object' && Array.isArray(artifact.abi)),
    artifactKeys: artifact && typeof artifact === 'object' ? Object.keys(artifact) : 'not an object',
  });
  return []; // Return empty array to prevent "filter is not a function" errors
};

const PredinexTokenABI = extractABI(PredinexTokenArtifact);
const PrixFaucetABI = extractABI(PrixFaucetArtifact);
const GuidedOracleABI = extractABI(GuidedOracleArtifact);
const OptimisticOracleABI = extractABI(OptimisticOracleArtifact);
const PredinexDiamondABI = extractABI(PredinexDiamondArtifact); // Diamond ABI (master ABI with all facets)
const PredinexPoolCoreABI = extractABI(PredinexPoolCoreArtifact); // Legacy fallback
const PredinexBoostSystemABI = extractABI(PredinexBoostSystemArtifact);
const PredinexComboPoolsABI = extractABI(PredinexComboPoolsArtifact);
const PredinexPoolFactoryABI = extractABI(PredinexPoolFactoryArtifact);
const PredinexStakingABI = extractABI(PredinexStakingArtifact);
const ReputationSystemABI = extractABI(ReputationSystemArtifact);
const OddysseyABI = extractABI(OddysseyArtifact); // Updated Oddyssey ABI
const PredinexH2HABI = extractABI(PredinexH2HArtifact);

// ✅ Runtime validation: Ensure all ABIs are arrays
const validateABI = (abi: any, name: string): any[] => {
  if (!Array.isArray(abi)) {
    console.error(`❌ CRITICAL: ${name} ABI is not an array! Type: ${typeof abi}, Value:`, abi);
    return [];
  }
  return abi;
};

// Contract configurations - Updated for Modular Architecture
export const CONTRACTS = {
  // Core Contracts
  PRIX_TOKEN: {
    address: CONTRACT_ADDRESSES.PRIX_TOKEN,
    abi: validateABI(PredinexTokenABI, 'PRIX_TOKEN'),
  },
  POOL_CORE: {
    address: CONTRACT_ADDRESSES.POOL_CORE,
    abi: validateABI(PredinexDiamondABI, 'POOL_CORE'), // Use Diamond ABI (includes all facet functions)
  },
  PREDINEX_DIAMOND: {
    address: CONTRACT_ADDRESSES.PREDINEX_DIAMOND,
    abi: validateABI(PredinexDiamondABI, 'PREDINEX_DIAMOND'), // Main Diamond proxy
  },
  BOOST_SYSTEM: {
    address: CONTRACT_ADDRESSES.BOOST_SYSTEM,
    abi: validateABI(PredinexBoostSystemABI, 'BOOST_SYSTEM'),
  },
  COMBO_POOLS: {
    address: CONTRACT_ADDRESSES.COMBO_POOLS,
    abi: validateABI(PredinexComboPoolsABI, 'COMBO_POOLS'),
  },
  FACTORY: {
    address: CONTRACT_ADDRESSES.FACTORY,
    abi: validateABI(PredinexPoolFactoryABI, 'FACTORY'),
  },

  // Oracle Contracts
  GUIDED_ORACLE: {
    address: CONTRACT_ADDRESSES.GUIDED_ORACLE,
    abi: validateABI(GuidedOracleABI, 'GUIDED_ORACLE'),
  },
  OPTIMISTIC_ORACLE: {
    address: CONTRACT_ADDRESSES.OPTIMISTIC_ORACLE,
    abi: validateABI(OptimisticOracleABI, 'OPTIMISTIC_ORACLE'),
  },

  // System Contracts
  REPUTATION_SYSTEM: {
    address: CONTRACT_ADDRESSES.REPUTATION_SYSTEM,
    abi: validateABI(ReputationSystemABI, 'REPUTATION_SYSTEM'),
  },
  STAKING_CONTRACT: {
    address: CONTRACT_ADDRESSES.STAKING_CONTRACT,
    abi: validateABI(PredinexStakingABI, 'STAKING_CONTRACT'),
  },
  FAUCET: {
    address: CONTRACT_ADDRESSES.FAUCET,
    abi: validateABI(PrixFaucetABI, 'FAUCET'),
  },
  ODDYSSEY: {
    address: CONTRACT_ADDRESSES.ODDYSSEY,
    abi: validateABI(OddysseyABI, 'ODDYSSEY'), // Updated Oddyssey ABI
  },
  H2H: {
    address: CONTRACT_ADDRESSES.H2H,
    abi: validateABI(PredinexH2HABI, 'H2H'),
  },

  // Legacy support (for backward compatibility) - DEPRECATED: Use POOL_CORE instead
  PREDINEX_POOL: {
    address: CONTRACT_ADDRESSES.PREDINEX_POOL, // DEPRECATED: Use POOL_CORE (points to Diamond)
    abi: validateABI(PredinexDiamondABI, 'PREDINEX_POOL'), // DEPRECATED: Use POOL_CORE.abi (now Diamond ABI)
  },
  PREDINEX_STAKING: {
    address: CONTRACT_ADDRESSES.PREDINEX_STAKING,
    abi: PredinexStakingABI,
  },
} as const;

// Export contract addresses and ABIs for direct use
export { CONTRACT_ADDRESSES } from '@/config/wagmi';
export {
  PredinexTokenABI,
  PrixFaucetABI,
  GuidedOracleABI,
  OptimisticOracleABI,
  PredinexDiamondABI, // Diamond ABI (master ABI)
  PredinexPoolCoreABI, // Legacy fallback
  PredinexBoostSystemABI,
  PredinexComboPoolsABI,
  PredinexPoolFactoryABI,
  PredinexStakingABI,
  ReputationSystemABI,
  OddysseyABI, // Updated Oddyssey ABI
};

// Contract events - Updated for Modular Architecture
export const CONTRACT_EVENTS = {
  // Core Contract Events
  PRIX_TOKEN: {
    TRANSFER: 'Transfer',
    APPROVAL: 'Approval',
  },
  POOL_CORE: {
    POOL_CREATED: 'PoolCreated',
    BET_PLACED: 'BetPlaced',
    POOL_SETTLED: 'PoolSettled',
    WINNINGS_CLAIMED: 'RewardClaimed', // Updated event name
    REPUTATION_ACTION_OCCURRED: 'ReputationActionOccurred',
    CREATOR_YIELD_CALCULATED: 'CreatorYieldCalculated', // New event
    CREATOR_YIELD_CLAIMED: 'CreatorYieldClaimed', // New event
    CREATOR_FEE_ACCRUED: 'CreatorFeeAccrued', // New event
    CREATOR_FEE_CLAIMED: 'CreatorFeeClaimed', // New event
    POOL_LISTED_FOR_SALE: 'PoolListedForSale', // Early cashout
    POOL_OWNERSHIP_TRANSFERRED: 'PoolOwnershipTransferred', // Early cashout
    BETTOR_POSITION_LISTED_FOR_SALE: 'BettorPositionListedForSale', // Early cashout
    BETTOR_POSITION_TRANSFERRED: 'BettorPositionTransferred', // Early cashout
    LIQUIDITY_ADDED: 'LiquidityAdded',
    LIQUIDITY_WITHDRAWN: 'LiquidityWithdrawn',
    POOL_REFUNDED: 'PoolRefunded',
  },
  BOOST_SYSTEM: {
    POOL_BOOSTED: 'PoolBoosted',
    BOOST_EXPIRED: 'BoostExpired',
  },
  COMBO_POOLS: {
    COMBO_POOL_CREATED: 'ComboPoolCreated',
    COMBO_BET_PLACED: 'ComboBetPlaced',
    COMBO_POOL_SETTLED: 'ComboPoolSettled',
  },
  FACTORY: {
    POOL_CREATED_WITH_BOOST: 'PoolCreatedWithBoost',
    BATCH_POOLS_CREATED: 'BatchPoolsCreated',
  },

  // Oracle Contract Events
  GUIDED_ORACLE: {
    OUTCOME_SUBMITTED: 'OutcomeSubmitted',
    OUTCOME_UPDATED: 'OutcomeUpdated',
  },
  OPTIMISTIC_ORACLE: {
    MARKET_CREATED: 'MarketCreated',
    OUTCOME_PROPOSED: 'OutcomeProposed',
    OUTCOME_DISPUTED: 'OutcomeDisputed',
    MARKET_RESOLVED: 'MarketResolved',
  },

  // System Contract Events
  REPUTATION_SYSTEM: {
    REPUTATION_UPDATED: 'ReputationUpdated',
    TIER_UPGRADED: 'TierUpgraded',
    VERIFICATION_GRANTED: 'VerificationGranted',
    VERIFICATION_REVOKED: 'VerificationRevoked',
  },
  STAKING_CONTRACT: {
    STAKED: 'Staked',
    UNSTAKED: 'Unstaked',
    REWARDS_CLAIMED: 'RewardsClaimed',
    TIER_UPGRADED: 'TierUpgraded',
  },
  FAUCET: {
    FAUCET_CLAIMED: 'FaucetClaimed',
    COOLDOWN_SET: 'CooldownSet',
  },
  ODDYSSEY: {
    SLIP_PURCHASED: 'SlipPurchased',
    GAME_SETTLED: 'GameSettled',
    WINNINGS_CLAIMED: 'WinningsClaimed',
    CYCLE_STARTED: 'CycleStarted',
    CYCLE_ENDED: 'CycleEnded',
  },

  // Legacy events (for backward compatibility)
  PREDINEX_POOL: {
    POOL_CREATED: 'PoolCreated',
    BET_PLACED: 'BetPlaced',
    POOL_SETTLED: 'PoolSettled',
    WINNINGS_CLAIMED: 'WinningsClaimed',
  },
  PREDINEX_STAKING: {
    STAKED: 'Staked',
    UNSTAKED: 'Unstaked',
    REWARDS_CLAIMED: 'RewardsClaimed',
    TIER_UPGRADED: 'TierUpgraded',
  },
} as const;
