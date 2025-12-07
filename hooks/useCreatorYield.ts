/**
 * Hook for fetching and claiming creator yields
 */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { formatEther } from 'viem';
import { useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

export interface CreatorYield {
  poolId: bigint;
  creator: `0x${string}`;
  yieldAmount: bigint;
  effectiveAPY: bigint;
  currency: 'BNB' | 'PRIX' | 'USDT';
  claimed: boolean;
  claimedAt?: bigint;
}

export function useCreatorYield() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Get total claimable yield for creator
  const { data: totalClaimable, refetch: refetchTotalClaimable } = useReadContract({
    address: CONTRACT_ADDRESSES.PREDINEX_POOL,
    abi: CONTRACTS.POOL_CORE.abi,
    functionName: 'getCreatorTotalClaimableYield',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get creator yield history (from events - would need backend API)
  // For now, we'll use contract events or backend API

  /**
   * Claim creator yield
   */
  const claimYield = useCallback(async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Claiming creator yield...', { id: 'claim-yield' });
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'claimCreatorYield',
        args: [],
      });

      console.log('✅ Creator yield claim transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'claim-yield' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error claiming creator yield:', error);
      toast.error(error?.message || 'Failed to claim creator yield', { id: 'claim-yield' });
      throw error;
    }
  }, [address, writeContractAsync]);

  /**
   * Get yield for a specific pool
   */
  const getPoolYield = useCallback(async (_poolId: bigint): Promise<CreatorYield | null> => {
    // This would typically come from backend API that indexes events
    // For now, return null as placeholder
    return null;
  }, []);

  const formattedTotalClaimable = useMemo(() => {
    if (!totalClaimable) return '0';
    return formatEther(totalClaimable as bigint);
  }, [totalClaimable]);

  return {
    totalClaimable: totalClaimable as bigint | undefined,
    formattedTotalClaimable,
    claimYield,
    getPoolYield,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    refetchTotalClaimable,
  };
}

