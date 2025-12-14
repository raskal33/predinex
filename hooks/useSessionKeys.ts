import { useState, useEffect } from 'react';
import { useBiconomy } from './useBiconomy';
import type { ActiveSession } from '@/services/biconomyService';
import type { Address } from 'viem';

/**
 * Hook for managing Biconomy Session Keys
 * Provides UI state and convenience methods for session management
 */
export function useSessionKeys() {
  const {
    createSession,
    getActiveSessions,
    hasActiveSession,
    executeWithSession,
    revokeSession,
    revokeAllSessions,
    isReady,
  } = useBiconomy();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions on mount and when Biconomy is ready
  useEffect(() => {
    if (isReady) {
      const loadSessions = () => {
        const activeSessions = getActiveSessions();
        setSessions(activeSessions);
      };
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const refreshSessions = () => {
    const activeSessions = getActiveSessions();
    setSessions(activeSessions);
  };

  /**
   * Create a quick session for active trading
   * Default: 24 hours, 50 transactions, $100 max per tx
   */
  const createQuickSession = async (params?: {
    durationHours?: number;
    maxTransactions?: number;
    maxValuePerTx?: bigint;
    allowedContracts?: Address[];
  }) => {
    setIsLoading(true);
    try {
      const durationHours = params?.durationHours || 24;
      const validUntil = Math.floor(Date.now() / 1000) + (durationHours * 60 * 60);

      const session = await createSession({
        validUntil,
        maxTransactions: params?.maxTransactions || 50,
        maxValuePerTx: params?.maxValuePerTx,
        allowedContracts: params?.allowedContracts,
      });

      refreshSessions();
      return session;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a session for tournament mode
   * Default: 12 hours, 100 transactions, unlimited value
   */
  const createTournamentSession = async (allowedContracts: Address[]) => {
    setIsLoading(true);
    try {
      const validUntil = Math.floor(Date.now() / 1000) + (12 * 60 * 60);

      const session = await createSession({
        validUntil,
        maxTransactions: 100,
        allowedContracts,
      });

      refreshSessions();
      return session;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a session for small predictions
   * Default: 6 hours, 20 transactions, $10 max per tx
   */
  const createSmallPredictionSession = async (
    maxValuePerTx: bigint,
    allowedContracts: Address[]
  ) => {
    setIsLoading(true);
    try {
      const validUntil = Math.floor(Date.now() / 1000) + (6 * 60 * 60);

      const session = await createSession({
        validUntil,
        maxTransactions: 20,
        maxValuePerTx,
        allowedContracts,
      });

      refreshSessions();
      return session;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Revoke a specific session and refresh list
   */
  const handleRevokeSession = (sessionKey: Address) => {
    const success = revokeSession(sessionKey);
    if (success) {
      refreshSessions();
    }
    return success;
  };

  /**
   * Revoke all sessions and refresh list
   */
  const handleRevokeAllSessions = () => {
    revokeAllSessions();
    refreshSessions();
  };

  /**
   * Get session info for display
   */
  const getSessionInfo = (session: ActiveSession) => {
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = session.expiresAt - now;
    const hoursRemaining = Math.floor(timeRemaining / 3600);
    const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

    const txRemaining = session.config.maxTransactions
      ? session.config.maxTransactions - session.transactionCount
      : 'unlimited';

    return {
      timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
      txRemaining,
      isExpiringSoon: timeRemaining < 3600, // Less than 1 hour
      txCountUsed: session.transactionCount,
      maxTxCount: session.config.maxTransactions || 'unlimited',
      maxValuePerTx: session.config.maxValuePerTx,
      allowedContracts: session.config.allowedContracts || [],
    };
  };

  return {
    sessions,
    isLoading,
    isReady,
    hasActiveSession,
    executeWithSession,
    createQuickSession,
    createTournamentSession,
    createSmallPredictionSession,
    revokeSession: handleRevokeSession,
    revokeAllSessions: handleRevokeAllSessions,
    refreshSessions,
    getSessionInfo,
  };
}

