"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, InformationCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAccount, useBalance } from "wagmi";
import { useEarlyCashout } from "@/hooks/useEarlyCashout";
import { useTransactionFeedback } from "@/components/TransactionFeedback";
import type { MarketListing, PoolData } from "@/services/earlyCashoutService";

interface BuyPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketListing;
  poolData?: PoolData;
  onSuccess: () => void;
}

export default function BuyPositionModal({
  isOpen,
  onClose,
  listing,
  poolData,
  onSuccess,
}: BuyPositionModalProps) {
  const { address } = useAccount();
  const { buyPoolPosition, buyBettorPosition, isPending, isConfirmed } = useEarlyCashout();
  const { showPending, showSuccess, showError } = useTransactionFeedback();
  const { data: balance } = useBalance({ address });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) {
      showPending("Buying Position", "Please confirm the transaction in your wallet");
    }
  }, [isPending, showPending]);

  useEffect(() => {
    if (isConfirmed) {
      showSuccess("Position Purchased", "You now own this position!");
      onSuccess();
    }
  }, [isConfirmed, showSuccess, onSuccess]);

  const handleBuy = async () => {
    setError("");

    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    const price = parseFloat(listing.price);
    const balanceBNB = balance ? parseFloat(balance.formatted) : 0;

    if (balanceBNB < price) {
      setError(`Insufficient balance. You need ${price.toFixed(6)} BNB but have ${balanceBNB.toFixed(6)} BNB`);
      return;
    }

    try {
      if (listing.listingType === 'POOL') {
        await buyPoolPosition(listing.poolId, listing.price);
      } else {
        if (!listing.bettorAddress) {
          throw new Error("Bettor address is required");
        }
        await buyBettorPosition(listing.poolId, listing.bettorAddress, listing.price);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to buy position";
      setError(errorMsg);
      showError("Purchase Failed", errorMsg);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) {
      return num.toFixed(3);
    }
    return num.toFixed(6);
  };

  const calculateFee = (price: string) => {
    const num = parseFloat(price);
    return (num * 0.02).toString();
  };

  if (!isOpen) return null;

  const hasEnoughBalance = balance ? parseFloat(balance.formatted) >= parseFloat(listing.price) : false;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card rounded-2xl border border-border-card w-full max-w-md shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-card bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Buy Position</h2>
                <p className="text-sm text-text-secondary">Pool #{listing.poolId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Pool Info */}
            {poolData && (
              <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-semibold text-white mb-2 line-clamp-1">{poolData.title}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{poolData.league}</span>
                  <span>•</span>
                  <span>{(poolData.odds / 100).toFixed(2)}x</span>
                </div>
              </div>
            )}

            {/* Position Type */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-gray-400 mb-1">Position Type</p>
              <p className="text-lg font-bold text-white">
                {listing.listingType === 'POOL' ? 'Creator Position' : 'Bettor Position'}
              </p>
            </div>

            {/* Price Breakdown */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Purchase Price</span>
                <span className="text-2xl font-bold text-green-400">{formatPrice(listing.price)} BNB</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-green-500/20">
                <span className="text-gray-400">Platform Fee (2%)</span>
                <span className="text-gray-300">{formatPrice(calculateFee(listing.price))} BNB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Seller Receives</span>
                <span className="text-gray-300">
                  {formatPrice((parseFloat(listing.price) * 0.98).toString())} BNB
                </span>
              </div>
            </div>

            {/* Balance Check */}
            {balance && (
              <div className={`rounded-xl p-4 border ${
                hasEnoughBalance
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Your Balance</span>
                  <span className={`text-sm font-semibold ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(balance.formatted).toFixed(6)} BNB
                  </span>
                </div>
                {!hasEnoughBalance && (
                  <p className="text-xs text-red-400 mt-2">
                    Insufficient balance. You need {formatPrice(listing.price)} BNB
                  </p>
                )}
              </div>
            )}

            {/* Info */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold text-white mb-1">What You Get</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                    <li>Full ownership of this position</li>
                    <li>All winnings/refunds when pool settles</li>
                    <li>Reputation (if creator position and you win)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 text-text-primary rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={isPending || !hasEnoughBalance || !address}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Processing..." : "Buy Position"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

