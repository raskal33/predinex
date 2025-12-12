import { useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/contracts';
import { parseUnits } from 'viem';

export interface CashoutPosition {
  poolId: number;
  isCreatorSide: boolean;
  bettorAddress?: string;
  stake: string;
  positionValue: string;
  canCashout: boolean;
  reason?: string;
  isListed: boolean;
  askPrice?: string;
  currentOwner: string;
}

export function useEarlyCashout() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  /**
   * Get position value from contract
   */
  const getPositionValue = useCallback(async (
    poolId: number,
    isCreatorSide: boolean,
    bettorAddress?: string
  ): Promise<bigint> => {
    if (!publicClient) throw new Error('Public client not available');

    const result = await publicClient.readContract({
      ...CONTRACTS.POOL_CORE,
      functionName: 'getPositionValue',
      args: [
        BigInt(poolId),
        isCreatorSide,
        bettorAddress || address || '0x0'
      ],
    });

    return BigInt(result as unknown as string);
  }, [publicClient, address]);

  /**
   * Check if position can be cashed out
   */
  const checkCanCashout = useCallback(async (poolId: number): Promise<{ canCashout: boolean; reason?: string }> => {
    if (!publicClient) return { canCashout: false, reason: 'Public client not available' };

    try {
      // Get pool data
      const pool = await publicClient.readContract({
        ...CONTRACTS.POOL_CORE,
        functionName: 'getPool',
        args: [BigInt(poolId)],
      });

      // Check if pool is settled
      const flags = (pool as any).flags;
      const isSettled = (flags & 1) !== 0;
      const eventEndTime = (pool as any).eventEndTime;
      const bettingEndTime = (pool as any).bettingEndTime;

      if (isSettled) {
        return { canCashout: false, reason: 'Pool already settled' };
      }

      const now = BigInt(Math.floor(Date.now() / 1000));
      
      // Can cashout before betting ends or during event
      if (now < bettingEndTime || (now >= bettingEndTime && now < eventEndTime)) {
        return { canCashout: true };
      }

      return { canCashout: false, reason: 'Event has ended' };
    } catch (error) {
      console.error('Error checking cashout eligibility:', error);
      return { canCashout: false, reason: 'Failed to check eligibility' };
    }
  }, [publicClient]);

  /**
   * List pool position for sale (creator)
   */
  const listPoolForSale = useCallback(async (
    poolId: number,
    price: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const priceWei = parseUnits(price, 18);

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'listPoolForSale',
      args: [BigInt(poolId), priceWei],
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * Buy pool position
   */
  const buyPoolPosition = useCallback(async (
    poolId: number,
    maxPrice: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const priceWei = parseUnits(maxPrice, 18);

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'buyPoolPosition',
      args: [BigInt(poolId), priceWei],
      value: priceWei,
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * List bettor position for sale
   */
  const listBettorPositionForSale = useCallback(async (
    poolId: number,
    price: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const priceWei = parseUnits(price, 18);

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'listBettorPositionForSale',
      args: [BigInt(poolId), priceWei],
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * Buy bettor position
   */
  const buyBettorPosition = useCallback(async (
    poolId: number,
    bettorAddress: string,
    maxPrice: string
  ): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const priceWei = parseUnits(maxPrice, 18);

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'buyBettorPosition',
      args: [BigInt(poolId), bettorAddress as `0x${string}`, priceWei],
      value: priceWei,
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * Cancel pool listing
   */
  const cancelPoolListing = useCallback(async (poolId: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'cancelPoolListing',
      args: [BigInt(poolId)],
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * Cancel bettor listing
   */
  const cancelBettorListing = useCallback(async (poolId: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

    const hash = await writeContractAsync({
      ...CONTRACTS.POOL_CORE,
      functionName: 'cancelBettorListing',
      args: [BigInt(poolId)],
    });

    return hash;
  }, [address, writeContractAsync]);

  /**
   * Check if pool is for sale
   */
  const isPoolForSale = useCallback(async (poolId: number): Promise<boolean> => {
    if (!publicClient) return false;

    try {
      const result = await publicClient.readContract({
        ...CONTRACTS.POOL_CORE,
        functionName: 'isPoolForSale',
        args: [BigInt(poolId)],
      });

      return Boolean(result);
    } catch (error) {
      console.error('Error checking if pool is for sale:', error);
      return false;
    }
  }, [publicClient]);

  /**
   * Get pool ask price
   */
  const getPoolAskPrice = useCallback(async (poolId: number): Promise<bigint> => {
    if (!publicClient) throw new Error('Public client not available');

    const result = await publicClient.readContract({
      ...CONTRACTS.POOL_CORE,
      functionName: 'getPoolAskPrice',
      args: [BigInt(poolId)],
    });

    return BigInt(result as unknown as string);
  }, [publicClient]);

  /**
   * Check if bettor position is for sale
   */
  const isBettorPositionForSale = useCallback(async (
    poolId: number,
    bettorAddress: string
  ): Promise<boolean> => {
    if (!publicClient) return false;

    try {
      const result = await publicClient.readContract({
        ...CONTRACTS.POOL_CORE,
        functionName: 'isBettorPositionForSale',
        args: [BigInt(poolId), bettorAddress as `0x${string}`],
      });

      return Boolean(result);
    } catch (error) {
      console.error('Error checking if bettor position is for sale:', error);
      return false;
    }
  }, [publicClient]);

  /**
   * Get bettor ask price
   */
  const getBettorAskPrice = useCallback(async (
    poolId: number,
    bettorAddress: string
  ): Promise<bigint> => {
    if (!publicClient) throw new Error('Public client not available');

    const result = await publicClient.readContract({
      ...CONTRACTS.POOL_CORE,
      functionName: 'getBettorAskPrice',
      args: [BigInt(poolId), bettorAddress as `0x${string}`],
    });

    return BigInt(result as unknown as string);
  }, [publicClient]);

  return {
    // State
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    
    // Functions
    getPositionValue,
    checkCanCashout,
    listPoolForSale,
    buyPoolPosition,
    listBettorPositionForSale,
    buyBettorPosition,
    cancelPoolListing,
    cancelBettorListing,
    isPoolForSale,
    getPoolAskPrice,
    isBettorPositionForSale,
    getBettorAskPrice,
  };
}
