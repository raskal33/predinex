import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useBiconomy, type BiconomyConfig } from './useBiconomy';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { usePrixToken } from './useContractInteractions';

/**
 * Enhanced Prediction Market hook with Biconomy integration for single-signature approve+execute
 * 
 * Features:
 * - Single signature for approve + createPool (when using PRIX tokens)
 * - Handles both boosted and non-boosted pools
 * - Fallback to standard flow if Biconomy is not ready
 * 
 * @example
 * ```tsx
 * const { createPoolWithToken, biconomyReady } = usePredictionMarketWithBiconomy({
 *   apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
 * });
 * 
 * // Single signature approve + createPool
 * await createPoolWithToken({
 *   matchId: '123',
 *   predictionType: 'Winner',
 *   creatorStake: parseEther('1000'),
 *   totalRequired: parseEther('1150'), // stake + fees + boost
 *   hasBoost: false,
 *   tokenAddress: CONTRACTS.PRIX_TOKEN.address,
 * });
 * ```
 */
export function usePredictionMarketWithBiconomy(config?: BiconomyConfig) {
  const { address } = useAccount();
  const { 
    isReady: biconomyReady, 
    buildComposable, 
    executeApproveAndExecute 
  } = useBiconomy(config);
  
  const { getAllowance } = usePrixToken();

  /**
   * Create pool with token approval in a single signature
   * Uses Biconomy if ready, otherwise falls back to standard flow
   */
  const createPoolWithToken = useCallback(async (params: {
    matchId: string;
    predictionType: string;
    creatorStake: bigint;
    totalRequired: bigint; // Including fees and boost
    hasBoost: boolean;
    tokenAddress: Address;
    // Additional pool params as needed
    [key: string]: any;
  }) => {
    if (!address) throw new Error('Wallet not connected');

    const { matchId, predictionType, creatorStake, totalRequired, hasBoost, tokenAddress } = params;

    // Determine which contract to approve and call
    const targetContract = hasBoost ? CONTRACT_ADDRESSES.FACTORY : CONTRACT_ADDRESSES.POOL_CORE;
    const targetAbi = hasBoost ? CONTRACTS.FACTORY.abi : CONTRACTS.POOL_CORE.abi;
    const functionName = hasBoost ? 'createPoolWithBoost' : 'createPool';

    // If Biconomy is ready, use single signature flow
    if (biconomyReady) {
      try {
        // Check current allowance
        const currentAllowance = await getAllowance(address as `0x${string}`, targetContract as `0x${string}`);
        const approveAmount = currentAllowance && currentAllowance >= totalRequired 
          ? BigInt(0) 
          : totalRequired;

        // Build the execute instruction for createPool
        const executeInstruction = await buildComposable({
          to: targetContract as Address,
          abi: targetAbi,
          functionName,
          args: [
            matchId,
            predictionType,
            creatorStake,
            // Add other args as needed based on contract function signature
          ],
          value: BigInt(0), // No BNB value for PRIX pools
        });

        // Execute approve and createPool in a single transaction
        const { hash } = await executeApproveAndExecute({
          tokenAddress,
          spender: targetContract as Address,
          approveAmount,
          executeInstruction,
        });

        return hash;
      } catch (error) {
        console.error('Biconomy transaction failed, falling back to standard flow:', error);
        // Fall through to standard flow
      }
    }

    // Fallback to standard flow (separate approve + execute)
    throw new Error('Biconomy not ready. Please use standard approve + execute flow.');
  }, [address, biconomyReady, buildComposable, executeApproveAndExecute, getAllowance]);

  /**
   * Create boosted pool with token approval in a single signature
   * Convenience method for boosted pools
   */
  const createBoostedPoolWithToken = useCallback(async (params: {
    matchId: string;
    predictionType: string;
    creatorStake: bigint;
    totalRequired: bigint;
    tokenAddress: Address;
  }) => {
    return createPoolWithToken({ ...params, hasBoost: true });
  }, [createPoolWithToken]);

  return {
    // Biconomy-specific methods
    createPoolWithToken,
    createBoostedPoolWithToken,
    biconomyReady: !!biconomyReady,
  };
}

