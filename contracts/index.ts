import { CONTRACT_ADDRESSES } from '@/config/wagmi';

// Import ABIs - Updated for Modular Architecture
import PrixedictTokenArtifact from './abis/PrixedictToken.json';
import PrixFaucetArtifact from './abis/PrixFaucet.json';
import GuidedOracleArtifact from './abis/GuidedOracle.json';
import OptimisticOracleArtifact from './abis/OptimisticOracle.json';
import PrixedictPoolCoreArtifact from './abis/PrixedictPoolCore.json';
import PrixedictBoostSystemArtifact from './abis/PrixedictBoostSystem.json';
import PrixedictComboPoolsArtifact from './abis/PrixedictComboPools.json';
import PrixedictPoolFactoryArtifact from './abis/PrixedictPoolFactory.json';
import PrixedictStakingArtifact from './abis/PrixedictStaking.json';
import ReputationSystemArtifact from './abis/ReputationSystem.json';
import OddysseyArtifact from './abis/Oddyssey.json';

// Extract ABI arrays from artifacts (ABI files are arrays directly, not objects with .abi property)
const PrixedictTokenABI = PrixedictTokenArtifact as any;
const PrixFaucetABI = PrixFaucetArtifact as any;
const GuidedOracleABI = GuidedOracleArtifact as any;
const OptimisticOracleABI = OptimisticOracleArtifact as any;
const PrixedictPoolCoreABI = PrixedictPoolCoreArtifact as any;
const PrixedictBoostSystemABI = PrixedictBoostSystemArtifact as any;
const PrixedictComboPoolsABI = PrixedictComboPoolsArtifact as any;
const PrixedictPoolFactoryABI = PrixedictPoolFactoryArtifact as any;
const PrixedictStakingABI = PrixedictStakingArtifact as any;
const ReputationSystemABI = ReputationSystemArtifact as any;
const OddysseyABI = OddysseyArtifact as any;

// Contract configurations - Updated for Modular Architecture
export const CONTRACTS = {
  // Core Contracts
  PRIX_TOKEN: {
    address: CONTRACT_ADDRESSES.PRIX_TOKEN,
    abi: PrixedictTokenABI,
  },
  POOL_CORE: {
    address: CONTRACT_ADDRESSES.POOL_CORE,
    abi: PrixedictPoolCoreABI,
  },
  BOOST_SYSTEM: {
    address: CONTRACT_ADDRESSES.BOOST_SYSTEM,
    abi: PrixedictBoostSystemABI,
  },
  COMBO_POOLS: {
    address: CONTRACT_ADDRESSES.COMBO_POOLS,
    abi: PrixedictComboPoolsABI,
  },
  FACTORY: {
    address: CONTRACT_ADDRESSES.FACTORY,
    abi: PrixedictPoolFactoryABI,
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
    abi: PrixedictStakingABI,
  },
  FAUCET: {
    address: CONTRACT_ADDRESSES.FAUCET,
    abi: PrixFaucetABI,
  },
  ODDYSSEY: {
    address: CONTRACT_ADDRESSES.ODDYSSEY,
    abi: OddysseyABI,
  },
  
  // Legacy support (for backward compatibility) - DEPRECATED: Use POOL_CORE instead
  PRIXEDICT_POOL: {
    address: CONTRACT_ADDRESSES.PRIXEDICT_POOL, // DEPRECATED: Use POOL_CORE
    abi: PrixedictPoolCoreABI, // DEPRECATED: Use POOL_CORE.abi
  },
  PRIXEDICT_STAKING: {
    address: CONTRACT_ADDRESSES.PRIXEDICT_STAKING,
    abi: PrixedictStakingABI,
  },
} as const;

// Export contract addresses and ABIs for direct use
export { CONTRACT_ADDRESSES } from '@/config/wagmi';
export {
  PrixedictTokenABI,
  PrixFaucetABI,
  GuidedOracleABI,
  OptimisticOracleABI,
  PrixedictPoolCoreABI,
  PrixedictBoostSystemABI,
  PrixedictComboPoolsABI,
  PrixedictPoolFactoryABI,
  PrixedictStakingABI,
  ReputationSystemABI,
  OddysseyABI,
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
    WINNINGS_CLAIMED: 'WinningsClaimed',
    REPUTATION_ACTION_OCCURRED: 'ReputationActionOccurred',
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
  },
  
  // Legacy events (for backward compatibility)
  PRIXEDICT_POOL: {
    POOL_CREATED: 'PoolCreated',
    BET_PLACED: 'BetPlaced',
    POOL_SETTLED: 'PoolSettled',
    WINNINGS_CLAIMED: 'WinningsClaimed',
  },
  PRIXEDICT_STAKING: {
    STAKED: 'Staked',
    UNSTAKED: 'Unstaked',
    REWARDS_CLAIMED: 'RewardsClaimed',
    TIER_UPGRADED: 'TierUpgraded',
  },
} as const;
