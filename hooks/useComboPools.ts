import { useCallback } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/contracts';
import { CONTRACT_ADDRESSES } from '@/config/wagmi';
import { getTransactionOptions } from '@/lib/network-connection';
import { toast } from 'react-hot-toast';

export interface ComboCondition {
  marketId: string;           // SportMonks match ID (bytes32)
  expectedOutcome: string;   // Expected result (bytes32)
  description: string;        // Human readable description
  odds: number;              // Individual odds (1.01x - 100x) as uint16
}

// Currency types matching contract enum
export enum CurrencyType {
  BNB = 0,
  PRIX = 1,
  USDT = 2
}

export interface ComboPoolData {
  conditions: ComboCondition[];
  combinedOdds: number;        // Combined odds (1.01x - 500x) as uint16
  creatorStake: bigint;        // Creator's stake in wei
  earliestEventStart: bigint;  // Earliest event start timestamp
  latestEventEnd: bigint;      // Latest event end timestamp
  category: string;            // Category string (will be hashed)
  maxBetPerUser: bigint;       // Max bet per user (0 = unlimited)
  currencyType: CurrencyType;  // 0=BNB, 1=PRIX, 2=USDT
}

export function useComboPools() {
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  const createComboPool = useCallback(async (poolData: ComboPoolData) => {
    try {
      // Hash category string before calling the contract
      const categoryHash = ethers.keccak256(ethers.toUtf8Bytes(poolData.category));
      
      // Transform conditions to match contract struct OutcomeCondition
      const contractConditions = poolData.conditions.map(condition => ({
        marketId: ethers.encodeBytes32String(condition.marketId.slice(0, 31)), // bytes32 max 31 chars
        expectedOutcome: ethers.encodeBytes32String(condition.expectedOutcome.slice(0, 31)),
        resolved: false, // Always false for new pools
        actualOutcome: "0x0000000000000000000000000000000000000000000000000000000000000000", // Empty bytes32
        description: condition.description,
        odds: Math.floor(condition.odds * 100) // Convert to basis points (1.85 -> 185)
      }));
      
      // Get currency type - contract expects uint8: 0=BNB, 1=PRIX, 2=USDT
      const currencyType = poolData.currencyType;
      
      // Calculate fees and payments based on currency type
      // Contract minimums: BNB=2e18, PRIX=5000e18, USDT=2000e18
      let totalBNBToSend = 0n;
      
      if (currencyType === CurrencyType.BNB) {
        // BNB: Send stake + creation fee via msg.value
        const creationFeeBNB = 1n * 10n**16n; // 0.01 BNB
        totalBNBToSend = poolData.creatorStake + creationFeeBNB;
      } else if (currencyType === CurrencyType.PRIX && address) {
        // PRIX: Approve tokens first, then send creation fee in BNB
        const creationFeeBNB = 1n * 10n**16n; // 0.01 BNB
        totalBNBToSend = creationFeeBNB;
        
        // Approve PRIX tokens for the combo pools contract
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.PRIX_TOKEN,
          abi: CONTRACTS.PRIX_TOKEN.abi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.COMBO_POOLS, poolData.creatorStake],
          ...getTransactionOptions(),
        });
        
        toast.success('PRIX tokens approved for combo pool creation!');
      } else if (currencyType === CurrencyType.USDT && address) {
        // USDT: Approve tokens first, then send creation fee in BNB
        const creationFeeBNB = 1n * 10n**16n; // 0.01 BNB
        totalBNBToSend = creationFeeBNB;
        
        // Note: USDT approval would need USDT_TOKEN address in CONTRACT_ADDRESSES
        // For now, this is a placeholder - implement when USDT support is added
        toast.error('USDT support coming soon!');
        throw new Error('USDT not yet supported');
      }
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.COMBO_POOLS,
        abi: CONTRACTS.COMBO_POOLS.abi,
        functionName: 'createComboPool',
        args: [
          contractConditions,
          Math.floor(poolData.combinedOdds * 100), // Convert to basis points (uint16)
          poolData.creatorStake,
          poolData.earliestEventStart,
          poolData.latestEventEnd,
          categoryHash,
          poolData.maxBetPerUser,
          currencyType // uint8: 0=BNB, 1=PRIX, 2=USDT
        ],
        value: totalBNBToSend,
        ...getTransactionOptions(),
      });
      
      toast.success('Combo pool creation transaction submitted!');
      return txHash;
    } catch (error) {
      console.error('Error creating combo pool:', error);
      toast.error('Failed to create combo pool');
      throw error;
    }
  }, [writeContractAsync, address]);

  const placeComboBet = useCallback(async (poolId: bigint, betAmount: bigint) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.COMBO_POOLS,
        abi: CONTRACTS.COMBO_POOLS.abi,
        functionName: 'placeComboBet',
        args: [poolId, betAmount],
        value: betAmount,
        ...getTransactionOptions(),
      });
      
      toast.success('Combo bet placed successfully!');
      return txHash;
    } catch (error) {
      console.error('Error placing combo bet:', error);
      toast.error('Failed to place combo bet');
      throw error;
    }
  }, [writeContractAsync]);

  const settleComboPool = useCallback(async (poolId: bigint, outcomes: string[]) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.COMBO_POOLS,
        abi: CONTRACTS.COMBO_POOLS.abi,
        functionName: 'settleComboPool',
        args: [poolId, outcomes],
        ...getTransactionOptions(),
      });
      
      toast.success('Combo pool settled successfully!');
      return txHash;
    } catch (error) {
      console.error('Error settling combo pool:', error);
      toast.error('Failed to settle combo pool');
      throw error;
    }
  }, [writeContractAsync]);

  return {
    createComboPool,
    placeComboBet,
    settleComboPool,
  };
}
