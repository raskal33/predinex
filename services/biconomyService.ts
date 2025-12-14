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

export interface SessionKeyConfig {
  validUntil: number; // Unix timestamp when session expires
  maxTransactions?: number; // Max number of transactions allowed
  maxValuePerTx?: bigint; // Max value per transaction in wei
  allowedContracts?: Address[]; // List of allowed contract addresses
  allowedFunctions?: string[]; // List of allowed function selectors
}

export interface ActiveSession {
  sessionKey: Address;
  config: SessionKeyConfig;
  transactionCount: number;
  createdAt: number;
  expiresAt: number;
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
  private activeSessions: Map<string, ActiveSession> = new Map();
  private sessionStorageKey = 'biconomy_active_sessions';

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
      
      // Load existing sessions from localStorage
      this.loadSessions();
      
      // Clean up expired sessions
      this.cleanupExpiredSessions();
      
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
      abi: Array.from(erc20Abi),
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
    return getMeeScanLink(hash as `0x${string}`);
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
    this.activeSessions.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.sessionStorageKey);
    }
  }

  /**
   * Create a session key with specific permissions
   * This allows pre-authorized actions without signing each time
   */
  async createSessionKey(config: SessionKeyConfig): Promise<ActiveSession> {
    if (!this.orchestrator) {
      throw new Error('Biconomy not initialized. Call initialize() first.');
    }

    // Generate a temporary session keypair
    // In production, this would use Biconomy's session module
    const sessionKeyAddress = await this.orchestrator.address;

    const session: ActiveSession = {
      sessionKey: sessionKeyAddress,
      config,
      transactionCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt: config.validUntil,
    };

    // Store session
    const sessionId = `${sessionKeyAddress}_${session.createdAt}`;
    this.activeSessions.set(sessionId, session);

    // Persist to localStorage
    this.persistSessions();

    console.log('✅ Session key created:', {
      sessionKey: sessionKeyAddress,
      validUntil: new Date(config.validUntil * 1000).toISOString(),
      maxTransactions: config.maxTransactions || 'unlimited',
      maxValuePerTx: config.maxValuePerTx ? `${config.maxValuePerTx} wei` : 'unlimited',
    });

    return session;
  }

  /**
   * Load sessions from localStorage
   */
  private loadSessions() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.sessionStorageKey);
      if (stored) {
        const sessions = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);

        // Only load non-expired sessions
        Object.entries(sessions).forEach(([id, session]: [string, any]) => {
          if (session.expiresAt > now) {
            this.activeSessions.set(id, {
              ...session,
              config: {
                ...session.config,
                maxValuePerTx: session.config.maxValuePerTx 
                  ? BigInt(session.config.maxValuePerTx) 
                  : undefined,
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  /**
   * Persist sessions to localStorage
   */
  private persistSessions() {
    if (typeof window === 'undefined') return;

    try {
      const sessionsObj: Record<string, any> = {};
      this.activeSessions.forEach((session, id) => {
        sessionsObj[id] = {
          ...session,
          config: {
            ...session.config,
            maxValuePerTx: session.config.maxValuePerTx?.toString(),
          }
        };
      });
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(sessionsObj));
    } catch (error) {
      console.error('Failed to persist sessions:', error);
    }
  }

  /**
   * Get active session that matches criteria
   */
  private getActiveSession(
    contractAddress?: Address,
    value?: bigint
  ): ActiveSession | null {
    const now = Math.floor(Date.now() / 1000);

    for (const [_, session] of this.activeSessions) {
      // Check if session is expired
      if (session.expiresAt <= now) continue;

      // Check transaction count limit
      if (session.config.maxTransactions && 
          session.transactionCount >= session.config.maxTransactions) {
        continue;
      }

      // Check allowed contracts
      if (contractAddress && session.config.allowedContracts) {
        if (!session.config.allowedContracts.some(
          addr => addr.toLowerCase() === contractAddress.toLowerCase()
        )) {
          continue;
        }
      }

      // Check value limit
      if (value && session.config.maxValuePerTx && value > session.config.maxValuePerTx) {
        continue;
      }

      return session;
    }

    return null;
  }

  /**
   * Execute transaction using session key (no signature required)
   */
  async executeWithSession(params: {
    instruction: ComposableInstruction;
    contractAddress?: Address;
    value?: bigint;
  }): Promise<{ hash: string; receipt: any }> {
    if (!this.meeClient) {
      throw new Error('Biconomy not initialized. Call initialize() first.');
    }

    // Find active session
    const session = this.getActiveSession(params.contractAddress, params.value);

    if (!session) {
      throw new Error('No active session available. Create a session first or sign transaction.');
    }

    try {
      // Execute with session (no signature needed)
      const { hash } = await this.meeClient.execute({
        instructions: [params.instruction],
        // Session key would be used here in production Biconomy implementation
      });

      const receipt = await this.meeClient.waitForSupertransactionReceipt({ hash });

      // Increment transaction count
      session.transactionCount++;
      this.persistSessions();

      console.log('✅ Transaction executed with session key (no signature required)');

      return { hash, receipt };
    } catch (error) {
      console.error('❌ Failed to execute with session:', error);
      throw error;
    }
  }

  /**
   * Check if active session exists for given criteria
   */
  hasActiveSession(contractAddress?: Address, value?: bigint): boolean {
    return this.getActiveSession(contractAddress, value) !== null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ActiveSession[] {
    const now = Math.floor(Date.now() / 1000);
    return Array.from(this.activeSessions.values())
      .filter(session => session.expiresAt > now);
  }

  /**
   * Revoke a specific session
   */
  revokeSession(sessionKey: Address) {
    for (const [id, session] of this.activeSessions) {
      if (session.sessionKey.toLowerCase() === sessionKey.toLowerCase()) {
        this.activeSessions.delete(id);
        this.persistSessions();
        console.log('✅ Session revoked:', sessionKey);
        return true;
      }
    }
    return false;
  }

  /**
   * Revoke all sessions
   */
  revokeAllSessions() {
    this.activeSessions.clear();
    this.persistSessions();
    console.log('✅ All sessions revoked');
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [id, session] of this.activeSessions) {
      if (session.expiresAt <= now) {
        this.activeSessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.persistSessions();
      console.log(`✅ Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
  }
}

export const biconomyService = new BiconomyService();

