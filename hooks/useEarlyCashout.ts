/**
 * Hook for early cashout marketplace - listing and buying positions
 */

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';

export type PositionType = 'POOL' | 'BETTOR';

export interface ListedPosition {
  poolId: bigint;
  seller: `0x${string}`;
  positionType: PositionType;
  bettorAddress?: `0x${string}`;
  originalStake: bigint;
  askingPrice: bigint;
  currency: 'BNB' | 'PRIX' | 'USDT';
  listingId?: bigint;
}

export function useEarlyCashout() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  /**
   * List pool ownership for sale
   */
  const listPoolForSale = useCallback(async (
    poolId: bigint,
    askingPrice: bigint,
    currency: 'BNB' | 'PRIX' | 'USDT' = 'BNB'
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Listing pool for sale...', { id: 'list-pool' });
      
      // For BNB, send value; for tokens, need approval first
      const value = currency === 'BNB' ? askingPrice : 0n;
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'listPoolForSale',
        args: [poolId, askingPrice],
        value,
      });

      console.log('✅ Pool listing transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'list-pool' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error listing pool:', error);
      toast.error(error?.message || 'Failed to list pool', { id: 'list-pool' });
      throw error;
    }
  }, [address, writeContractAsync]);

  /**
   * List bettor position for sale
   */
  const listBettorPositionForSale = useCallback(async (
    poolId: bigint,
    askingPrice: bigint,
    currency: 'BNB' | 'PRIX' | 'USDT' = 'BNB'
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Listing position for sale...', { id: 'list-position' });
      
      const value = currency === 'BNB' ? askingPrice : 0n;
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'listBettorPositionForSale',
        args: [poolId, askingPrice],
        value,
      });

      console.log('✅ Position listing transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'list-position' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error listing position:', error);
      toast.error(error?.message || 'Failed to list position', { id: 'list-position' });
      throw error;
    }
  }, [address, writeContractAsync]);

  /**
   * Buy listed pool ownership
   */
  const buyPoolOwnership = useCallback(async (
    poolId: bigint,
    price: bigint,
    currency: 'BNB' | 'PRIX' | 'USDT' = 'BNB'
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Buying pool ownership...', { id: 'buy-pool' });
      
      const value = currency === 'BNB' ? price : 0n;
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'buyPoolOwnership',
        args: [poolId],
        value,
      });

      console.log('✅ Pool purchase transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'buy-pool' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error buying pool:', error);
      toast.error(error?.message || 'Failed to buy pool', { id: 'buy-pool' });
      throw error;
    }
  }, [address, writeContractAsync]);

  /**
   * Buy listed bettor position
   */
  const buyBettorPosition = useCallback(async (
    poolId: bigint,
    seller: `0x${string}`,
    price: bigint,
    currency: 'BNB' | 'PRIX' | 'USDT' = 'BNB'
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Buying bettor position...', { id: 'buy-position' });
      
      const value = currency === 'BNB' ? price : 0n;
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'buyBettorPosition',
        args: [poolId, seller],
        value,
      });

      console.log('✅ Position purchase transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'buy-position' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error buying position:', error);
      toast.error(error?.message || 'Failed to buy position', { id: 'buy-position' });
      throw error;
    }
  }, [address, writeContractAsync]);

  /**
   * Cancel listing
   */
  const cancelListing = useCallback(async (
    poolId: bigint,
    positionType: PositionType
  ) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.loading('Cancelling listing...', { id: 'cancel-listing' });
      
      const functionName = positionType === 'POOL' 
        ? 'cancelPoolListing' 
        : 'cancelBettorPositionListing';
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PREDINEX_POOL,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName,
        args: [poolId],
      });

      console.log('✅ Listing cancellation transaction submitted:', txHash);
      toast.loading('Waiting for confirmation...', { id: 'cancel-listing' });
      
      return txHash;
    } catch (error: any) {
      console.error('Error cancelling listing:', error);
      toast.error(error?.message || 'Failed to cancel listing', { id: 'cancel-listing' });
      throw error;
    }
  }, [address, writeContractAsync]);

  return {
    listPoolForSale,
    listBettorPositionForSale,
    buyPoolOwnership,
    buyBettorPosition,
    cancelListing,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
  };
}

