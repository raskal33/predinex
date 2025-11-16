/**
 * Pool Progress Hook for BSC
 * 
 * Subscribes to pool progress updates via WebSocket
 */

import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface PoolProgressData {
  poolId: string;
  fillPercentage: number;
  totalBettorStake: string;
  totalCreatorSideStake: string;
  maxPoolSize: string;
  participantCount: number;
  betCount?: number;
  currentMaxBettorStake?: string;
  effectiveCreatorSideStake?: string;
  timestamp: number;
}

export function usePoolProgress(
  poolId: string, 
  callback: (data: PoolProgressData) => void, 
  enabled = true
) {
  const callbackRef = useRef(callback);
  
  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Subscribe to pool progress updates via WebSocket
  const { isConnected } = useWebSocket({
    channel: `pool:${poolId}:progress`,
    enabled,
    onMessage: (message: Record<string, unknown>) => {
      // Handle different message formats from backend
      const data = (message.data as Record<string, unknown>) || message;
      
      if ((data.poolId as string) === poolId || (data.poolId as string) === String(poolId) || (message.channel as string) === `pool:${poolId}:progress`) {
        const progressData: PoolProgressData = {
          poolId: (data.poolId as string) || poolId,
          fillPercentage: (data.fillPercentage as number) || 0,
          totalBettorStake: (data.totalBettorStake as string) || "0",
          totalCreatorSideStake: (data.totalCreatorSideStake as string) || "0",
          maxPoolSize: (data.maxPoolSize as string) || "0",
          participantCount: (data.participantCount as number) || 0,
          betCount: (data.betCount as number) || 0,
          currentMaxBettorStake: (data.currentMaxBettorStake as string) || (data.maxPoolSize as string) || "0",
          effectiveCreatorSideStake: (data.effectiveCreatorSideStake as string) || (data.totalCreatorSideStake as string) || "0",
          timestamp: (data.timestamp as number) || Date.now()
        };
        callbackRef.current(progressData);
      }
    }
  });
  
  return { isConnected };
}

