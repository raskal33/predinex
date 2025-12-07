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
import GauntletArtifact from './abis/Gauntlet.json'; // Legacy alias

// Extract ABI arrays from artifacts (ABI files are arrays directly, not objects with .abi property)
const PredinexTokenABI = PredinexTokenArtifact as any;
const PrixFaucetABI = PrixFaucetArtifact as any;
const GuidedOracleABI = GuidedOracleArtifact as any;
const OptimisticOracleABI = OptimisticOracleArtifact as any;
const PredinexDiamondABI = PredinexDiamondArtifact as any; // Diamond ABI (master ABI with all facets)
const PredinexPoolCoreABI = PredinexPoolCoreArtifact as any; // Legacy fallback
const PredinexBoostSystemABI = PredinexBoostSystemArtifact as any;
const PredinexComboPoolsABI = PredinexComboPoolsArtifact as any;
const PredinexPoolFactoryABI = PredinexPoolFactoryArtifact as any;
const PredinexStakingABI = PredinexStakingArtifact as any;
const ReputationSystemABI = ReputationSystemArtifact as any;
const OddysseyABI = OddysseyArtifact as any; // Updated Oddyssey ABI
const GauntletABI = GauntletArtifact as any; // Legacy alias (may be same as Oddyssey)

// Contract configurations - Updated for Modular Architecture
export const CONTRACTS = {
  // Core Contracts
  PRIX_TOKEN: {
    address: CONTRACT_ADDRESSES.PRIX_TOKEN,
    abi: PredinexTokenABI,
  },
  POOL_CORE: {
    address: CONTRACT_ADDRESSES.POOL_CORE,
    abi: PredinexDiamondABI, // Use Diamond ABI (includes all facet functions)
  },
  PREDINEX_DIAMOND: {
    address: CONTRACT_ADDRESSES.PREDINEX_DIAMOND,
    abi: PredinexDiamondABI, // Main Diamond proxy
  },
  BOOST_SYSTEM: {
    address: CONTRACT_ADDRESSES.BOOST_SYSTEM,
    abi: PredinexBoostSystemABI,
  },
  COMBO_POOLS: {
    address: CONTRACT_ADDRESSES.COMBO_POOLS,
    abi: PredinexComboPoolsABI,
  },
  FACTORY: {
    address: CONTRACT_ADDRESSES.FACTORY,
    abi: PredinexPoolFactoryABI,
  },

  // Oracle Contracts
  GUIDED_ORACLE: {
    address: CONTRACT_ADDRESSES.GUIDED_ORACLE,
    abi: GuidedOracleABI,
  },
  OPTIMISTIC_ORACLE: {
    address: CONTRACT_ADDRESSES.OPTIMISTIC_ORACLE,
    abi: OptimisticOracleABI,
  },

  // System Contracts
  REPUTATION_SYSTEM: {
    address: CONTRACT_ADDRESSES.REPUTATION_SYSTEM,
    abi: ReputationSystemABI,
  },
  STAKING_CONTRACT: {
    address: CONTRACT_ADDRESSES.STAKING_CONTRACT,
    abi: PredinexStakingABI,
  },
  FAUCET: {
    address: CONTRACT_ADDRESSES.FAUCET,
    abi: PrixFaucetABI,
  },
  ODDYSSEY: {
    address: CONTRACT_ADDRESSES.ODDYSSEY,
    abi: OddysseyABI, // Updated Oddyssey ABI
  },
  GAUNTLET: {
    address: CONTRACT_ADDRESSES.ODDYSSEY, // Legacy alias - same as Oddyssey
    abi: OddysseyABI, // Use Oddyssey ABI instead of legacy Gauntlet
  },

  // Legacy support (for backward compatibility) - DEPRECATED: Use POOL_CORE instead
  PREDINEX_POOL: {
    address: CONTRACT_ADDRESSES.PREDINEX_POOL, // DEPRECATED: Use POOL_CORE (points to Diamond)
    abi: PredinexDiamondABI, // DEPRECATED: Use POOL_CORE.abi (now Diamond ABI)
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
  GauntletABI, // Legacy alias
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
  GAUNTLET: {
    // Legacy alias - same as ODDYSSEY
    SLIP_PURCHASED: 'SlipPurchased',
    GAME_SETTLED: 'GameSettled',
    WINNINGS_CLAIMED: 'WinningsClaimed',
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
