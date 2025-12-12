import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { executeContractCall, getTransactionOptions } from '@/lib/network-connection';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { formatTeamNamesForPool } from '@/utils/teamNameFormatter';

// Enhanced contract interaction hooks for modular architecture

// PRIX Token Contract Hooks
export function usePrixToken() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const approve = useCallback(async (spender: `0x${string}`, amount: bigint) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.PRIX_TOKEN,
        abi: CONTRACTS.PRIX_TOKEN.abi,
        functionName: 'approve',
        args: [spender, amount],
        ...getTransactionOptions(),
      });
      
      console.log('✅ PRIX approval transaction submitted:', txHash);
      toast.loading('Waiting for approval confirmation...', { id: 'prix-approval-wait' });
      
      // Wait for the approval transaction to be confirmed before proceeding
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status !== 'success') {
        console.error('❌ Approval transaction failed');
        toast.dismiss('prix-approval-wait');
        throw new Error('Approval transaction failed');
      }
      
      console.log('✅ PRIX approval confirmed on-chain');
      toast.success('PRIX tokens approved!', { id: 'prix-approval-wait' });
      return txHash;
    } catch (error) {
      console.error('Error approving PRIX:', error);
      toast.dismiss('prix-approval-wait');
      toast.error('Failed to approve PRIX');
      throw error;
    }
  }, [writeContractAsync, publicClient]);

  const getAllowance = useCallback(async (owner: `0x${string}`, spender: `0x${string}`) => {
    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.PRIX_TOKEN,
          abi: CONTRACTS.PRIX_TOKEN.abi,
          functionName: 'allowance',
          args: [owner, spender],
        });
      });
      return result as unknown as bigint;
    } catch (error) {
      console.error('Error getting PRIX allowance:', error);
      return 0n;
    }
  }, []);

  const getBalance = useCallback(async (account?: `0x${string}`) => {
    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.PRIX_TOKEN,
          abi: CONTRACTS.PRIX_TOKEN.abi,
          functionName: 'balanceOf',
          args: [account || address || '0x0'],
        });
      });
      return result as unknown as bigint;
    } catch (error) {
      console.error('Error getting PRIX balance:', error);
      return 0n;
    }
  }, [address]);

  return {
    approve,
    getAllowance,
    getBalance,
  };
}

// Pool Core Contract Hooks
export function usePoolCore() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { approve, getAllowance, getBalance } = usePrixToken();
  const publicClient = usePublicClient();

  const createPool = useCallback(async (poolData: {
    predictedOutcome: string;
    odds: bigint;
    creatorStake: bigint;
    eventStartTime: bigint;
    eventEndTime: bigint;
    league: string;
    category: string;
    isPrivate: boolean;
    maxBetPerUser: bigint;
    usePrix: boolean; // Legacy support
    currencyType?: 0 | 1 | 2; // ✅ NEW: 0=BNB, 1=PRIX, 2=USDT
    leverage?: 1 | 2 | 3 | 4 | 5; // ✅ NEW: 1x to 5x leverage
    isDynamicOdds?: boolean; // ✅ NEW: Dynamic odds mode
    oracleType: number;
    marketId: string;
    marketType: number;
    homeTeam?: string;
    awayTeam?: string;
    title?: string;
    enableBoost?: boolean; // ✅ FIX: Single tier boost system - 300 PRIX (150 PRIX with discount)
  }) => {
    try {
      // Convert predictedOutcome to bytes32 string (not hash) for proper storage and retrieval
      const predictedOutcomeBytes32 = poolData.predictedOutcome.startsWith('0x') 
        ? poolData.predictedOutcome 
        : ethers.encodeBytes32String(poolData.predictedOutcome.slice(0, 31)); // Truncate to fit bytes32
      
      // Market ID should be the original SportMonks fixture ID for guided markets
      // This ensures proper fixture mapping for settlement and easier backend processing
      const marketIdString = poolData.oracleType === 0 // GUIDED oracle
        ? poolData.marketId // Use original SportMonks fixture ID directly
        : poolData.marketId; // For custom markets, use as-is

      // Calculate total required amount (creation fee + creator stake + boost cost)
      // ✅ FIX: Match contract values - PRIX = 50e18, BNB = 1e16 (with discounts applied)
      const creationFeePRIX = 50n * 10n**18n; // 50 PRIX base fee (contract constant)
      const baseCreationFeeBNB = 1n * 10n**16n; // 0.01 BNB base fee (contract constant)
      
      // ✅ FIX: Boost cost is handled by contract (300 PRIX or 150 PRIX with discount)
      // Boost is paid in PRIX tokens, not BNB
      const hasBoost = poolData.enableBoost || false;
      
      // ✅ NEW: Calculate discount based on PRIX balance (applies to all pools, fee always in BNB)
      let creationFeeBNB = baseCreationFeeBNB;
      if (address) {
        try {
          const prixBalance = await getBalance();
          let discountMultiplier = 100n; // 100% = no discount
          
          // Apply discount based on PRIX balance (matching contract logic)
          if (prixBalance >= 500000n * 10n**18n) {
            discountMultiplier = 50n; // 50% discount
          } else if (prixBalance >= 200000n * 10n**18n) {
            discountMultiplier = 70n; // 30% discount
          } else if (prixBalance >= 50000n * 10n**18n) {
            discountMultiplier = 80n; // 20% discount
          } else if (prixBalance >= 5000n * 10n**18n) {
            discountMultiplier = 90n; // 10% discount
          }
          
          creationFeeBNB = (baseCreationFeeBNB * discountMultiplier) / 100n;
          
          if (discountMultiplier < 100n) {
            const discountPercent = 100n - discountMultiplier;
            console.log(`💰 PRIX Balance Discount Applied: ${discountPercent}% off (PRIX balance: ${prixBalance / BigInt(10**18)} PRIX)`);
            console.log(`   Base fee: ${baseCreationFeeBNB / BigInt(10**16)} BNB → Adjusted fee: ${creationFeeBNB / BigInt(10**16)} BNB`);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch PRIX balance for discount calculation, using base fee:', error);
          // Continue with base fee if balance check fails
        }
      }
      
      // ✅ FIX: Boost cost is 300 PRIX (or 150 PRIX with 100k+ PRIX balance discount)
      // Boost is always paid in PRIX tokens, not BNB
      const boostCostPRIX = hasBoost ? 300n * 10n**18n : 0n; // Max boost cost (contract applies discount)
      
      // ✅ FIX: For PRIX pools, totalRequired includes boost cost (paid in PRIX)
      // For BNB pools: totalRequired = creatorStake + creationFeeBNB (with discount applied)
      const totalRequired = poolData.usePrix 
        ? poolData.creatorStake + creationFeePRIX + boostCostPRIX  // Stake + fee + boost (all in PRIX)
        : poolData.creatorStake + creationFeeBNB;   // ✅ FIX: For BNB pools, use adjusted fee with discount
      
      // ✅ FIX: Transaction value calculation for factory
      // Factory expects: BNB pools = stake + fee, PRIX pools = fee only (stake via token transfer)
      // Boost cost is handled by factory (transfers PRIX from user)
      const transactionValue = poolData.usePrix 
        ? creationFeeBNB  // PRIX pools: only creation fee in BNB (stake + boost via PRIX transfer)
        : totalRequired; // BNB pools: creatorStake + creationFeeBNB (boost via PRIX transfer)
      
      // ✅ FIX: Boost is available for both BNB and PRIX pools
      // Boost is paid in PRIX tokens via the factory's createPoolWithBoost function

      // ✅ FIX: For BNB pools, check BNB balance before attempting transaction
      if (!poolData.usePrix && address) {
        console.log(`💰 BNB Pool Creation Flow Started`);
        console.log(`   Base Creation Fee: ${baseCreationFeeBNB / BigInt(10**16)} BNB`);
        console.log(`   Adjusted Creation Fee: ${creationFeeBNB / BigInt(10**16)} BNB`);
        console.log(`   Creator Stake: ${poolData.creatorStake / BigInt(10**18)} BNB`);
        console.log(`   Total Required: ${totalRequired / BigInt(10**18)} BNB`);
        
        // Check BNB balance
        const bnbBalance = await publicClient?.getBalance({ address });
        console.log(`🔍 BNB Balance Check: ${bnbBalance ? bnbBalance / BigInt(10**18) : 0} BNB (required: ${totalRequired / BigInt(10**18)} BNB)`);
        
        if (!bnbBalance || bnbBalance < totalRequired) {
          const shortfall = totalRequired - (bnbBalance || 0n);
          const errorMsg = `Insufficient BNB balance. You have ${bnbBalance ? bnbBalance / BigInt(10**18) : 0} BNB but need ${totalRequired / BigInt(10**18)} BNB (shortfall: ${shortfall / BigInt(10**18)} BNB)`;
          console.error(`❌ ${errorMsg}`);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log(`✅ BNB balance check passed: ${bnbBalance / BigInt(10**18)} BNB >= ${totalRequired / BigInt(10**18)} BNB`);
      }

      // For PRIX pools, we need to ensure the contract has sufficient allowance
      // The contract will handle the token transfer internally
      if (poolData.usePrix) {
        console.log(`💰 PRIX Pool Creation Flow Started`);
        console.log(`   Base Creation Fee: ${creationFeePRIX / BigInt(10**18)} PRIX (discounts may apply on-chain)`);
        console.log(`   Creator Stake: ${poolData.creatorStake / BigInt(10**18)} PRIX`);
        console.log(`   Total Required: ${totalRequired / BigInt(10**18)} PRIX`);
        if (boostCostPRIX > 0n) {
          console.log(`   Boost Cost: ${boostCostPRIX / BigInt(10**18)} PRIX (300 PRIX max, 150 PRIX with 100k+ PRIX discount)`);
        }
        
        // Check PRIX balance first (for creation fee + creator stake only, NOT boost cost)
        const balance = await getBalance();
        console.log(`🔍 PRIX Balance Check: ${balance / BigInt(10**18)} PRIX (required: ${totalRequired / BigInt(10**18)} PRIX)`);
        if (boostCostPRIX > 0n) {
          console.log(`   Note: Boost cost (${boostCostPRIX / BigInt(10**18)} PRIX max) is included in total required`);
        }
        
        if (balance < totalRequired) {
          const shortfall = totalRequired - balance;
          const errorMsg = `Insufficient PRIX balance. You have ${balance / BigInt(10**18)} PRIX but need ${totalRequired / BigInt(10**18)} PRIX (shortfall: ${shortfall / BigInt(10**18)} PRIX)`;
          console.error(`❌ ${errorMsg}`);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Note: Boost cost is handled by factory contract (paid in PRIX tokens)
        // No separate BNB balance check needed for boost
        
        console.log(`✅ Balance check passed`);
        
        // Check if we need to approve more tokens
        // ✅ FIX: For boosted pools, approve FACTORY (not POOL_CORE) since we're calling createPoolWithBoost
        const approvalTarget = hasBoost ? CONTRACT_ADDRESSES.FACTORY : CONTRACT_ADDRESSES.POOL_CORE;
        const currentAllowance = await getAllowance(address as `0x${string}`, approvalTarget);
        console.log(`🔍 PRIX Allowance Check:`, {
          currentAllowance: currentAllowance.toString(),
          currentAllowanceFormatted: `${currentAllowance / BigInt(10**18)} PRIX`,
          totalRequired: totalRequired.toString(),
          totalRequiredFormatted: `${totalRequired / BigInt(10**18)} PRIX`,
          needsApproval: currentAllowance < totalRequired,
          shortfall: currentAllowance < totalRequired ? (totalRequired - currentAllowance).toString() : '0'
        });
        
        if (currentAllowance < totalRequired) {
          const shortfall = totalRequired - currentAllowance;
          console.log(`⚠️ Insufficient allowance detected!`);
          console.log(`   Current: ${currentAllowance / BigInt(10**18)} PRIX`);
          console.log(`   Required: ${totalRequired / BigInt(10**18)} PRIX`);
          console.log(`   Shortfall: ${shortfall / BigInt(10**18)} PRIX`);
          console.log(`🔄 Requesting approval for ${totalRequired / BigInt(10**18)} PRIX tokens...`);
          
          toast.loading('Approving PRIX tokens for pool creation...', { id: 'prix-approval' });
          try {
            await approve(approvalTarget, totalRequired);
            console.log(`✅ Approval transaction confirmed`);
            toast.dismiss('prix-approval');
            toast.success('PRIX tokens approved for pool creation!');
            
            // 🚨 CRITICAL: Verify the approval was successful by checking allowance again
            // ✅ FIX: Check allowance for the correct target (FACTORY if boost, POOL_CORE otherwise)
            const newAllowance = await getAllowance(address as `0x${string}`, approvalTarget);
            console.log(`✅ New allowance after approval: ${newAllowance.toString()}`);
            console.log(`   Approval target: ${approvalTarget}`);
            console.log(`   Required: ${totalRequired.toString()}`);
            
            if (newAllowance < totalRequired) {
              throw new Error(`Approval failed: Allowance is still insufficient (${newAllowance} < ${totalRequired})`);
            }
          } catch (approveError) {
            toast.dismiss('prix-approval');
            console.error('❌ Error approving PRIX tokens:', approveError);
            toast.error('Failed to approve PRIX tokens for pool creation');
            throw approveError;
          }
        } else {
          console.log(`✅ Sufficient allowance already exists (${currentAllowance / BigInt(10**18)} PRIX >= ${totalRequired / BigInt(10**18)} PRIX)`);
          
          // 🚨 CRITICAL FIX: Even if allowance is "sufficient", it might be EXACTLY equal
          // If it's exactly equal or close, we should refresh it to avoid edge cases
          // This happens when a previous pool creation approved exactly this amount
          if (currentAllowance === totalRequired || currentAllowance < totalRequired + BigInt(10**18)) {
            console.log(`⚠️ Allowance is exactly equal or very close to required amount`);
            console.log(`   This might cause issues if there's any rounding or previous consumption`);
            console.log(`   Refreshing approval to ensure sufficient buffer...`);
            
            toast.loading('Refreshing PRIX token approval...', { id: 'prix-approval-refresh' });
            try {
              // Approve a larger amount to avoid this issue in future
              const bufferAmount = totalRequired * 2n; // Approve 2x to cover multiple pools
              await approve(CONTRACT_ADDRESSES.POOL_CORE, bufferAmount);
              console.log(`✅ Approval refreshed with buffer: ${bufferAmount / BigInt(10**18)} PRIX`);
              toast.dismiss('prix-approval-refresh');
              toast.success('PRIX tokens approved!');
              
              // Verify the new approval
              const newAllowance = await getAllowance(address as `0x${string}`, CONTRACT_ADDRESSES.POOL_CORE);
              console.log(`✅ New allowance after refresh: ${newAllowance / BigInt(10**18)} PRIX`);
              
              if (newAllowance < totalRequired) {
                throw new Error(`Approval refresh failed: Allowance is still insufficient`);
              }
            } catch (refreshError) {
              toast.dismiss('prix-approval-refresh');
              console.error('❌ Error refreshing approval:', refreshError);
              toast.error('Failed to refresh PRIX token approval');
              throw refreshError;
            }
          }
        }
      }

      console.log('Creating pool with parameters:', {
        predictedOutcomeBytes32,
        odds: poolData.odds,
        creatorStake: poolData.creatorStake,
        usePrix: poolData.usePrix,
        totalRequired,
        value: poolData.usePrix ? 0n : totalRequired
      });

      // Format team names to ensure they fit within bytes32 constraints
      console.log('🔍 Original team data:', {
        homeTeam: poolData.homeTeam,
        awayTeam: poolData.awayTeam,
        predictedOutcome: poolData.predictedOutcome
      });
      
      const teamNames = formatTeamNamesForPool(poolData.homeTeam || '', poolData.awayTeam || '');
      
      console.log('🔍 Formatted team data:', {
        homeTeam: teamNames.homeTeam,
        awayTeam: teamNames.awayTeam,
        warnings: teamNames.warnings
      });
      
      // Show warnings if team names were modified
      if (teamNames.warnings.length > 0) {
        console.warn('Team name formatting warnings:', teamNames.warnings);
        // Show user-friendly warnings
        teamNames.warnings.forEach(warning => {
          toast(warning, { 
            icon: '⚠️',
            duration: 5000,
            style: { background: '#fbbf24', color: '#1f2937' }
          });
        });
      }

      // ✅ NEW: Map legacy usePrix to currencyType if not provided
      const finalCurrencyType: 0 | 1 | 2 = poolData.currencyType !== undefined ? poolData.currencyType : (poolData.usePrix ? 1 : 0);
      const finalLeverage: 1 | 2 | 3 | 4 | 5 = poolData.leverage !== undefined ? poolData.leverage : 1;

      // Helper function to safely encode strings as bytes32
      const safeEncodeBytes32 = (str: string, fieldName: string): string => {
        if (!str) return ethers.encodeBytes32String('');
        
        // Truncate to ensure UTF-8 encoded bytes fit in 31 bytes (bytes32 = 32 bytes, last byte is null terminator)
        // We need to count bytes, not characters, since multi-byte UTF-8 chars (like ø) take more than 1 byte
        let truncated = '';
        let byteLength = 0;
        const maxBytes = 31; // bytes32 can hold 31 bytes of UTF-8 data (last byte is null terminator)
        
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          const charByteLength = new TextEncoder().encode(char).length;
          
          if (byteLength + charByteLength > maxBytes) {
            break; // Stop if adding this char would exceed max bytes
          }
          
          truncated += char;
          byteLength += charByteLength;
        }
        
        console.log(`🔍 Encoding ${fieldName}: "${truncated}" (${truncated.length} chars, ${byteLength} bytes)`);
        
        try {
          return ethers.encodeBytes32String(truncated);
        } catch (error) {
          console.error(`❌ Failed to encode ${fieldName}:`, error);
          // Fallback to empty string
          return ethers.encodeBytes32String('');
        }
      };
      
      // Encode strings as bytes32 (not hashed) for the updated contract
      console.log('🔍 String length validation before encoding:', {
        league: poolData.league.length,
        category: poolData.category.length,
        homeTeam: teamNames.homeTeam.length,
        awayTeam: teamNames.awayTeam.length,
        title: (poolData.title || '').length
      });
      
      const leagueBytes32 = safeEncodeBytes32(poolData.league, 'league');
      const categoryBytes32 = safeEncodeBytes32(poolData.category, 'category');
      const homeTeamBytes32 = safeEncodeBytes32(teamNames.homeTeam, 'homeTeam');
      const awayTeamBytes32 = safeEncodeBytes32(teamNames.awayTeam, 'awayTeam');
      const titleBytes32 = safeEncodeBytes32(poolData.title || '', 'title');
      
      console.log('🔍 Encoded data for contract:', {
        predictedOutcomeBytes32,
        leagueBytes32,
        categoryBytes32,
        homeTeamBytes32,
        awayTeamBytes32,
        titleBytes32,
        originalMarketId: poolData.marketId,
        marketIdString: marketIdString,
        isGuidedMarket: poolData.oracleType === 0
      });

      // Log critical validation info before sending transaction
      console.log('🔍 Pre-transaction validation:', {
        address: address,
        usePrix: poolData.usePrix,
        creatorStake: poolData.creatorStake.toString(),
        totalRequired: totalRequired.toString(),
        transactionValue: transactionValue.toString(),
        enableBoost: poolData.enableBoost,
        hasBoost,
        usingFactory: hasBoost,
        oracleType: poolData.oracleType,
        marketType: poolData.marketType,
        eventStartTime: new Date(Number(poolData.eventStartTime) * 1000).toISOString(),
        gracePeriodBuffer: Number(poolData.eventStartTime) - Math.floor(Date.now() / 1000),
      });

      // ✅ FIX: Use factory for pools with boost (both BNB and PRIX pools can be boosted)
      // Factory handles boost payment in PRIX tokens
      const shouldUseFactory = hasBoost; // Use factory if boost is enabled
      
      // ✅ DEBUG: Log transaction details before sending
      const abiToUse = shouldUseFactory ? CONTRACTS.FACTORY.abi : CONTRACTS.POOL_CORE.abi;
      const abiIsValid = Array.isArray(abiToUse);
      
      if (!abiIsValid) {
        const errorMsg = `❌ Invalid ABI format: Expected array, got ${typeof abiToUse}. The ABI extraction may have failed.`;
        console.error(errorMsg);
        console.error('ABI value:', abiToUse);
        throw new Error('Invalid ABI format. Please refresh the page and try again.');
      }
      
      console.log('🚀 Sending createPool transaction:', {
        shouldUseFactory,
        functionName: shouldUseFactory ? 'createPoolWithBoost' : 'createPool',
        address: shouldUseFactory ? CONTRACT_ADDRESSES.FACTORY : CONTRACT_ADDRESSES.POOL_CORE,
        abiIsValid: true,
        abiLength: abiToUse.length,
        argsCount: shouldUseFactory ? 19 : 18,
        value: shouldUseFactory ? transactionValue.toString() : (finalCurrencyType === 0 ? (poolData.creatorStake + creationFeeBNB).toString() : creationFeeBNB.toString()),
      });
      
      const txHash = shouldUseFactory
        ? await writeContractAsync({
            address: CONTRACT_ADDRESSES.FACTORY,
            abi: CONTRACTS.FACTORY.abi,
            functionName: 'createPoolWithBoost', // ✅ Use factory's createPoolWithBoost
            args: [
              predictedOutcomeBytes32,
              poolData.odds,
              poolData.creatorStake,
              poolData.eventStartTime,
              poolData.eventEndTime,
              leagueBytes32,
              categoryBytes32,
              ethers.encodeBytes32String(''), // region (empty for now)
              homeTeamBytes32,
              awayTeamBytes32,
              titleBytes32,
              poolData.isPrivate,
              poolData.maxBetPerUser,
              finalCurrencyType, // ✅ FIX: Use currencyType (0=BNB, 1=PRIX, 2=USDT) instead of usePrix bool
              finalLeverage, // ✅ FIX: Add leverage parameter
              poolData.oracleType,
              marketIdString,
              poolData.marketType,
              hasBoost, // ✅ FIX: Use hasBoost boolean (enableBoost flag)
            ],
            value: transactionValue, // For PRIX pools: value = creationFeeBNB, for BNB pools: value = totalRequired
            gas: BigInt(12000000), // Slightly higher gas for factory function
          })
        : await (async () => {
            // ✅ FIX: For PRIX pools, estimate gas first to catch revert reasons early
            if (poolData.usePrix && publicClient) {
              try {
                console.log('🔍 Estimating gas for PRIX pool creation...');
                const estimatedGas = await publicClient.estimateContractGas({
                  address: CONTRACT_ADDRESSES.POOL_CORE,
                  abi: CONTRACTS.POOL_CORE.abi,
                  functionName: 'createPool',
                  args: [
                    poolData.creatorStake,
                    Number(poolData.odds),
                    predictedOutcomeBytes32,
                    poolData.eventStartTime,
                    poolData.eventEndTime,
                    poolData.isPrivate,
                    poolData.maxBetPerUser,
                    poolData.oracleType,
                    poolData.marketType,
                    finalCurrencyType,
                    leagueBytes32,
                    categoryBytes32,
                    homeTeamBytes32,
                    awayTeamBytes32,
                    titleBytes32,
                    finalLeverage,
                    marketIdString,
                    poolData.isDynamicOdds || false,
                  ],
                  value: finalCurrencyType === 0 ? (poolData.creatorStake + creationFeeBNB) : creationFeeBNB,
                  account: address as `0x${string}`,
                });
                console.log(`✅ Gas estimate: ${estimatedGas.toString()}`);
                // Use estimated gas with 20% buffer
                return await writeContractAsync({
                  address: CONTRACT_ADDRESSES.POOL_CORE,
                  abi: CONTRACTS.POOL_CORE.abi,
                  functionName: 'createPool',
                  args: [
                    poolData.creatorStake,
                    Number(poolData.odds),
                    predictedOutcomeBytes32,
                    poolData.eventStartTime,
                    poolData.eventEndTime,
                    poolData.isPrivate,
                    poolData.maxBetPerUser,
                    poolData.oracleType,
                    poolData.marketType,
                    finalCurrencyType,
                    leagueBytes32,
                    categoryBytes32,
                    homeTeamBytes32,
                    awayTeamBytes32,
                    titleBytes32,
                    finalLeverage,
                    marketIdString,
                    poolData.isDynamicOdds || false,
                  ],
                  value: finalCurrencyType === 0 ? (poolData.creatorStake + creationFeeBNB) : creationFeeBNB,
                  gas: estimatedGas + (estimatedGas / 5n), // Add 20% buffer
                });
              } catch (gasError: any) {
                console.error('❌ Gas estimation failed:', gasError);
                console.error('   Full error object:', JSON.stringify(gasError, null, 2));
                console.error('   Error cause:', gasError.cause);
                console.error('   Error data:', gasError.data);
                
                // Try to extract the actual revert reason
                let actualError = gasError.message || '';
                
                // Check for nested error messages
                if (gasError.cause) {
                  const causeMsg = String(gasError.cause.message || gasError.cause).toLowerCase();
                  actualError = causeMsg;
                  console.error('   Cause message:', causeMsg);
                }
                
                // Check error data for revert reason
                if (gasError.data) {
                  console.error('   Error data:', gasError.data);
                  
                  // Try to decode as custom error first
                  if (gasError.data.length > 10) {
                    const errorSelector = gasError.data.slice(0, 10);
                    const errorParams = '0x' + gasError.data.slice(10);
                    
                    console.error('   Error selector:', errorSelector);
                    
                    // Common error selectors
                    // 0x08c379a0 = Error(string)
                    // 0x4e487b71 = Panic(uint256)
                    // Custom errors have different selectors
                    
                    if (errorSelector === '0x08c379a0') {
                      // Standard Error(string)
                      try {
                        const decoded = ethers.utils.defaultAbiCoder.decode(['string'], errorParams);
                        actualError = decoded[0];
                        console.error('   Decoded Error(string):', actualError);
                      } catch (e) {
                        console.error('   Could not decode Error(string)');
                      }
                    } else if (errorSelector === '0x4e487b71') {
                      // Panic(uint256)
                      try {
                        const decoded = ethers.utils.defaultAbiCoder.decode(['uint256'], errorParams);
                        const panicCode = decoded[0].toString();
                        const panicMessages: Record<string, string> = {
                          '0x01': 'assert(false)',
                          '0x11': 'arithmetic underflow/overflow',
                          '0x12': 'division by zero',
                          '0x21': 'converted a value that is too big',
                          '0x22': 'accessed storage byte array that is incorrectly encoded',
                          '0x31': 'called .pop() on an empty array',
                          '0x32': 'accessed an array at an out-of-bounds index',
                          '0x41': 'allocated too much memory',
                          '0x51': 'called a zero-initialized variable of internal function type'
                        };
                        actualError = `Panic: ${panicMessages[panicCode] || `Unknown panic code ${panicCode}`}`;
                        console.error('   Decoded Panic:', actualError);
                      } catch (e) {
                        console.error('   Could not decode Panic');
                      }
                    } else {
                      // Custom error - try common patterns
                      console.error('   Custom error detected, selector:', errorSelector);
                      console.error('   This might be a custom error from the PRIX token or Diamond contract');
                      console.error('   Error params:', errorParams);
                      
                      // Try to decode as ERC20InsufficientAllowance(address,uint256,uint256)
                      // Selector 0xfb8f41b2 = ERC20InsufficientAllowance
                      if (errorSelector === '0xfb8f41b2') {
                        try {
                          const decoded = ethers.utils.defaultAbiCoder.decode(
                            ['address', 'uint256', 'uint256'],
                            errorParams
                          );
                          console.error('   Decoded as ERC20InsufficientAllowance:');
                          console.error('     Spender:', decoded[0]);
                          console.error('     Current Allowance:', ethers.utils.formatEther(decoded[1]), 'PRIX');
                          console.error('     Needed:', ethers.utils.formatEther(decoded[2]), 'PRIX');
                          actualError = `Insufficient PRIX allowance: current ${ethers.utils.formatEther(decoded[1])} PRIX, needed ${ethers.utils.formatEther(decoded[2])} PRIX`;
                        } catch (e) {
                          console.error('   Could not decode ERC20InsufficientAllowance:', e.message);
                        }
                      }
                      
                      // Try to decode as InsufficientBalance(address,uint256,uint256)
                      try {
                        const decoded = ethers.utils.defaultAbiCoder.decode(
                          ['address', 'uint256', 'uint256'],
                          errorParams
                        );
                        console.error('   Decoded as InsufficientBalance:');
                        console.error('     Account:', decoded[0]);
                        console.error('     Required:', ethers.utils.formatEther(decoded[1]), 'PRIX');
                        console.error('     Available:', ethers.utils.formatEther(decoded[2]), 'PRIX');
                        if (!actualError) {
                          actualError = `Insufficient balance: required ${ethers.utils.formatEther(decoded[1])} PRIX, available ${ethers.utils.formatEther(decoded[2])} PRIX`;
                        }
                      } catch (e) {
                        // Not InsufficientBalance, try other patterns
                        console.error('   Could not decode as InsufficientBalance');
                      }
                    }
                  }
                }
                
                const errorMsg = actualError.toLowerCase();
                
                // Parse specific error messages
                if (errorMsg.includes('prix transfer failed') || errorMsg.includes('transferfrom') || errorMsg.includes('transfer from')) {
                  throw new Error('PRIX token transfer failed. Please check your PRIX balance and allowance.');
                }
                if (errorMsg.includes('insufficient') && (errorMsg.includes('stake') || errorMsg.includes('balance'))) {
                  throw new Error('Insufficient PRIX balance or stake. Please check your PRIX balance.');
                }
                if (errorMsg.includes('allowance') || errorMsg.includes('approve') || errorMsg.includes('insufficient allowance')) {
                  throw new Error('Insufficient PRIX allowance. Please approve more PRIX tokens.');
                }
                if (errorMsg.includes('incorrect') && errorMsg.includes('amount')) {
                  throw new Error('Incorrect PRIX amount. Please check the transaction parameters.');
                }
                if (errorMsg.includes('rpc endpoint') || errorMsg.includes('http client error')) {
                  // This is the masked error - try to get more info
                  console.error('⚠️ RPC error detected - this might mask the actual revert reason');
                  console.error('   The contract might be reverting, but the RPC is not returning the reason');
                  throw new Error('Transaction failed due to RPC error. The contract may be reverting. Please check: 1) PRIX balance is sufficient, 2) PRIX allowance is sufficient, 3) All parameters are valid.');
                }
                
                // Re-throw with more context
                throw new Error(`Transaction will fail: ${actualError || gasError.message}`);
              }
            }
            
            // Default path (BNB pools or if gas estimation skipped)
            return await writeContractAsync({
              address: CONTRACT_ADDRESSES.POOL_CORE,
              abi: CONTRACTS.POOL_CORE.abi,
              functionName: 'createPool',
              args: [
                poolData.creatorStake,
                Number(poolData.odds),
                predictedOutcomeBytes32,
                poolData.eventStartTime,
                poolData.eventEndTime,
                poolData.isPrivate,
                poolData.maxBetPerUser,
                poolData.oracleType,
                poolData.marketType,
                finalCurrencyType,
                leagueBytes32,
                categoryBytes32,
                homeTeamBytes32,
                awayTeamBytes32,
                titleBytes32,
                finalLeverage,
                marketIdString,
                poolData.isDynamicOdds || false,
              ],
              value: finalCurrencyType === 0 ? (poolData.creatorStake + creationFeeBNB) : creationFeeBNB,
              gas: BigInt(10000000),
              gasPrice: BigInt(3000000000),
            });
          })();
      
      console.log('✅ Pool creation transaction submitted:', txHash);
      // ✅ FIX: Return hash immediately so wagmi hooks can track transaction state
      // Don't wait for receipt here - let the component track it via useWaitForTransactionReceipt
      return txHash;
    } catch (error) {
      console.error('❌ Error creating pool:', error);
      
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.stack) {
          console.error('Error stack:', error.stack);
        }
        
        // Check for RPC-specific errors
        if (error.message.includes('RPC endpoint') || error.message.includes('HTTP client error')) {
          console.error('🔴 RPC Error detected - This is likely an RPC endpoint issue, not a contract issue');
          console.error('   The transaction parameters are correct, but the RPC call failed');
          console.error('   Possible causes:');
          console.error('   1. RPC endpoint is down or rate-limited');
          console.error('   2. Network connectivity issues');
          console.error('   3. Request timeout or malformed request');
          console.error('   4. ABI encoding issue (check if ABI is properly extracted)');
          console.error('   Try again in a few moments or check RPC endpoint status');
        }
        
        // Check for ABI-related errors
        if (error.message.includes('filter is not a function') || error.message.includes('r.filter')) {
          console.error('🔴 ABI Error detected - ABI extraction issue');
          console.error('   This suggests the ABI is not in the correct format');
          console.error('   The frontend needs to be rebuilt with the latest ABI extraction fix');
        }
      }
      
      // Dismiss loading toast
      toast.dismiss('pool-creation');
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient PRIX balance for pool creation');
        } else if (error.message.includes('allowance')) {
          toast.error('Insufficient PRIX allowance. Please approve more tokens.');
        } else if (error.message.includes('revert')) {
          toast.error('Transaction reverted. Check your parameters and try again.');
        } else if (error.message.includes('Transaction failed with status')) {
          toast.error('Transaction failed on-chain. Please check your parameters and try again.');
        } else if (error.message.includes('RPC endpoint') || error.message.includes('HTTP client error')) {
          toast.error('RPC endpoint error. The transaction was not sent. Please try again in a moment.');
        } else if (error.message.includes('filter is not a function')) {
          toast.error('ABI error detected. Please refresh the page and try again.');
        } else {
          toast.error(`Failed to create pool: ${error.message}`);
        }
      } else {
        toast.error('Failed to create pool. Please try again.');
      }
      
      throw error;
    }
  }, [writeContractAsync, address, getAllowance, approve, publicClient, getBalance]);

  const placeBet = useCallback(async (poolId: bigint, betAmount: bigint, usePrix: boolean = false) => {
    try {
      // For PRIX pools, check and handle approval first
      if (usePrix && address) {
        const currentAllowance = await getAllowance(address, CONTRACT_ADDRESSES.POOL_CORE);
        
        if (currentAllowance < betAmount) {
          console.log('PRIX approval needed for bet placement');
          toast.loading('Approving PRIX tokens...', { id: 'prix-approval' });
          
          await approve(CONTRACT_ADDRESSES.POOL_CORE, betAmount);
          toast.success('PRIX tokens approved!', { id: 'prix-approval' });
        }
      }
      
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.POOL_CORE,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'placeBet',
        args: [poolId, betAmount],
        value: usePrix ? 0n : betAmount, // Only send ETH if not using PRIX
        ...getTransactionOptions(),
      });
      
      console.log('Bet transaction submitted:', txHash);
      toast.loading('Waiting for bet confirmation...', { id: 'bet-placement' });
      
      // Wait for transaction confirmation
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status !== 'success') {
        throw new Error(`Bet transaction failed with status: ${receipt.status}`);
      }
      
      console.log('✅ Bet transaction confirmed:', txHash);
      toast.success('Bet placed successfully!', { id: 'bet-placement' });
      return txHash;
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.dismiss('bet-placement');
      toast.dismiss('prix-approval');
      
      if (error instanceof Error && error.message.includes('Transaction failed with status')) {
        toast.error('Bet transaction failed on-chain. Please try again.');
      } else if (error instanceof Error && error.message.includes('insufficient allowance')) {
        toast.error('Insufficient PRIX allowance. Please approve more tokens.');
      } else {
        toast.error('Failed to place bet');
      }
      throw error;
    }
  }, [writeContractAsync, publicClient, address, getAllowance, approve]);

  const settlePool = useCallback(async (poolId: bigint, outcome: string) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.POOL_CORE,
        abi: CONTRACTS.POOL_CORE.abi,
        functionName: 'settlePool',
        args: [poolId, outcome],
        ...getTransactionOptions(),
      });
      
      toast.success('Pool settled successfully!');
      return txHash;
    } catch (error) {
      console.error('Error settling pool:', error);
      toast.error('Failed to settle pool');
      throw error;
    }
  }, [writeContractAsync]);

  return {
    createPool,
    placeBet,
    settlePool,
  };
}

// Boost System Contract Hooks
export function useBoostSystem() {
  const { writeContractAsync } = useWriteContract();

  const boostPool = useCallback(async (poolId: bigint, boostTier: number) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.BOOST_SYSTEM,
        abi: CONTRACTS.BOOST_SYSTEM.abi,
        functionName: 'boostPool',
        args: [poolId, boostTier],
        ...getTransactionOptions(),
      });
      
      toast.success('Pool boosted successfully!');
      return txHash;
    } catch (error) {
      console.error('Error boosting pool:', error);
      toast.error('Failed to boost pool');
      throw error;
    }
  }, [writeContractAsync]);

  const canBoostPool = useCallback(async (poolId: bigint) => {
    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.BOOST_SYSTEM,
          abi: CONTRACTS.BOOST_SYSTEM.abi,
          functionName: 'canBoostPool',
          args: [poolId],
        });
      });
      return result as unknown as boolean;
    } catch (error) {
      console.error('Error checking boost eligibility:', error);
      return false;
    }
  }, []);

  return {
    boostPool,
    canBoostPool,
  };
}

// Factory Contract Hooks
export function usePoolFactory() {
  const { writeContractAsync } = useWriteContract();

  const createPoolWithBoost = useCallback(async (poolData: {
    predictedOutcome: string;
    odds: bigint;
    eventStartTime: bigint;
    eventEndTime: bigint;
    league: string;
    category: string;
    usePrix: boolean;
    maxBetPerUser?: bigint;
    isPrivate?: boolean;
    boostTier?: number;
  }) => {
    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.FACTORY,
        abi: CONTRACTS.FACTORY.abi,
        functionName: 'createPoolWithBoost',
        args: [
          poolData.predictedOutcome,
          poolData.odds,
          poolData.eventStartTime,
          poolData.eventEndTime,
          poolData.league,
          poolData.category,
          poolData.usePrix,
          poolData.maxBetPerUser || BigInt(0),
          poolData.isPrivate || false,
          poolData.boostTier || 0,
        ],
        ...getTransactionOptions(),
      });
      
      toast.success('Pool with boost created successfully!');
      return txHash;
    } catch (error) {
      console.error('Error creating pool with boost:', error);
      toast.error('Failed to create pool with boost');
      throw error;
    }
  }, [writeContractAsync]);

  return {
    createPoolWithBoost,
  };
}

// Reputation System Hooks
export function useReputationSystem() {
  const { address } = useAccount();
  const { writeContractAsync: _writeContractAsync } = useWriteContract();

  const getUserReputation = useCallback(async (userAddress?: string) => {
    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.REPUTATION_SYSTEM,
          abi: CONTRACTS.REPUTATION_SYSTEM.abi,
          functionName: 'getUserReputation',
          args: [userAddress || address || '0x0'],
        });
      });
      return result as unknown as {
        reputation: bigint;
        tier: number;
        influenceScore: bigint;
        streak: bigint;
        isVerified: boolean;
      };
    } catch (error) {
      console.error('Error getting user reputation:', error);
      return null;
    }
  }, [address]);

  const getUserStats = useCallback(async (userAddress?: string) => {
    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.REPUTATION_SYSTEM,
          abi: CONTRACTS.REPUTATION_SYSTEM.abi,
          functionName: 'getUserStats',
          args: [userAddress || address || '0x0'],
        });
      });
      return result as unknown as {
        totalPools: bigint;
        totalBets: bigint;
        totalWinnings: bigint;
        winRate: bigint;
        averageOdds: bigint;
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }, [address]);

  return {
    getUserReputation,
    getUserStats,
  };
}

// Faucet Hooks
export function useFaucet() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const claimFaucet = useCallback(async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.FAUCET,
        abi: CONTRACTS.FAUCET.abi,
        functionName: 'claimFaucet',
        args: [],
        ...getTransactionOptions(),
      });
      
      toast.success('Faucet claimed successfully!');
      return txHash;
    } catch (error) {
      console.error('Error claiming faucet:', error);
      toast.error('Failed to claim from faucet');
      throw error;
    }
  }, [address, writeContractAsync]);

  const checkEligibility = useCallback(async () => {
    if (!address) return false;

    try {
      const result = await executeContractCall(async (client) => {
        return await client.readContract({
          address: CONTRACT_ADDRESSES.FAUCET,
          abi: CONTRACTS.FAUCET.abi,
          functionName: 'checkEligibility',
          args: [address],
        });
      });
      return result as unknown as boolean;
    } catch (error) {
      console.error('Error checking faucet eligibility:', error);
      return false;
    }
  }, [address]);

  return {
    claimFaucet,
    checkEligibility,
  };
}

// Transaction status hook
export function useTransactionStatus(txHash?: `0x${string}`) {
  const { data: receipt, isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  return {
    receipt,
    isLoading,
    isSuccess,
    isError,
  };
}
