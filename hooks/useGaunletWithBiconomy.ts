import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { parseUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { gaunletService } from '@/services/gaunletService';
import { transformContractData } from '@/utils/bigint-serializer';
import { useBiconomy } from './useBiconomy';
import type { Match, UserPrediction } from './useGaunlet';

/**
 * Enhanced Gaunlet hook with Biconomy Supertransactions support
 * 
 * Features:
 * - Single signature for approve + execute (if using tokens)
 * - Batch multiple operations
 * - Optional gasless transactions
 * - Falls back to regular wagmi transactions if Biconomy not available
 */
export function useGaunletWithBiconomy(useBiconomyEnabled: boolean = false) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  const biconomy = useBiconomy({
    enableGasless: false, // Set to true if you want to sponsor gas
    sponsorGas: false,
  });

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
    refetchInterval: 30000,
  });

  // Query active pools
  const { data: activePools, refetch: refetchActivePools } = useQuery({
    queryKey: ['gaunlet-active-pools'],
    queryFn: async () => {
      return await gaunletService.getActivePools();
    },
    refetchInterval: 30000,
  });

  // Query user pools
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
   * Create a pool (with optional Biconomy support)
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

    const creatorStake = parseUnits(entryFee, 18) * BigInt(1000);

    // Use Biconomy if enabled and ready
    if (useBiconomyEnabled && biconomy.isReady) {
      const gaunletAbi = CONTRACTS.GAUNLET.abi;
      
      const executeInstruction = await biconomy.buildComposable({
        to: CONTRACTS.GAUNLET.address,
        abi: gaunletAbi,
        functionName: 'createPool',
        args: [
          parseUnits(entryFee, 18),
          matchCount,
          formattedMatches
        ],
        value: creatorStake,
      });

      const result = await biconomy.executeBatch([executeInstruction]);
      return result;
    } else {
      // Fallback to regular wagmi transaction
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
    }
  }, [address, writeContract, useBiconomyEnabled, biconomy]);

  /**
   * Place a slip (with optional Biconomy support)
   */
  const placeSlip = useCallback(async (
    poolId: number,
    predictions: UserPrediction[]
  ) => {
    if (!address) throw new Error('Wallet not connected');

    const pool = await gaunletService.getPool(poolId);
    if (!pool) throw new Error('Pool not found');
    if (!gaunletService.isBettingOpen(pool)) throw new Error('Betting is closed');

    const formattedPredictions = predictions.map(pred => ({
      matchId: pred.matchId,
      betType: pred.betType,
      selection: pred.selection,
      selectedOdd: BigInt(pred.selectedOdd),
    }));

    // Use Biconomy if enabled and ready
    if (useBiconomyEnabled && biconomy.isReady) {
      const gaunletAbi = CONTRACTS.GAUNLET.abi;
      
      const executeInstruction = await biconomy.buildComposable({
        to: CONTRACTS.GAUNLET.address,
        abi: gaunletAbi,
        functionName: 'placeSlip',
        args: [
          BigInt(poolId),
          formattedPredictions
        ],
        value: pool.entryFee,
      });

      const result = await biconomy.executeBatch([executeInstruction]);
      return result;
    } else {
      // Fallback to regular wagmi transaction
      writeContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'placeSlip',
        args: [
          BigInt(poolId),
          formattedPredictions
        ],
        value: pool.entryFee,
      });
    }
  }, [address, writeContract, useBiconomyEnabled, biconomy]);

  /**
   * Place slip with token approval (single signature approve + execute)
   * This is the main benefit of Biconomy - combine approve and execute in one signature
   */
  const placeSlipWithToken = useCallback(async (
    poolId: number,
    predictions: UserPrediction[],
    tokenAddress: string,
    entryFeeAmount: bigint
  ) => {
    if (!address) throw new Error('Wallet not connected');
    if (!biconomy.isReady) {
      throw new Error('Biconomy not initialized. Use regular placeSlip or enable Biconomy.');
    }

    const pool = await gaunletService.getPool(poolId);
    if (!pool) throw new Error('Pool not found');
    if (!gaunletService.isBettingOpen(pool)) throw new Error('Betting is closed');

    const formattedPredictions = predictions.map(pred => ({
      matchId: pred.matchId,
      betType: pred.betType,
      selection: pred.selection,
      selectedOdd: BigInt(pred.selectedOdd),
    }));

    const gaunletAbi = CONTRACTS.GAUNLET.abi;
    
    // Build execute instruction (placeSlip)
    const executeInstruction = await biconomy.buildComposable({
      to: CONTRACTS.GAUNLET.address,
      abi: gaunletAbi,
      functionName: 'placeSlip',
      args: [
        BigInt(poolId),
        formattedPredictions
      ],
      value: BigInt(0), // Using token, not native
    });

    // Execute approve + execute in single signature
    const result = await biconomy.executeApproveAndExecute({
      tokenAddress: tokenAddress as `0x${string}`,
      spender: CONTRACTS.GAUNLET.address,
      approveAmount: entryFeeAmount,
      executeInstruction,
    });

    return result;
  }, [address, biconomy]);

  /**
   * Settle pool
   */
  const settlePool = useCallback(async (poolId: number) => {
    if (!address) throw new Error('Wallet not connected');

    if (useBiconomyEnabled && biconomy.isReady) {
      const gaunletAbi = CONTRACTS.GAUNLET.abi;
      
      const executeInstruction = await biconomy.buildComposable({
        to: CONTRACTS.GAUNLET.address,
        abi: gaunletAbi,
        functionName: 'settlePool',
        args: [BigInt(poolId)],
      });

      const result = await biconomy.executeBatch([executeInstruction]);
      return result;
    } else {
      writeContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'settlePool',
        args: [BigInt(poolId)],
      });
    }
  }, [address, writeContract, useBiconomyEnabled, biconomy]);

  return {
    // Data
    poolCount: poolCount ? Number(poolCount) : 0,
    pools: pools || [],
    activePools: activePools || [],
    userPools: userPools || [],
    
    // Actions
    createPool,
    placeSlip,
    placeSlipWithToken, // New: Single signature approve + execute
    settlePool,
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    
    // Biconomy state
    biconomyReady: biconomy.isReady,
    biconomyAccount: biconomy.accountAddress,
    getMeeScanLink: biconomy.getMeeScanLink,
    
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
  };
}

