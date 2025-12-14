import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { biconomyService } from '@/services/biconomyService';
import type { BiconomyConfig } from '@/services/biconomyService';
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

  // Initialize Biconomy when wallet connects
  useEffect(() => {
    if (isConnected && walletClient && !isInitialized) {
      const init = async () => {
        try {
          // Create signer adapter for Biconomy
          // Biconomy expects a signer with specific methods
          const signerAdapter = {
            getAddress: async () => {
              const accounts = await walletClient.getAddresses();
              return accounts[0];
            },
            signMessage: async (message: string) => {
              const accounts = await walletClient.getAddresses();
              return await walletClient.signMessage({ 
                account: accounts[0],
                message 
              });
            },
            signTypedData: async (params: any) => {
              return await walletClient.signTypedData(params);
            },
          };
          
          await biconomyService.initialize(signerAdapter as any, config);

          const accountAddr = await biconomyService.getAccountAddress();
          setAccountAddress(accountAddr);
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize Biconomy:', error);
        }
      };

      init();
    } else if (!isConnected) {
      // Reset when wallet disconnects
      biconomyService.reset();
      setIsInitialized(false);
      setAccountAddress(null);
    }
  }, [isConnected, walletClient, isInitialized, config]);

  const initialize = useCallback(async (initConfig?: BiconomyConfig) => {
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    const signerAdapter = {
      getAddress: async () => {
        const accounts = await walletClient.getAddresses();
        return accounts[0];
      },
      signMessage: async (message: string) => {
        const accounts = await walletClient.getAddresses();
        return await walletClient.signMessage({ 
          account: accounts[0],
          message 
        });
      },
      signTypedData: async (params: any) => {
        return await walletClient.signTypedData(params);
      },
    };
    
    await biconomyService.initialize(signerAdapter as any, initConfig || config);

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
  };
}

