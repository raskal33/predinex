import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/config/wagmi';
import { CONTRACTS } from '@/contracts';
import { GuidedMarketService } from './guidedMarketService';
import { ethers } from 'ethers';

/**
 * Enhanced Guided Market Service with Wallet Integration
 * 
 * This service handles the complete flow for creating guided markets:
 * 1. Prepare transaction data via backend
 * 2. Execute transaction via MetaMask/wallet
 * 3. Confirm transaction via backend for indexing
 */

export interface GuidedMarketTransactionData {
  contractAddress: string;
  functionName: string;
  parameters: any[];
  value: string;
  gasEstimate: string;
  totalRequiredWei?: string; // Total amount needed for approval/transfer (includes fee)
  creationFeeWei?: string;   // Fee amount
  marketDetails: any;
}

export interface CreateFootballMarketParams {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  outcome: string;
  predictedOutcome: string;
  odds: number;
  creatorStake: number;
  usePrix?: boolean;
  description?: string;
  isPrivate?: boolean;
  maxBetPerUser?: number;
}

export class GuidedMarketWalletService {
  /**
   * Create a football market using the new prepare/confirm flow
   */
  static async createFootballMarketWithWallet(
    marketData: CreateFootballMarketParams,
    walletClient: any,
    publicClient: any,
    address: Address
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    marketId?: string;
    error?: string;
  }> {
    try {
      console.log('🚀 Starting guided football market creation...');
      console.log('📋 Market data:', marketData);
      
      // Step 1: Prepare transaction data via backend
      console.log('📡 Step 1: Preparing transaction data...');
      const prepareResult = await GuidedMarketService.prepareFootballMarket(marketData);
      
      if (!prepareResult.success) {
        return {
          success: false,
          error: `Failed to prepare transaction: ${prepareResult.error}`
        };
      }
      
      const transactionData = prepareResult.data as GuidedMarketTransactionData;
      
      // 🚨 CRITICAL FIX: Override with new optimized contract address
      transactionData.contractAddress = CONTRACT_ADDRESSES.POOL_CORE;
      
      // ✅ FIXED: Ensure parameters is an array to prevent "r.filter is not a function" error
      if (!Array.isArray(transactionData.parameters)) {
        console.error('❌ transactionData.parameters is not an array:', transactionData.parameters);
        return {
          success: false,
          error: 'Invalid transaction data: parameters must be an array'
        };
      }
      
      // ✅ FIXED: Updated marketId index based on parameter count
      // Diamond createPool: marketId at index 16 (18 params total)
      // Factory createPoolWithBoost: marketId at index 17 (19 params total)
      const marketIdIndex = transactionData.parameters.length === 19 ? 17 : 16;
      
      // 🔧 CRITICAL FIX: Override marketId with actual SportMonks fixture ID (not hex hash)
      if (transactionData.parameters && transactionData.parameters.length > marketIdIndex) {
        // Replace the hex marketId with the actual SportMonks fixture ID
        const originalMarketId = transactionData.parameters[marketIdIndex];
        transactionData.parameters[marketIdIndex] = marketData.fixtureId;
        console.log(`🔧 Overriding marketId with SportMonks fixture ID:`);
        console.log(`   Original (hex): ${originalMarketId}`);
        console.log(`   New (fixture ID): ${marketData.fixtureId}`);
        console.log(`   Parameter count: ${transactionData.parameters.length}, marketId index: ${marketIdIndex}`);
      }
      
      console.log('✅ Transaction data prepared:', {
        contractAddress: transactionData.contractAddress,
        functionName: transactionData.functionName,
        marketId: transactionData.marketDetails.marketId
      });
      console.log('🔧 Using optimized contract address:', CONTRACT_ADDRESSES.POOL_CORE);
      
      // Step 2: Handle PRIX approval if needed
      if (marketData.usePrix) {
        console.log('🪙 Step 2: Handling PRIX token approval...');
        
        // ✅ CRITICAL: Creation fee is always in BNB (0.01 BNB base with discounts)
        // For PRIX pools: need BNB for creation fee + PRIX for stake
        // totalRequiredWei includes the creator stake in PRIX, not the creation fee
        const creatorStake = transactionData.totalRequiredWei || transactionData.parameters[2];
        
        const approvalResult = await this.handlePrixApproval(
          creatorStake, // Only approve creator stake in PRIX (fee is paid in BNB separately)
          walletClient,
          publicClient,
          address
        );
        
        if (!approvalResult.success) {
          return {
            success: false,
            error: `PRIX approval failed: ${approvalResult.error}`
          };
        }
        
        console.log('✅ PRIX approval completed');
      }
      
      // Step 3: Execute the main transaction via wallet
      console.log('💳 Step 3: Executing transaction via wallet...');
      
      const txResult = await this.executeTransaction(
        transactionData,
        walletClient,
        publicClient,
        address,
        marketData
      );
      
      if (!txResult.success) {
        return {
          success: false,
          error: `Transaction execution failed: ${txResult.error}`
        };
      }
      
      console.log('✅ Transaction executed:', txResult.hash);
      
      // Step 4: Confirm transaction via backend for indexing
      console.log('📡 Step 4: Confirming transaction with backend...');
      
      const confirmResult = await GuidedMarketService.confirmFootballMarket(
        txResult.hash!,
        transactionData.marketDetails
      );
      
      if (!confirmResult.success) {
        console.warn('⚠️ Backend confirmation failed, but transaction was successful:', confirmResult.error);
        // Don't fail the entire process if backend confirmation fails
      } else {
        console.log('✅ Backend confirmation completed');
      }
      
      return {
        success: true,
        transactionHash: txResult.hash,
        marketId: transactionData.marketDetails.marketId
      };
      
    } catch (error) {
      console.error('❌ Error creating football market:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Handle PRIX token approval for guided markets
   */
  private static async handlePrixApproval(
    stakeAmount: string,
    walletClient: any,
    publicClient: any,
    address: Address
  ): Promise<{ success: boolean; error?: string; hash?: string }> {
    try {
      console.log('🔍 Checking PRIX allowance...');
      
      // Check current allowance using publicClient (correct wagmi v2 API)
      const currentAllowance = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.PRIX_TOKEN,
        abi: CONTRACTS.PRIX_TOKEN.abi,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESSES.POOL_CORE]
      });
      
      const requiredAmount = BigInt(stakeAmount);
      
      if (currentAllowance >= requiredAmount) {
        console.log('✅ Sufficient PRIX allowance already exists');
        return { success: true };
      }
      
      console.log('📝 Requesting PRIX approval...');
      console.log(`   Required: ${requiredAmount.toString()}`);
      console.log(`   Current: ${currentAllowance.toString()}`);
      
      // Request approval using walletClient (correct wagmi v2 API)
      const approvalHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.PRIX_TOKEN,
        abi: CONTRACTS.PRIX_TOKEN.abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.POOL_CORE, requiredAmount],
        account: address
      });
      
      console.log('⏳ Waiting for approval confirmation...');
      
      // Wait for approval transaction using publicClient
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalHash
      });
      
      if (approvalReceipt.status !== 'success') {
        throw new Error('PRIX approval transaction failed');
      }
      
      console.log('✅ PRIX approval confirmed:', approvalHash);
      return { success: true, hash: approvalHash };
      
    } catch (error) {
      console.error('❌ PRIX approval error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          return { success: false, error: 'User rejected PRIX approval' };
        } else if (error.message.includes('insufficient funds')) {
          return { success: false, error: 'Insufficient PRIX balance for approval' };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PRIX approval failed'
      };
    }
  }
  
  /**
   * Hash string parameters to bytes32 for the optimized contract
   */
  private static hashStringParameters(parameters: any[]): any[] {
    // ✅ FIXED: Updated for new createPool signature with 18 parameters
    // The createPool function expects these parameters in order:
    // [creatorStake, odds, predictedOutcome, eventStartTime, eventEndTime,
    //  isPrivate, maxBetPerUser, oracleType, marketType, currencyType,
    //  league, category, homeTeam, awayTeam, title, leverage, marketId, isDynamicOdds]
    // Note: Contract signature is: createPool(uint256 _creatorStake, uint16 _odds, bytes32 _predictedOutcome, ...)
    
    // ✅ FIXED: Support both 18 parameters (Diamond createPool) and 19 parameters (Factory createPoolWithBoost)
    if (!Array.isArray(parameters)) {
      console.error('❌ Parameters is not an array:', typeof parameters, parameters);
      return [];
    }
    
    if (parameters.length < 17) {
      console.warn('⚠️ Expected at least 17 parameters, got:', parameters.length);
      return parameters;
    }
    
    const hashedParameters = [...parameters];
    
    // ✅ FIXED: Updated string field indices for new createPool signature
    // Diamond createPool parameter order (18 params):
    // [0: creatorStake, 1: odds, 2: predictedOutcome, 3: eventStartTime, 4: eventEndTime,
    //  5: isPrivate, 6: maxBetPerUser, 7: oracleType, 8: marketType, 9: currencyType,
    //  10: league (bytes32), 11: category (bytes32), 12: homeTeam (bytes32), 13: awayTeam (bytes32), 14: title (bytes32),
    //  15: leverage, 16: marketId (string), 17: isDynamicOdds]
    
    // ✅ FIXED: String fields are already hashed by backend, but we need to ensure they're bytes32
    // Backend sends: leagueHash, categoryHash, homeTeamHash, awayTeamHash, titleHash (indices 10-14)
    // These should already be bytes32 hashes, but we verify they're not plain strings
    
    // Note: Backend already hashes these, so we just pass them through
    // But if somehow they're still strings, we hash them
    const stringFieldIndices = parameters.length === 19 
      ? [6, 7, 9, 10, 11] // Factory: leagueHash, categoryHash, homeTeamHash, awayTeamHash, titleHash
      : [10, 11, 12, 13, 14]; // Diamond: league, category, homeTeam, awayTeam, title
    
    for (const paramIndex of stringFieldIndices) {
      if (paramIndex < parameters.length) {
        const paramValue = parameters[paramIndex];
        // If it's a string (not already hashed), hash it
        if (typeof paramValue === 'string' && paramValue.length > 0 && !paramValue.startsWith('0x')) {
          console.log(`🔤 Hashing parameter at index ${paramIndex}: "${paramValue}" -> bytes32`);
          hashedParameters[paramIndex] = ethers.keccak256(ethers.toUtf8Bytes(paramValue));
        }
      }
    }
    
    // ✅ FIXED: Updated marketId index for new parameter order
    // Diamond createPool (18 params): marketId at index 16 (string)
    // Factory createPoolWithBoost (19 params): marketId at index 17 (bytes32)
    const marketIdIndex = parameters.length === 19 ? 17 : 16;
    
    if (hashedParameters.length > marketIdIndex) {
      const marketId = hashedParameters[marketIdIndex];
      console.log(`🔍 MarketId before final check (index ${marketIdIndex}): ${marketId} (type: ${typeof marketId})`);
      
      // For Diamond (18 params), marketId should be a string
      if (parameters.length === 18) {
        if (typeof marketId === 'string' && marketId.startsWith('0x')) {
          console.log(`🔧 Converting hex marketId to string: ${marketId}`);
          // Try to parse as hex number first
          try {
            const numericValue = parseInt(marketId, 16);
            hashedParameters[marketIdIndex] = numericValue.toString();
          } catch {
            // If conversion fails, remove the 0x prefix
            hashedParameters[marketIdIndex] = marketId.replace('0x', '');
          }
        } else if (typeof marketId === 'number') {
          // If it's a number, convert to string
          hashedParameters[marketIdIndex] = marketId.toString();
        }
        console.log(`📝 Final marketId: ${hashedParameters[marketIdIndex]} (type: ${typeof hashedParameters[marketIdIndex]})`);
      } else {
        // Factory (19 params): marketId is bytes32, keep as is
        console.log(`📝 Factory marketId (bytes32): ${hashedParameters[marketIdIndex]}`);
      }
    }
    
    return hashedParameters;
  }

  /**
   * Execute the main transaction via wallet
   */
  private static async executeTransaction(
    transactionData: GuidedMarketTransactionData,
    walletClient: any,
    publicClient: any,
    address: Address,
    marketData?: CreateFootballMarketParams
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      console.log('🎯 Executing main transaction...');
      console.log('📋 Transaction details:', {
        contract: transactionData.contractAddress,
        function: transactionData.functionName,
        value: transactionData.value,
        gasEstimate: transactionData.gasEstimate
      });
      
      // ✅ FIXED: Ensure parameters is an array before processing
      if (!Array.isArray(transactionData.parameters)) {
        console.error('❌ transactionData.parameters is not an array in executeTransaction:', transactionData.parameters);
        throw new Error('Invalid transaction data: parameters must be an array');
      }
      
      // Hash string parameters for the optimized contract
      console.log('🔍 Raw parameters before hashing:', transactionData.parameters);
      console.log('🔍 Parameter count:', transactionData.parameters.length);
      const hashedParameters = this.hashStringParameters(transactionData.parameters);
      console.log('🔤 Hashed parameters:', hashedParameters);
      console.log('🔤 Hashed parameter count:', hashedParameters.length);
      
      // ✅ FIXED: Updated marketId index based on parameter count
      // Diamond createPool: marketId at index 16 (18 params total)
      // Factory createPoolWithBoost: marketId at index 17 (19 params total)
      const marketIdIndex = hashedParameters.length === 19 ? 17 : 16;
      
      // 🔧 DEBUG: Check the marketId parameter specifically
      if (hashedParameters.length > marketIdIndex) {
        console.log(`🔍 MarketId parameter (index ${marketIdIndex}):`, hashedParameters[marketIdIndex]);
        console.log('🔍 MarketId type:', typeof hashedParameters[marketIdIndex]);
        
        // 🔧 FINAL OVERRIDE: Force the marketId to be the fixture ID string
        if (marketData && hashedParameters[marketIdIndex] && hashedParameters[marketIdIndex] !== marketData.fixtureId) {
          console.log(`🔧 FINAL OVERRIDE: Replacing ${hashedParameters[marketIdIndex]} with ${marketData.fixtureId}`);
          hashedParameters[marketIdIndex] = marketData.fixtureId;
        }
      }
      
      // Execute the transaction with our gas limit override
      const gasLimit = BigInt(10000000); // Reduced gas limit for lightweight functions
      console.log('🔧 Overriding gas limit:', gasLimit.toString());
      
      const hash = await walletClient.writeContract({
        address: transactionData.contractAddress as Address,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: transactionData.functionName,
        args: hashedParameters,
        value: transactionData.value === '0' ? BigInt(0) : parseEther(transactionData.value),
        account: address,
        gas: gasLimit
      });
      
      console.log('⏳ Waiting for transaction confirmation...');
      
      // Wait for transaction confirmation using publicClient (correct wagmi v2 API)
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }
      
      console.log('✅ Transaction confirmed:', hash);
      return { success: true, hash };
      
    } catch (error) {
      console.error('❌ Transaction execution error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          return { success: false, error: 'User rejected transaction' };
        } else if (error.message.includes('insufficient funds')) {
          return { success: false, error: 'Insufficient funds for transaction' };
        } else if (error.message.includes('gas')) {
          return { success: false, error: 'Gas estimation failed. Please try again.' };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction execution failed'
      };
    }
  }
}

/**
 * React hook for guided market creation with wallet integration
 */
export function useGuidedMarketCreation() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const createFootballMarket = async (marketData: CreateFootballMarketParams) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    if (!walletClient) {
      throw new Error('Wallet client not available');
    }
    
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    return await GuidedMarketWalletService.createFootballMarketWithWallet(
      marketData,
      walletClient,
      publicClient,
      address
    );
  };
  
  return {
    createFootballMarket,
    isConnected,
    address,
    walletClient: !!walletClient,
    publicClient: !!publicClient
  };
}


