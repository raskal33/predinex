"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { 
  ShoppingBagIcon,
  UserIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import EarlyCashoutMarketplace from "@/components/EarlyCashoutMarketplace";
import MyCashoutPositions from "@/components/MyCashoutPositions";
import { TransactionFeedback } from "@/components/TransactionFeedback";
import { useTransactionFeedback } from "@/components/TransactionFeedback";

type TabType = "marketplace" | "my-positions";

export default function EarlyCashoutPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("marketplace");
  const [refreshing, setRefreshing] = useState(false);
  const { transactionStatus, clearStatus } = useTransactionFeedback();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refresh in child components
    window.dispatchEvent(new Event('refresh-cashout-data'));
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Subtle grid pattern background */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <TransactionFeedback
        status={transactionStatus}
        onClose={clearStatus}
        autoClose={true}
        autoCloseDelay={5000}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Early Cashout
                </span>
              </h1>
              <p className="text-sm sm:text-base text-gray-400 max-w-2xl">
                Sell your pool positions or bettor stakes before settlement. Buy positions from others at market prices.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>

          {/* Info Banner */}
          <div className="glass-card border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 p-4 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300 space-y-1">
                <p className="font-semibold text-white">How Early Cashout Works</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                  <li>List your position for sale at your desired price (2% platform fee applies)</li>
                  <li>Buy positions from others to take over their stakes and potential winnings</li>
                  <li>New owners receive all winnings/refunds when the pool settles</li>
                  <li>Available before betting ends and during the event (until settlement)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1.5 mb-6">
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "marketplace"
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Marketplace</span>
              <span className="sm:hidden">Market</span>
            </button>
            {isConnected && (
              <button
                onClick={() => setActiveTab("my-positions")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === "my-positions"
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden sm:inline">My Positions</span>
                <span className="sm:hidden">Mine</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "marketplace" && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EarlyCashoutMarketplace />
            </motion.div>
          )}

          {activeTab === "my-positions" && isConnected && (
            <motion.div
              key="my-positions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MyCashoutPositions />
            </motion.div>
          )}

          {activeTab === "my-positions" && !isConnected && (
            <motion.div
              key="not-connected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="glass-card border border-slate-700/50 p-8 rounded-xl max-w-md mx-auto">
                <UserIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">
                  Connect your wallet to view and manage your cashout positions
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

