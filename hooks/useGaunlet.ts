import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
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
  const publicClient = usePublicClient();

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
   * @param entryFee Entry fee in BNB (e.g., "0.1")
   * @param creatorStake Creator stake in BNB (e.g., "100") - the target jackpot
   * @param matchCount Number of matches (6-12)
   * @param matches Array of matches
   */
  const createPool = useCallback(async (
    entryFee: string,
    creatorStake: string,
    matchCount: number,
    matches: Match[]
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (matchCount < 6 || matchCount > 12) throw new Error('Match count must be between 6 and 12');
    if (matches.length !== matchCount) throw new Error(`Must provide exactly ${matchCount} matches`);

    console.log('🔄 Creating Gaunlet pool...', {
      entryFee,
      creatorStake,
      matchCount,
      matchesCount: matches.length
    });

    // Format matches for contract
    const formattedMatches = matches.map(match => ({
      id: match.id,
      startTime: match.startTime,
      oddsHome: match.oddsHome,
      oddsDraw: match.oddsDraw,
      oddsAway: match.oddsAway,
      oddsOver: match.oddsOver,
      oddsUnder: match.oddsUnder,
      homeTeam: match.homeTeam || '',
      awayTeam: match.awayTeam || '',
      leagueName: match.leagueName || '',
      result: { moneyline: 0, overUnder: 0 } // Default empty result
    }));

    const entryFeeWei = parseUnits(entryFee, 18);
    const creatorStakeWei = parseUnits(creatorStake, 18);

    console.log('📝 Contract params:', {
      entryFeeWei: entryFeeWei.toString(),
      matchCount,
      creatorStakeWei: creatorStakeWei.toString(),
      formattedMatches: formattedMatches.length
    });

    // Call writeContract - it will trigger wallet interaction
    writeContract({
      ...CONTRACTS.GAUNLET,
      functionName: 'createPool',
      args: [
        entryFeeWei,
        matchCount,
        formattedMatches
      ],
      value: creatorStakeWei, // Creator stake sent as msg.value
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
    if (!publicClient) throw new Error('Public client not available');

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

    // Simulate contract call first to catch errors early
    try {
      await publicClient.simulateContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'placeSlip',
        args: [
          BigInt(poolId),
          formattedPredictions
        ],
        value: pool.entryFee,
        account: address as `0x${string}`,
      });
    } catch (simError: any) {
      console.error('❌ Simulated contract call error:', simError);
      
      // Try to extract meaningful error message
      let errorMessage = 'Failed to place slip';
      
      if (simError.message) {
        // Check for common revert reasons
        if (simError.message.includes('ERC20InsufficientAllowance')) {
          errorMessage = 'Insufficient token allowance. Please approve tokens first.';
        } else if (simError.message.includes('InsufficientBalance')) {
          errorMessage = 'Insufficient balance. Please check your BNB balance.';
        } else if (simError.message.includes('BettingClosed')) {
          errorMessage = 'Betting is closed for this pool.';
        } else if (simError.message.includes('MatchStarted')) {
          errorMessage = 'One or more matches have already started.';
        } else if (simError.message.includes('InvalidPrediction')) {
          errorMessage = 'Invalid prediction format. Please check your selections.';
        } else if (simError.message.includes('PoolFull')) {
          errorMessage = 'Pool is full. Maximum entries reached.';
        } else if (!simError.message.includes('RPC endpoint')) {
          // Only use the error message if it's not a generic RPC error
          errorMessage = `Contract revert: ${simError.message}`;
        } else {
          errorMessage = 'Transaction failed. The contract may be reverting. Please check: 1) BNB balance is sufficient, 2) Pool is still accepting entries, 3) All matches are valid.';
        }
      }
      
      throw new Error(errorMessage);
    }

    // If simulation succeeds, proceed with actual transaction
    writeContract({
      ...CONTRACTS.GAUNLET,
      functionName: 'placeSlip',
      args: [
        BigInt(poolId),
        formattedPredictions
      ],
      value: pool.entryFee,
    });
  }, [address, writeContract, publicClient]);

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

