"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, InformationCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useEarlyCashout } from "@/hooks/useEarlyCashout";
import { useTransactionFeedback } from "@/components/TransactionFeedback";
import type { PositionInfo, PoolData } from "@/services/earlyCashoutService";

interface ListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: PositionInfo;
  poolData?: PoolData;
  onSuccess: () => void;
}

export default function ListingModal({
  isOpen,
  onClose,
  position,
  poolData,
  onSuccess,
}: ListingModalProps) {
  const { listPoolForSale, listBettorPositionForSale, isPending, isConfirmed } = useEarlyCashout();
  const { showPending, showSuccess, showError } = useTransactionFeedback();
  const [price, setPrice] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && position.positionValue) {
      // Suggest price at 95% of position value (slightly below to attract buyers)
      const suggested = (parseFloat(position.positionValue) * 0.95).toString();
      setSuggestedPrice(suggested);
      setPrice(suggested);
    }
  }, [isOpen, position.positionValue]);

  useEffect(() => {
    if (isPending) {
      showPending("Listing Position", "Please confirm the transaction in your wallet");
    }
  }, [isPending, showPending]);

  useEffect(() => {
    if (isConfirmed) {
      showSuccess("Position Listed", "Your position has been listed for sale!");
      onSuccess();
    }
  }, [isConfirmed, showSuccess, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    try {
      if (position.isCreatorSide) {
        await listPoolForSale(position.poolId, price);
      } else {
        await listBettorPositionForSale(position.poolId, price);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to list position";
      setError(errorMsg);
      showError("Listing Failed", errorMsg);
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

  const calculateNet = (price: string) => {
    const num = parseFloat(price);
    return (num * 0.98).toString();
  };

  if (!isOpen) return null;

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
          <div className="flex items-center justify-between p-6 border-b border-border-card bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <SparklesIcon className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">List Position for Sale</h2>
                <p className="text-sm text-text-secondary">Pool #{position.poolId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Position Info */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Your Stake</p>
                  <p className="text-white font-semibold">
                    {formatPrice(position.stake)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Position Value</p>
                  <p className="text-cyan-400 font-semibold">
                    {formatPrice(position.positionValue)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asking Price (BNB)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={suggestedPrice}
                className="w-full px-4 py-3 bg-black/30 border border-border-input rounded-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                required
              />
              {suggestedPrice && (
                <button
                  type="button"
                  onClick={() => setPrice(suggestedPrice)}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Use suggested: {formatPrice(suggestedPrice)} BNB (95% of value)
                </button>
              )}
            </div>

            {/* Fee Breakdown */}
            {price && parseFloat(price) > 0 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Asking Price</span>
                  <span className="text-white font-semibold">{formatPrice(price)} BNB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Platform Fee (2%)</span>
                  <span className="text-red-400 font-semibold">-{formatPrice(calculateFee(price))} BNB</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
                  <span className="text-white font-semibold">You Receive</span>
                  <span className="text-cyan-400 font-bold text-lg">{formatPrice(calculateNet(price))} BNB</span>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold text-white mb-1">Important</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                    <li>Your position will be listed at the specified price</li>
                    <li>Anyone can buy it by paying the asking price</li>
                    <li>You can cancel the listing at any time</li>
                    <li>2% platform fee applies to all sales</li>
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
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/20 text-text-primary rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !price || parseFloat(price) <= 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Listing..." : "List for Sale"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

