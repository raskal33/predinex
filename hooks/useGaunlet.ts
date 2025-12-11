import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { parseUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { gaunletService, type GaunletPool, type GaunletSlip } from '@/services/gaunletService';
import { transformContractData } from '@/utils/bigint-serializer';

export enum BetType {
  MONEYLINE = 0,
  OVER_UNDER = 1
}

export enum MoneylineResult {
  NotSet = 0,
  HomeWin = 1,
  Draw = 2,
  AwayWin = 3
}

export enum OverUnderResult {
  NotSet = 0,
  Over = 1,
  Under = 2
}

export enum PoolState {
  NotCreated = 0,
  Active = 1,
  Ended = 2,
  Resolved = 3,
  Settled = 4
}

export interface Match {
  id: bigint;
  startTime: bigint;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  oddsOver: number;
  oddsUnder: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  result?: {
    moneyline: MoneylineResult;
    overUnder: OverUnderResult;
  };
}

export interface UserPrediction {
  matchId: bigint;
  betType: BetType;
  selection: string; // "1", "X", "2", "Over", "Under"
  selectedOdd: number;
}

export function useGaunlet() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Read pool count
  const { data: poolCount, refetch: refetchPoolCount } = useReadContract({
    ...CONTRACTS.GAUNLET,
    functionName: 'poolCount',
    query: {
      select: (data: unknown) => transformContractData(data),
    },
  });

  // Query all pools
  const { data: pools, refetch: refetchPools } = useQuery({
    queryKey: ['gaunlet-pools'],
    queryFn: async () => {
      return await gaunletService.getAllPools();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query active pools
  const { data: activePools, refetch: refetchActivePools } = useQuery({
    queryKey: ['gaunlet-active-pools'],
    queryFn: async () => {
      return await gaunletService.getActivePools();
    },
    refetchInterval: 30000,
  });

  // Query user pools (if connected)
  const { data: userPools, refetch: refetchUserPools } = useQuery({
    queryKey: ['gaunlet-user-pools', address],
    queryFn: async () => {
      if (!address) return [];
      return await gaunletService.getPoolsByCreator(address);
    },
    enabled: !!address,
    refetchInterval: 30000,
  });

  /**
   * Create a pool
   */
  const createPool = useCallback(async (
    entryFee: string,
    matchCount: number,
    matches: Match[]
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (matchCount < 6 || matchCount > 12) throw new Error('Match count must be between 6 and 12');
    if (matches.length !== matchCount) throw new Error(`Must provide exactly ${matchCount} matches`);

    // Format matches for contract
    const formattedMatches = matches.map(match => ({
      id: match.id,
      startTime: match.startTime,
      oddsHome: BigInt(match.oddsHome),
      oddsDraw: BigInt(match.oddsDraw),
      oddsAway: BigInt(match.oddsAway),
      oddsOver: BigInt(match.oddsOver),
      oddsUnder: BigInt(match.oddsUnder),
      homeTeam: match.homeTeam || '',
      awayTeam: match.awayTeam || '',
      leagueName: match.leagueName || '',
    }));

    // Calculate creator stake (target jackpot)
    // For now, we'll use entryFee * 1000 as default creator stake
    // In production, this should be user-selectable
    const creatorStake = parseUnits(entryFee, 18) * 1000n;

    writeContract({
      ...CONTRACTS.GAUNLET,
      functionName: 'createPool',
      args: [
        parseUnits(entryFee, 18),
        matchCount,
        formattedMatches
      ],
      value: creatorStake,
    });
  }, [address, writeContract]);

  /**
   * Place a slip
   */
  const placeSlip = useCallback(async (
    poolId: number,
    predictions: UserPrediction[]
  ) => {
    if (!address) throw new Error('Wallet not connected');

    // Get pool to get entry fee
    const pool = await gaunletService.getPool(poolId);
    if (!pool) throw new Error('Pool not found');
    if (!gaunletService.isBettingOpen(pool)) throw new Error('Betting is closed');

    // Format predictions for contract
    const formattedPredictions = predictions.map(pred => ({
      matchId: pred.matchId,
      betType: pred.betType,
      selection: pred.selection,
      selectedOdd: BigInt(pred.selectedOdd),
    }));

    writeContract({
      ...CONTRACTS.GAUNLET,
      functionName: 'placeSlip',
      args: [
        BigInt(poolId),
        formattedPredictions
      ],
      value: pool.entryFee,
    });
  }, [address, writeContract]);

  /**
   * Settle pool
   */
  const settlePool = useCallback(async (poolId: number) => {
    if (!address) throw new Error('Wallet not connected');

    writeContract({
      ...CONTRACTS.GAUNLET,
      functionName: 'settlePool',
      args: [BigInt(poolId)],
    });
  }, [address, writeContract]);

  /**
   * Get pool
   */
  const getPool = useCallback(async (poolId: number): Promise<GaunletPool | null> => {
    return await gaunletService.getPool(poolId);
  }, []);

  /**
   * Get slip
   */
  const getSlip = useCallback(async (slipId: number): Promise<GaunletSlip | null> => {
    return await gaunletService.getSlip(slipId);
  }, []);

  return {
    // Data
    poolCount: poolCount ? Number(poolCount) : 0,
    pools: pools || [],
    activePools: activePools || [],
    userPools: userPools || [],
    
    // Actions
    createPool,
    placeSlip,
    settlePool,
    getPool,
    getSlip,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    
    // Refetch functions
    refetchPoolCount,
    refetchPools,
    refetchActivePools,
    refetchUserPools,
    
    // Service utilities
    formatBNB: gaunletService.formatBNB.bind(gaunletService),
    parseBNB: gaunletService.parseBNB.bind(gaunletService),
    getPoolStateName: gaunletService.getPoolStateName.bind(gaunletService),
    isPoolActive: gaunletService.isPoolActive.bind(gaunletService),
    isBettingOpen: gaunletService.isBettingOpen.bind(gaunletService),
    getTimeUntilBettingCloses: gaunletService.getTimeUntilBettingCloses.bind(gaunletService),
    getFillPercentage: gaunletService.getFillPercentage.bind(gaunletService),
    getEstimatedCreatorFee: gaunletService.getEstimatedCreatorFee.bind(gaunletService),
    getEstimatedJackpot: gaunletService.getEstimatedJackpot.bind(gaunletService),
  };
}

