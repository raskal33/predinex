import { 
  createMeeClient, 
  getMeeScanLink, 
  toMultichainNexusAccount, 
  type Trigger, 
  getMEEVersion, 
  MEEVersion,
} from "@biconomy/abstractjs";

// Type for composable instruction
type ComposableInstruction = any;
import { http, parseAbi, type Hex, type Address } from "viem";
import { bscTestnetNetwork } from '@/config/wagmi';

// BSC Testnet chain configuration for Biconomy
const bscTestnet = {
  id: Number(bscTestnetNetwork.id),
  name: bscTestnetNetwork.name,
  nativeCurrency: bscTestnetNetwork.nativeCurrency,
  rpcUrls: bscTestnetNetwork.rpcUrls,
  blockExplorers: bscTestnetNetwork.blockExplorers,
  testnet: bscTestnetNetwork.testnet,
};

export interface BiconomyConfig {
  apiKey?: string; // Optional: Biconomy API key (safe to expose client-side)
  projectId?: string; // Optional: Biconomy Project ID (if needed)
  enableGasless?: boolean; // Enable gasless transactions
  sponsorGas?: boolean; // Sponsor gas for users
}

export interface BatchTransaction {
  to: Address;
  value?: bigint;
  data: Hex;
  abi?: any[];
  functionName?: string;
  args?: any[];
}

class BiconomyService {
  private meeClient: any = null;
  private orchestrator: any = null;
  private isInitialized = false;
  private config: BiconomyConfig = {};

  /**
   * Initialize Biconomy with wallet signer
   */
  async initialize(signer: any, config: BiconomyConfig = {}) {
    if (this.isInitialized && this.orchestrator) {
      return;
    }

    this.config = config;

    try {
      // Create orchestrator account (smart account)
      this.orchestrator = await toMultichainNexusAccount({
        signer,
        chainConfigurations: [
          {
            chain: bscTestnet,
            transport: http(),
            version: getMEEVersion(MEEVersion.V2_1_0)
          }
        ]
      });

      // Create MEE client
      // Note: API key is safe to expose client-side - Biconomy uses it for
      // authentication and rate limiting, but it doesn't grant sensitive access
      this.meeClient = await createMeeClient({
        account: this.orchestrator,
        apiKey: config.apiKey,
        // Project ID can be used if Biconomy requires it
        ...(config.projectId && { projectId: config.projectId })
      });

      this.isInitialized = true;
      console.log('✅ Biconomy initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Biconomy:', error);
      throw error;
    }
  }

  /**
   * Build a composable instruction for contract interaction
   */
  async buildComposable(params: {
    to: Address;
    abi: any[];
    functionName: string;
    args: any[];
    value?: bigint;
    chainId?: number;
  }): Promise<ComposableInstruction> {
    if (!this.orchestrator) {
      throw new Error('Biconomy not initialized. Call initialize() first.');
    }

    return await this.orchestrator.buildComposable({
      type: 'default',
      data: {
        abi: params.abi,
        chainId: params.chainId || Number(bscTestnetNetwork.id),
        to: params.to,
        functionName: params.functionName,
        args: params.args,
        value: params.value || 0n,
      }
    });
  }

  /**
   * Build approve instruction for ERC20 token
   */
  async buildApproveInstruction(
    tokenAddress: Address,
    spender: Address,
    amount: bigint,
    chainId?: number
  ): Promise<ComposableInstruction> {
    const erc20Abi = parseAbi([
      'function approve(address spender, uint256 amount) external returns (bool)'
    ]);

    return await this.buildComposable({
      to: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
      chainId,
    });
  }

  /**
   * Execute single signature approve + execute (supertransaction)
   * This combines approve and execute in a single user signature
   */
  async executeApproveAndExecute(params: {
    tokenAddress: Address;
    spender: Address;
    approveAmount: bigint;
    executeInstruction: ComposableInstruction;
    feeToken?: {
      address: Address;
      chainId: number;
    };
    trigger?: Trigger;
  }): Promise<{ hash: string; receipt: any }> {
    if (!this.meeClient || !this.orchestrator) {
      throw new Error('Biconomy not initialized. Call initialize() first.');
    }

    // Build approve instruction
    const approve = await this.buildApproveInstruction(
      params.tokenAddress,
      params.spender,
      params.approveAmount,
      params.feeToken?.chainId
    );

    // Combine approve + execute
    const instructions = [approve, params.executeInstruction];

    // Get fusion quote (for gasless/sponsored transactions)
    if (this.config.enableGasless && params.feeToken && params.trigger) {
      const fusionQuote = await this.meeClient.getFusionQuote({
        instructions,
        trigger: params.trigger,
        feeToken: params.feeToken
      });

      const { hash } = await this.meeClient.executeFusionQuote({
        fusionQuote
      });

      const receipt = await this.meeClient.waitForSupertransactionReceipt({ hash });

      return { hash, receipt };
    } else {
      // Regular batched transaction (user pays gas)
      const { hash } = await this.meeClient.execute({
        instructions
      });

      const receipt = await this.meeClient.waitForSupertransactionReceipt({ hash });

      return { hash, receipt };
    }
  }

  /**
   * Execute batch of transactions with single signature
   */
  async executeBatch(instructions: ComposableInstruction[]): Promise<{ hash: string; receipt: any }> {
    if (!this.meeClient) {
      throw new Error('Biconomy not initialized. Call initialize() first.');
    }

    const { hash } = await this.meeClient.execute({
      instructions
    });

    const receipt = await this.meeClient.waitForSupertransactionReceipt({ hash });

    return { hash, receipt };
  }

  /**
   * Get MEE scan link for transaction
   */
  getMeeScanLink(hash: string): string {
    return getMeeScanLink(hash);
  }

  /**
   * Check if Biconomy is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.meeClient !== null && this.orchestrator !== null;
  }

  /**
   * Get orchestrator account address
   */
  async getAccountAddress(): Promise<Address | null> {
    if (!this.orchestrator) return null;
    return await this.orchestrator.address;
  }

  /**
   * Reset/cleanup
   */
  reset() {
    this.meeClient = null;
    this.orchestrator = null;
    this.isInitialized = false;
  }
}

export const biconomyService = new BiconomyService();

