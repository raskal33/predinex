import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { useBiconomy } from './useBiconomy';
import type { BiconomyConfig } from '@/services/biconomyService';
import { useH2H } from './useH2H';
import { CONTRACTS } from '@/contracts';
import { usePRIXToken } from './usePRIXToken';

/**
 * Enhanced H2H hook with Biconomy integration for single-signature approve+execute
 * 
 * Features:
 * - Single signature for approve + createChallenge (when using PRIX tokens)
 * - Single signature for approve + placeBid (when using PRIX tokens)
 * - Fallback to standard flow if Biconomy is not ready
 * 
 * @example
 * ```tsx
 * const { createChallengeWithToken, placeBidWithToken, biconomyReady } = useH2HWithBiconomy({
 *   apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
 * });
 * 
 * // Single signature approve + createChallenge
 * await createChallengeWithToken({
 *   marketId: '123',
 *   outcome: 'home',
 *   makerStake: parseEther('100'),
 *   minBid: parseEther('10'),
 *   eventTime: 1234567890,
 *   tokenAddress: CONTRACTS.PRIX_TOKEN.address,
 * });
 * ```
 */
export function useH2HWithBiconomy(config?: BiconomyConfig) {
  const { address } = useAccount();
  const { 
    isReady: biconomyReady, 
    buildComposable, 
    executeApproveAndExecute 
  } = useBiconomy(config);
  
  // Standard H2H hook for fallback
  const h2hHook = useH2H();
  const { getAllowance } = usePRIXToken();

  /**
   * Create challenge with token approval in a single signature
   * Uses Biconomy if ready, otherwise falls back to standard flow
   */
  const createChallengeWithToken = useCallback(async (params: {
    marketId: string;
    outcome: string;
    makerStake: bigint;
    minBid: bigint;
    eventTime: bigint;
    tokenAddress: Address;
  }) => {
    if (!address) throw new Error('Wallet not connected');

    const { marketId, outcome, makerStake, minBid, eventTime, tokenAddress } = params;

    // If Biconomy is ready, use single signature flow
    if (biconomyReady) {
      try {
        // Check current allowance
        const currentAllowance = await getAllowance(CONTRACTS.H2H.address as Address);
        const approveAmount = currentAllowance && currentAllowance >= makerStake 
          ? BigInt(0) 
          : makerStake;

        // Build the execute instruction for createChallenge
        const executeInstruction = await buildComposable({
          to: CONTRACTS.H2H.address as Address,
          abi: CONTRACTS.H2H.abi,
          functionName: 'createChallenge',
          args: [
            marketId,
            outcome,
            minBid,
            eventTime,
            1 // currency: 1 = PRIX
          ],
          value: makerStake, // BNB value (0 for PRIX)
        });

        // Execute approve and createChallenge in a single transaction
        const { hash } = await executeApproveAndExecute({
          tokenAddress,
          spender: CONTRACTS.H2H.address as Address,
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
    // This will be handled by the UI component
    throw new Error('Biconomy not ready. Please use standard approve + execute flow.');
  }, [address, biconomyReady, buildComposable, executeApproveAndExecute, getAllowance]);

  /**
   * Place bid with token approval in a single signature
   * Uses Biconomy if ready, otherwise falls back to standard flow
   */
  const placeBidWithToken = useCallback(async (params: {
    challengeId: number;
    bidAmount: bigint;
    tokenAddress: Address;
  }) => {
    if (!address) throw new Error('Wallet not connected');

    const { challengeId, bidAmount, tokenAddress } = params;

    // If Biconomy is ready, use single signature flow
    if (biconomyReady) {
      try {
        // Check current allowance
        const currentAllowance = await getAllowance(CONTRACTS.H2H.address as Address);
        const approveAmount = currentAllowance && currentAllowance >= bidAmount 
          ? BigInt(0) 
          : bidAmount;

        // Build the execute instruction for placeBid
        const executeInstruction = await buildComposable({
          to: CONTRACTS.H2H.address as Address,
          abi: CONTRACTS.H2H.abi,
          functionName: 'placeBid',
          args: [
            challengeId,
            1 // currency: 1 = PRIX
          ],
          value: bidAmount, // BNB value (0 for PRIX)
        });

        // Execute approve and placeBid in a single transaction
        const { hash } = await executeApproveAndExecute({
          tokenAddress,
          spender: CONTRACTS.H2H.address as Address,
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

  return {
    ...h2hHook,
    // Biconomy-specific methods
    createChallengeWithToken,
    placeBidWithToken,
    biconomyReady: !!biconomyReady,
  };
}

