import { CONTRACTS } from '@/contracts';
import { bscTestnetNetwork } from '@/config/wagmi';
import { 
  createPublicClient, 
  http, 
  formatEther, 
  parseEther,
  defineChain,
  type Address,
  type PublicClient
} from 'viem';

// Use BSC Testnet from wagmi config
const bscTestnet = defineChain({
  id: Number(bscTestnetNetwork.id),
  name: bscTestnetNetwork.name,
  nativeCurrency: bscTestnetNetwork.nativeCurrency,
  rpcUrls: bscTestnetNetwork.rpcUrls,
  blockExplorers: bscTestnetNetwork.blockExplorers,
  testnet: bscTestnetNetwork.testnet,
});

// Contract-based interfaces (matching Gaunlet.sol)
export interface GaunletMatch {
  id: bigint;
  startTime: bigint;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  oddsOver: number;
  oddsUnder: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  result?: {
    moneyline: number; // 0=NotSet, 1=HomeWin, 2=Draw, 3=AwayWin
    overUnder: number; // 0=NotSet, 1=Over, 2=Under
  };
}

export interface GaunletUserPrediction {
  matchId: bigint;
  betType: number; // 0=MONEYLINE, 1=OVER_UNDER
  selection: string; // "1", "X", "2", "Over", "Under"
  selectedOdd: number;
}

export interface GaunletSlip {
  id?: number;
  player: Address;
  poolId: number;
  placedAt: number;
  matchCount: number;
  predictions: GaunletUserPrediction[];
  finalOdds: bigint;
  correctCount: number;
  isEvaluated: boolean;
}

export interface GaunletPool {
  poolId: number;
  creator: Address;
  creatorStake: bigint;
  entryFee: bigint;
  hardCap: bigint;
  maxEntries: bigint;
  matchCount: number;
  firstMatchStartTime: bigint;
  startTime: bigint;
  totalEntryRevenue: bigint;
  slipCount: number;
  state: number; // 0=NotCreated, 1=Active, 2=Ended, 3=Resolved, 4=Settled
  isSettled: boolean;
  winner: Address | null;
  winnerSlipId: bigint | null;
  matches?: GaunletMatch[];
}

class GaunletService {
  private publicClient: PublicClient | null = null;

  constructor() {
    this.publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http()
    });
  }

  /**
   * Get public client
   */
  getPublicClient(): PublicClient {
    if (!this.publicClient) {
      this.publicClient = createPublicClient({
        chain: bscTestnet,
        transport: http()
      });
    }
    return this.publicClient;
  }

  /**
   * Get pool count
   */
  async getPoolCount(): Promise<number> {
    try {
      const client = this.getPublicClient();
      const count = await client.readContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'poolCount',
        args: [],
      });
      return Number(count);
    } catch (error) {
      console.error('Error getting pool count:', error);
      return 0;
    }
  }

  /**
   * Get pool data
   */
  async getPool(poolId: number): Promise<GaunletPool | null> {
    try {
      const client = this.getPublicClient();
      const pool = await client.readContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'getPool',
        args: [BigInt(poolId)],
      }) as any;

      if (!pool || (Array.isArray(pool) && pool.length === 0) || 
          (typeof pool === 'object' && pool.creator === '0x0000000000000000000000000000000000000000')) {
        return null;
      }

      // Handle both array and object returns
      const poolData = Array.isArray(pool) ? {
        creator: pool[0],
        creatorStake: pool[1],
        entryFee: pool[2],
        hardCap: pool[3],
        maxEntries: pool[4],
        matchCount: pool[5],
        firstMatchStartTime: pool[6],
        startTime: pool[7],
        totalEntryRevenue: pool[8],
        slipCount: pool[9],
        state: pool[10],
        isSettled: pool[11],
        winner: pool[12],
        winnerSlipId: pool[13],
      } : pool;

      return {
        poolId,
        creator: poolData.creator as Address,
        creatorStake: poolData.creatorStake as bigint,
        entryFee: poolData.entryFee as bigint,
        hardCap: poolData.hardCap as bigint,
        maxEntries: poolData.maxEntries as bigint,
        matchCount: Number(poolData.matchCount),
        firstMatchStartTime: poolData.firstMatchStartTime as bigint,
        startTime: poolData.startTime as bigint,
        totalEntryRevenue: poolData.totalEntryRevenue as bigint,
        slipCount: Number(poolData.slipCount),
        state: Number(poolData.state),
        isSettled: poolData.isSettled as boolean,
        winner: poolData.winner && poolData.winner !== '0x0000000000000000000000000000000000000000' 
          ? poolData.winner as Address 
          : null,
        winnerSlipId: poolData.winnerSlipId && poolData.winnerSlipId > 0n 
          ? poolData.winnerSlipId as bigint 
          : null,
      };
    } catch (error) {
      console.error('Error getting pool:', error);
      return null;
    }
  }

  /**
   * Get slip data
   */
  async getSlip(slipId: number): Promise<GaunletSlip | null> {
    try {
      const client = this.getPublicClient();
      const slip = await client.readContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'getSlip',
        args: [BigInt(slipId)],
      }) as any;

      if (!slip || (Array.isArray(slip) && slip.length === 0) ||
          (typeof slip === 'object' && slip.player === '0x0000000000000000000000000000000000000000')) {
        return null;
      }

      // Handle both array and object returns
      const slipData = Array.isArray(slip) ? {
        player: slip[0],
        poolId: slip[1],
        placedAt: slip[2],
        matchCount: slip[3],
        finalOdds: slip[4],
        correctCount: slip[5],
        isEvaluated: slip[6],
      } : slip;

      return {
        id: slipId,
        player: slipData.player as Address,
        poolId: Number(slipData.poolId),
        placedAt: Number(slipData.placedAt),
        matchCount: Number(slipData.matchCount),
        predictions: [], // Predictions not directly accessible from contract
        finalOdds: slipData.finalOdds as bigint,
        correctCount: Number(slipData.correctCount),
        isEvaluated: slipData.isEvaluated as boolean,
      };
    } catch (error) {
      console.error('Error getting slip:', error);
      return null;
    }
  }

  /**
   * Get all pools
   */
  async getAllPools(): Promise<GaunletPool[]> {
    try {
      const poolCount = await this.getPoolCount();
      const pools: GaunletPool[] = [];

      for (let i = 1; i <= poolCount; i++) {
        const pool = await this.getPool(i);
        if (pool) {
          pools.push(pool);
        }
      }

      return pools;
    } catch (error) {
      console.error('Error getting all pools:', error);
      return [];
    }
  }

  /**
   * Get active pools
   */
  async getActivePools(): Promise<GaunletPool[]> {
    try {
      const allPools = await this.getAllPools();
      return allPools.filter(pool => pool.state === 1); // Active = 1
    } catch (error) {
      console.error('Error getting active pools:', error);
      return [];
    }
  }

  /**
   * Get pools by creator
   */
  async getPoolsByCreator(creator: Address): Promise<GaunletPool[]> {
    try {
      const allPools = await this.getAllPools();
      return allPools.filter(pool => 
        pool.creator.toLowerCase() === creator.toLowerCase()
      );
    } catch (error) {
      console.error('Error getting pools by creator:', error);
      return [];
    }
  }

  /**
   * Calculate creator fee percentage
   */
  async calculateCreatorFeePercentage(poolId: number): Promise<number> {
    try {
      const client = this.getPublicClient();
      const feePercentage = await client.readContract({
        ...CONTRACTS.GAUNLET,
        functionName: 'calculateCreatorFeePercentage',
        args: [BigInt(poolId)],
      });
      return Number(feePercentage);
    } catch (error) {
      console.error('Error calculating creator fee:', error);
      return 0;
    }
  }

  /**
   * Format BNB amount
   */
  formatBNB(amount: bigint): string {
    return formatEther(amount);
  }

  /**
   * Parse BNB amount
   */
  parseBNB(amount: string): bigint {
    return parseEther(amount);
  }

  /**
   * Get pool state name
   */
  getPoolStateName(state: number): string {
    const states = ['NotCreated', 'Active', 'Ended', 'Resolved', 'Settled'];
    return states[state] || 'Unknown';
  }

  /**
   * Check if pool is active
   */
  isPoolActive(pool: GaunletPool): boolean {
    return pool.state === 1 && !pool.isSettled;
  }

  /**
   * Check if betting is open
   */
  isBettingOpen(pool: GaunletPool): boolean {
    if (!this.isPoolActive(pool)) return false;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now < pool.firstMatchStartTime;
  }

  /**
   * Get time until betting closes
   */
  getTimeUntilBettingCloses(pool: GaunletPool): number {
    const now = Math.floor(Date.now() / 1000);
    const closesAt = Number(pool.firstMatchStartTime);
    return Math.max(0, closesAt - now);
  }

  /**
   * Get fill percentage
   */
  getFillPercentage(pool: GaunletPool): number {
    if (pool.maxEntries === 0n) return 0;
    return (Number(pool.slipCount) / Number(pool.maxEntries)) * 100;
  }

  /**
   * Get estimated creator fee
   */
  async getEstimatedCreatorFee(pool: GaunletPool): Promise<bigint> {
    try {
      const feePercentage = await this.calculateCreatorFeePercentage(pool.poolId);
      const fee = (pool.totalEntryRevenue * BigInt(feePercentage)) / 10000n;
      return fee;
    } catch (error) {
      console.error('Error getting estimated creator fee:', error);
      return 0n;
    }
  }

  /**
   * Get estimated jackpot
   */
  async getEstimatedJackpot(pool: GaunletPool): Promise<bigint> {
    try {
      const platformFee = (pool.totalEntryRevenue * 300n) / 10000n; // 3%
      const creatorFee = await this.getEstimatedCreatorFee(pool);
      const jackpot = pool.totalEntryRevenue - platformFee - creatorFee;
      return jackpot > 0n ? jackpot : 0n;
    } catch (error) {
      console.error('Error getting estimated jackpot:', error);
      return 0n;
    }
  }
}

export const gaunletService = new GaunletService();

