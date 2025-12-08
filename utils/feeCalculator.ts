/**
 * Fee Calculator Utility
 * Calculates creation fees with PRIX token holding discounts
 */

import { formatEther, parseEther } from 'viem';

export type CurrencyType = 'BNB' | 'PRIX' | 'USDT';

export interface FeeCalculation {
  baseFee: bigint;
  discountMultiplier: number; // 50-100 (percentage)
  discountPercent: number; // 0-50 (actual discount percentage)
  adjustedFee: bigint;
  savings: bigint;
  tier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
}

/**
 * Calculate fee discount based on PRIX token holdings
 * @param prixBalance - User's PRIX token balance (in wei)
 * @returns Fee calculation with discount information
 */
export function calculateFeeDiscount(prixBalance: bigint): FeeCalculation {
  const BASE_FEE_BNB = parseEther('0.01'); // 0.01 BNB base fee
  
  let discountMultiplier = 100; // 100% = no discount
  let tier: FeeCalculation['tier'] = 'NONE';
  
  // Discount tiers based on PRIX holdings
  // 500,000+ PRIX = 50% discount (PLATINUM)
  // 200,000+ PRIX = 30% discount (GOLD)
  // 50,000+ PRIX = 20% discount (SILVER)
  // 5,000+ PRIX = 10% discount (BRONZE)
  
  if (prixBalance >= parseEther('500000')) {
    discountMultiplier = 50;
    tier = 'PLATINUM';
  } else if (prixBalance >= parseEther('200000')) {
    discountMultiplier = 70;
    tier = 'GOLD';
  } else if (prixBalance >= parseEther('50000')) {
    discountMultiplier = 80;
    tier = 'SILVER';
  } else if (prixBalance >= parseEther('5000')) {
    discountMultiplier = 90;
    tier = 'BRONZE';
  }
  
  const adjustedFee = (BASE_FEE_BNB * BigInt(discountMultiplier)) / 100n;
  const savings = BASE_FEE_BNB - adjustedFee;
  const discountPercent = 100 - discountMultiplier;
  
  return {
    baseFee: BASE_FEE_BNB,
    discountMultiplier,
    discountPercent,
    adjustedFee,
    savings,
    tier,
  };
}

/**
 * Get minimum stake requirements for each currency
 * Matches contract constants from LibAppStorage.sol
 */
export const MIN_STAKES = {
  BNB: parseEther('0.5'), // 0.5 BNB (5e17) - Diamond pattern
  PRIX: parseEther('1000'), // 1000 PRIX (1000e18)
  USDT: parseEther('500'), // 500 USDT (500e18)
} as const;

/**
 * Get minimum stake requirements for combo pools
 * Matches PredinexComboPools.sol constants
 */
export const MIN_STAKES_COMBO = {
  BNB: parseEther('2'), // 2 BNB
  PRIX: parseEther('5000'), // 5000 PRIX
  USDT: parseEther('2000'), // 2000 USDT
} as const;

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: bigint, currency: CurrencyType, _decimals: number = 18): string {
  const formatted = formatEther(amount);
  return `${formatted} ${currency}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyType): string {
  return currency;
}

/**
 * Get currency decimals (all are 18 for now)
 */
export function getCurrencyDecimals(_currency: CurrencyType): number {
  return 18;
}

