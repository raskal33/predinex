"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionKeys } from '@/hooks/useSessionKeys';
import { CONTRACTS } from '@/contracts';
import { parseEther, formatEther, type Address } from 'viem';
import { 
  ClockIcon, 
  ShieldCheckIcon, 
  XMarkIcon,
  PlusIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

interface SessionKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionKeyManager({ isOpen, onClose }: SessionKeyManagerProps) {
  const {
    sessions,
    isLoading,
    isReady,
    createQuickSession,
    createTournamentSession,
    createSmallPredictionSession,
    revokeSession,
    revokeAllSessions,
    getSessionInfo,
  } = useSessionKeys();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionType, setSessionType] = useState<'quick' | 'tournament' | 'small'>('quick');
  const [durationHours, setDurationHours] = useState('24');
  const [maxTransactions, setMaxTransactions] = useState('50');
  const [maxValuePerTx, setMaxValuePerTx] = useState('100');

  const handleCreateSession = async () => {
    try {
      const allowedContracts = [
        CONTRACTS.H2H.address as Address,
        CONTRACTS.GAUNLET.address as Address,
        CONTRACTS.POOL_CORE.address as Address,
      ];

      if (sessionType === 'quick') {
        await createQuickSession({
          durationHours: parseInt(durationHours),
          maxTransactions: parseInt(maxTransactions),
          maxValuePerTx: parseEther(maxValuePerTx),
          allowedContracts,
        });
      } else if (sessionType === 'tournament') {
        await createTournamentSession(allowedContracts);
      } else if (sessionType === 'small') {
        await createSmallPredictionSession(
          parseEther(maxValuePerTx),
          allowedContracts
        );
      }

      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-md border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Session Keys</h2>
                  <p className="text-sm text-gray-400">Pre-authorize actions without signing each time</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {!isReady && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400">
                  Biconomy is not initialized. Connect your wallet first.
                </p>
              </div>
            )}

            {/* Active Sessions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Active Sessions ({sessions.length})</h3>
                {sessions.length > 0 && (
                  <button
                    onClick={revokeAllSessions}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Revoke All
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-lg border border-white/10">
                  <ShieldCheckIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No active sessions</p>
                  <p className="text-sm text-gray-500 mt-1">Create a session to start trading without signatures</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const info = getSessionInfo(session);
                    return (
                      <div
                        key={`${session.sessionKey}_${session.createdAt}`}
                        className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ClockIcon className={`w-5 h-5 ${info.isExpiringSoon ? 'text-yellow-400' : 'text-green-400'}`} />
                            <span className="text-sm font-medium text-white">
                              {info.timeRemaining} remaining
                            </span>
                          </div>
                          <button
                            onClick={() => revokeSession(session.sessionKey)}
                            className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Transactions:</span>
                            <span className="ml-2 text-white font-medium">
                              {info.txCountUsed} / {info.maxTxCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Max per TX:</span>
                            <span className="ml-2 text-white font-medium">
                              {info.maxValuePerTx ? `${formatEther(info.maxValuePerTx)} BNB` : 'Unlimited'}
                            </span>
                          </div>
                        </div>

                        {info.allowedContracts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <span className="text-xs text-gray-400">
                              Restricted to {info.allowedContracts.length} contract(s)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Session */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!isReady || isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Create New Session
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Create Session</h4>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                {/* Session Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Session Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSessionType('quick')}
                      className={`py-2 px-3 text-sm rounded-lg transition-all ${
                        sessionType === 'quick'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      } border`}
                    >
                      Quick
                    </button>
                    <button
                      onClick={() => setSessionType('tournament')}
                      className={`py-2 px-3 text-sm rounded-lg transition-all ${
                        sessionType === 'tournament'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      } border`}
                    >
                      Tournament
                    </button>
                    <button
                      onClick={() => setSessionType('small')}
                      className={`py-2 px-3 text-sm rounded-lg transition-all ${
                        sessionType === 'small'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      } border`}
                    >
                      Small Bets
                    </button>
                  </div>
                </div>

                {sessionType === 'quick' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Duration (hours)</label>
                      <input
                        type="number"
                        value={durationHours}
                        onChange={(e) => setDurationHours(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        min="1"
                        max="168"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Transactions</label>
                      <input
                        type="number"
                        value={maxTransactions}
                        onChange={(e) => setMaxTransactions(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Value per TX (BNB)</label>
                      <input
                        type="number"
                        value={maxValuePerTx}
                        onChange={(e) => setMaxValuePerTx(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        step="0.01"
                        min="0.01"
                      />
                    </div>
                  </>
                )}

                {sessionType === 'tournament' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-300">
                      • Duration: 12 hours<br />
                      • Max Transactions: 100<br />
                      • Max Value: Unlimited<br />
                      • For tournament gameplay
                    </p>
                  </div>
                )}

                {sessionType === 'small' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Max Value per TX (BNB)</label>
                      <input
                        type="number"
                        value={maxValuePerTx}
                        onChange={(e) => setMaxValuePerTx(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        step="0.01"
                        min="0.01"
                        max="10"
                      />
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-blue-300">
                        • Duration: 6 hours<br />
                        • Max Transactions: 20<br />
                        • For small predictions
                      </p>
                    </div>
                  </>
                )}

                <button
                  onClick={handleCreateSession}
                  disabled={isLoading}
                  className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all"
                >
                  {isLoading ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">What are Session Keys?</h4>
              <p className="text-xs text-blue-200/80">
                Session keys allow you to pre-authorize transactions for a limited time. 
                Once created, you can perform actions without signing each transaction, 
                providing a gaming-like experience while maintaining security through time 
                and value limits.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

