/**
 * Hook for calculating fee discounts based on PRIX token holdings
 */

import { useAccount, useReadContract } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { useMemo } from 'react';
import { calculateFeeDiscount, type FeeCalculation } from '@/utils/feeCalculator';

export function useTokenDiscounts() {
  const { address } = useAccount();

  // Get user's PRIX balance
  const { data: prixBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.PRIX_TOKEN,
    abi: CONTRACTS.PRIX_TOKEN.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Calculate fee discount
  const feeCalculation: FeeCalculation | null = useMemo(() => {
    if (!prixBalance) return null;
    return calculateFeeDiscount(prixBalance as bigint);
  }, [prixBalance]);

  // Get adjusted fee rate from contract (if available)
  const { data: adjustedFeeRate } = useReadContract({
    address: CONTRACT_ADDRESSES.PREDINEX_POOL,
    abi: CONTRACTS.POOL_CORE.abi,
    functionName: 'adjustedFeeRate',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    prixBalance: prixBalance as bigint | undefined,
    feeCalculation,
    adjustedFeeRate: adjustedFeeRate as bigint | undefined,
    discountTier: feeCalculation?.tier || 'NONE',
    discountPercent: feeCalculation?.discountPercent || 0,
    refetchBalance,
  };
}

