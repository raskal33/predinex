/**
 * Early Cashout Service
 * Handles API calls for early cashout marketplace and position management
 */

export interface MarketListing {
  id: number;
  poolId: number;
  seller: string;
  price: string;
  listingType: 'POOL' | 'POSITION';
  bettorAddress?: string;
  status: 'active' | 'sold' | 'cancelled';
  buyer?: string;
  soldAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PositionInfo {
  poolId: number;
  isCreatorSide: boolean;
  bettorAddress?: string;
  stake: string;
  positionValue: string;
  canCashout: boolean;
  reason?: string;
  isListed: boolean;
  askPrice?: string;
  currentOwner: string;
}

export interface PoolData {
  id: number;
  title: string;
  league: string;
  category: string;
  odds: number;
  creatorStake: string;
  totalBettorStake: string;
  totalCreatorSideStake: string;
  eventStartTime: number;
  eventEndTime: number;
  bettingEndTime: number;
  isSettled: boolean;
  creatorSideWon?: boolean;
  usesPrix: boolean;
}

class EarlyCashoutService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  /**
   * Get all active market listings
   */
  async getMarketListings(): Promise<MarketListing[]> {
    try {
      const response = await fetch(`${this.baseUrl}/market-listings`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch market listings');
      }
      
      return data.data.listings || [];
    } catch (error) {
      console.error('Error fetching market listings:', error);
      throw error;
    }
  }

  /**
   * Get user's positions that can be cashed out
   */
  async getUserPositions(userAddress: string): Promise<PositionInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/early-cashout/positions/${userAddress}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user positions');
      }
      
      return data.data.positions || [];
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw error;
    }
  }

  /**
   * Get position value and eligibility
   */
  async getPositionInfo(
    poolId: number,
    userAddress: string,
    isCreatorSide: boolean,
    bettorAddress?: string
  ): Promise<PositionInfo> {
    try {
      const params = new URLSearchParams({
        poolId: poolId.toString(),
        userAddress,
        isCreatorSide: isCreatorSide.toString(),
        ...(bettorAddress && { bettorAddress }),
      });
      
      const response = await fetch(`${this.baseUrl}/early-cashout/position-info?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch position info');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching position info:', error);
      throw error;
    }
  }

  /**
   * Get pool data for a listing
   */
  async getPoolData(poolId: number): Promise<PoolData> {
    try {
      const response = await fetch(`${this.baseUrl}/optimized-pools/${poolId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch pool data');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching pool data:', error);
      throw error;
    }
  }
}

export const earlyCashoutService = new EarlyCashoutService();

