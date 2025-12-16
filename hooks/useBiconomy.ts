import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { biconomyService } from '@/services/biconomyService';
import type { BiconomyConfig, SessionKeyConfig, ActiveSession } from '@/services/biconomyService';
import type { Address } from 'viem';

// Type for composable instruction (from Biconomy)
type ComposableInstruction = any;

export interface UseBiconomyReturn {
  isInitialized: boolean;
  isReady: boolean;
  accountAddress: Address | null;
  initialize: (config?: BiconomyConfig) => Promise<void>;
  buildComposable: (params: {
    to: Address;
    abi: any[];
    functionName: string;
    args: any[];
    value?: bigint;
    chainId?: number;
  }) => Promise<ComposableInstruction>;
  executeApproveAndExecute: (params: {
    tokenAddress: Address;
    spender: Address;
    approveAmount: bigint;
    executeInstruction: ComposableInstruction;
    feeToken?: {
      address: Address;
      chainId: number;
    };
    trigger?: any;
  }) => Promise<{ hash: string; receipt: any }>;
  executeBatch: (instructions: ComposableInstruction[]) => Promise<{ hash: string; receipt: any }>;
  getMeeScanLink: (hash: string) => string;
  reset: () => void;
  // Session Keys
  createSession: (config: SessionKeyConfig) => Promise<ActiveSession>;
  executeWithSession: (params: {
    instruction: ComposableInstruction;
    contractAddress?: Address;
    value?: bigint;
  }) => Promise<{ hash: string; receipt: any }>;
  hasActiveSession: (contractAddress?: Address, value?: bigint) => boolean;
  getActiveSessions: () => ActiveSession[];
  revokeSession: (sessionKey: Address) => boolean;
  revokeAllSessions: () => void;
}

/**
 * Hook for Biconomy Supertransactions (Account Abstraction)
 * 
 * Features:
 * - Single signature for approve + execute
 * - Batch multiple transactions
 * - Gasless transactions (optional)
 * - Better UX with account abstraction
 * 
 * @example
 * ```tsx
 * const { isReady, executeApproveAndExecute } = useBiconomy();
 * 
 * // Single signature approve + execute
 * const result = await executeApproveAndExecute({
 *   tokenAddress: '0x...',
 *   spender: CONTRACTS.GAUNLET.address,
 *   approveAmount: parseUnits('100', 18),
 *   executeInstruction: await buildComposable({...}),
 * });
 * ```
 */
export function useBiconomy(config?: BiconomyConfig): UseBiconomyReturn {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [accountAddress, setAccountAddress] = useState<Address | null>(null);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // Initialize Biconomy when wallet connects - ONLY ONCE
  useEffect(() => {
    // Prevent multiple initializations - strict guard
    if (initializationAttempted || isInitialized) {
      return;
    }

    if (isConnected && walletClient && walletClient.account) {
      setInitializationAttempted(true);
      
      const init = async () => {
        try {
          console.log('🔄 Initializing Biconomy...', { 
            address: walletClient.account?.address 
          });

          // ✅ According to Biconomy docs, signer should be a viem Account
          // We pass the walletClient.account directly
          const signer = walletClient.account;
          
          await biconomyService.initialize(signer as any, config);

          const accountAddr = await biconomyService.getAccountAddress();
          setAccountAddress(accountAddr);
          setIsInitialized(true);
          console.log('✅ Biconomy initialized successfully', { accountAddr });
        } catch (error) {
          console.error('❌ Failed to initialize Biconomy:', error);
          setInitializationAttempted(false); // Allow retry on error
        }
      };

      init();
    } else if (!isConnected) {
      // Reset when wallet disconnects
      biconomyService.reset();
      setIsInitialized(false);
      setAccountAddress(null);
      setInitializationAttempted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, walletClient?.account?.address]); // Only depend on connection state and address

  const initialize = useCallback(async (initConfig?: BiconomyConfig) => {
    if (!walletClient || !walletClient.account) {
      throw new Error('Wallet not connected or no account');
    }

    // ✅ Pass viem account directly as signer
    const signer = walletClient.account;
    
    await biconomyService.initialize(signer, initConfig || config);

    const accountAddr = await biconomyService.getAccountAddress();
    setAccountAddress(accountAddr);
    setIsInitialized(true);
  }, [walletClient, config]);

  const buildComposable = useCallback(async (params: {
    to: Address;
    abi: any[];
    functionName: string;
    args: any[];
    value?: bigint;
    chainId?: number;
  }) => {
    return await biconomyService.buildComposable(params);
  }, []);

  const executeApproveAndExecute = useCallback(async (params: {
    tokenAddress: Address;
    spender: Address;
    approveAmount: bigint;
    executeInstruction: ComposableInstruction;
    feeToken?: {
      address: Address;
      chainId: number;
    };
    trigger?: any;
  }) => {
    return await biconomyService.executeApproveAndExecute(params);
  }, []);

  const executeBatch = useCallback(async (instructions: ComposableInstruction[]) => {
    return await biconomyService.executeBatch(instructions);
  }, []);

  const getMeeScanLink = useCallback((hash: string) => {
    return biconomyService.getMeeScanLink(hash);
  }, []);

  const reset = useCallback(() => {
    biconomyService.reset();
    setIsInitialized(false);
    setAccountAddress(null);
  }, []);

  // Session key methods
  const createSession = useCallback(async (config: SessionKeyConfig) => {
    return await biconomyService.createSessionKey(config);
  }, []);

  const executeWithSession = useCallback(async (params: {
    instruction: ComposableInstruction;
    contractAddress?: Address;
    value?: bigint;
  }) => {
    return await biconomyService.executeWithSession(params);
  }, []);

  const hasActiveSession = useCallback((contractAddress?: Address, value?: bigint) => {
    return biconomyService.hasActiveSession(contractAddress, value);
  }, []);

  const getActiveSessions = useCallback(() => {
    return biconomyService.getActiveSessions();
  }, []);

  const revokeSession = useCallback((sessionKey: Address) => {
    return biconomyService.revokeSession(sessionKey);
  }, []);

  const revokeAllSessions = useCallback(() => {
    biconomyService.revokeAllSessions();
  }, []);

  return {
    isInitialized,
    isReady: biconomyService.isReady(),
    accountAddress,
    initialize,
    buildComposable,
    executeApproveAndExecute,
    executeBatch,
    getMeeScanLink,
    reset,
    // Session Keys
    createSession,
    executeWithSession,
    hasActiveSession,
    getActiveSessions,
    revokeSession,
    revokeAllSessions,
  };
}

