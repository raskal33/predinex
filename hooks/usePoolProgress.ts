/**
 * Pool Progress Hook for BSC
 * 
 * Subscribes to pool progress updates via WebSocket
 * ✅ FIX: Using singleton WebSocket client to prevent connection explosion
 */

import { useEffect, useRef, useState } from 'react';
import websocketClient from '@/services/websocket-client';

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
  const [isConnected, setIsConnected] = useState(false);
  
  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Subscribe to pool progress updates via singleton WebSocket client
  useEffect(() => {
    if (!enabled || !poolId) return;

    // Update connection status (optimistic)
    setIsConnected(true);

    const unsubscribe = websocketClient.subscribeToPoolProgress(poolId, (data: any) => {
      // Handle different message formats from backend
      const messageData = data || {};
      
      const progressData: PoolProgressData = {
        poolId: messageData.poolId || poolId,
        fillPercentage: messageData.fillPercentage || 0,
        totalBettorStake: messageData.totalBettorStake || "0",
        totalCreatorSideStake: messageData.totalCreatorSideStake || "0",
        maxPoolSize: messageData.maxPoolSize || "0",
        participantCount: messageData.participantCount || 0,
        betCount: messageData.betCount || 0,
        currentMaxBettorStake: messageData.currentMaxBettorStake || messageData.maxPoolSize || "0",
        effectiveCreatorSideStake: messageData.effectiveCreatorSideStake || messageData.totalCreatorSideStake || "0",
        timestamp: messageData.timestamp || Date.now()
      };
      callbackRef.current(progressData);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [poolId, enabled]);
  
  return { isConnected };
}

