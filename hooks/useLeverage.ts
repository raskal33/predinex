/**
 * Hook for managing leverage positions and calculations
 */

import { useReadContract } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { formatEther } from 'viem';
import { useMemo, useCallback } from 'react';

export type LeverageMultiplier = 1 | 2 | 3 | 4 | 5;

export interface LeverageInfo {
  multiplier: LeverageMultiplier;
  maxBettorStake: bigint;
  formattedMaxBettorStake: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Calculate max bettor stake with leverage
 * Formula: maxBettorStake = (creatorStake * 100) / ((odds - 100) * leverage)
 */
export function calculateMaxBettorStake(
  creatorStake: bigint,
  odds: bigint,
  leverage: LeverageMultiplier
): bigint {
  if (odds <= 100n || leverage < 1 || leverage > 5) {
    return 0n;
  }
  
  const numerator = creatorStake * 100n;
  const denominator = (odds - 100n) * BigInt(leverage);
  
  return numerator / denominator;
}

/**
 * Get risk level based on leverage
 */
export function getLeverageRiskLevel(leverage: LeverageMultiplier): LeverageInfo['riskLevel'] {
  if (leverage <= 2) return 'LOW';
  if (leverage <= 3) return 'MEDIUM';
  return 'HIGH';
}

export function useLeverage(poolId?: bigint) {
  // Get pool leverage if poolId provided
  const { data: poolData } = useReadContract({
    address: CONTRACT_ADDRESSES.PREDINEX_POOL,
    abi: CONTRACTS.POOL_CORE.abi,
    functionName: 'getPool',
    args: poolId ? [poolId] : undefined,
    query: { enabled: !!poolId },
  });

  const leverageInfo: LeverageInfo | null = useMemo(() => {
    if (!poolData || !poolId) return null;
    
    const pool = poolData as any;
    const leverage = Number(pool.leverage) as LeverageMultiplier;
    const creatorStake = pool.creatorStake as bigint;
    const odds = BigInt(pool.odds);
    
    const maxBettorStake = calculateMaxBettorStake(creatorStake, odds, leverage);
    
    return {
      multiplier: leverage,
      maxBettorStake,
      formattedMaxBettorStake: formatEther(maxBettorStake),
      riskLevel: getLeverageRiskLevel(leverage),
    };
  }, [poolData, poolId]);

  /**
   * Calculate leverage info for a new pool
   */
  const calculateLeverageForPool = useCallback((
    creatorStake: bigint,
    odds: bigint,
    leverage: LeverageMultiplier
  ): LeverageInfo => {
    const maxBettorStake = calculateMaxBettorStake(creatorStake, odds, leverage);
    
    return {
      multiplier: leverage,
      maxBettorStake,
      formattedMaxBettorStake: formatEther(maxBettorStake),
      riskLevel: getLeverageRiskLevel(leverage),
    };
  }, []);

  return {
    leverageInfo,
    calculateLeverageForPool,
    getLeverageRiskLevel,
    calculateMaxBettorStake,
  };
}

