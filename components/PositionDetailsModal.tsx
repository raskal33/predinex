"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, CurrencyDollarIcon, TrophyIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import type { MarketListing, PositionInfo, PoolData } from "@/services/earlyCashoutService";

interface PositionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing?: MarketListing;
  position?: PositionInfo;
  poolData?: PoolData;
  positionValue?: string;
  onBuy?: () => void;
  onList?: () => void;
}

export default function PositionDetailsModal({
  isOpen,
  onClose,
  listing,
  position,
  poolData,
  positionValue,
  onBuy,
  onList,
}: PositionDetailsModalProps) {
  if (!isOpen) return null;

  const isListing = !!listing;
  const isPosition = !!position;
  const isCreatorSide = isListing 
    ? listing.listingType === 'POOL'
    : position?.isCreatorSide || false;

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) {
      return num.toFixed(3);
    }
    return num.toFixed(6);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

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
          className="glass-card rounded-2xl border border-border-card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-card bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isCreatorSide
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                  : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
              }`}>
                {isCreatorSide ? (
                  <TrophyIcon className="h-6 w-6 text-purple-400" />
                ) : (
                  <CurrencyDollarIcon className="h-6 w-6 text-cyan-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {isListing ? 'Position Listing' : 'Position Details'}
                </h2>
                <p className="text-sm text-text-secondary">
                  Pool #{isListing ? listing.poolId : position?.poolId}
                </p>
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
                <h3 className="text-lg font-bold text-white mb-2">{poolData.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">League</p>
                    <p className="text-white font-semibold">{poolData.league}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Odds</p>
                    <p className="text-white font-semibold">{(poolData.odds / 100).toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Event Start</p>
                    <p className="text-white font-semibold">{formatDate(poolData.eventStartTime)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Event End</p>
                    <p className="text-white font-semibold">{formatDate(poolData.eventEndTime)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Position Type */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-gray-400 mb-1">Position Type</p>
              <p className="text-lg font-bold text-white">
                {isCreatorSide ? 'Creator Position' : 'Bettor Position'}
              </p>
              {isListing && listing.bettorAddress && (
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Bettor: {listing.bettorAddress.slice(0, 6)}...{listing.bettorAddress.slice(-4)}
                </p>
              )}
            </div>

            {/* Value Information */}
            <div className="space-y-3">
              {isListing && (
                <>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Asking Price</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        {formatPrice(listing.price)} BNB
                      </p>
                    </div>
                    {positionValue && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <p className="text-sm text-gray-400">Estimated Value</p>
                        <p className="text-lg font-semibold text-white">
                          {formatPrice(positionValue)} BNB
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isPosition && position && (
                <>
                  <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">Your Stake</p>
                      <p className="text-lg font-bold text-white">
                        {formatPrice(position.stake)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <p className="text-sm text-gray-400">Position Value</p>
                      <p className="text-lg font-bold text-cyan-400">
                        {formatPrice(position.positionValue)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                      </p>
                    </div>
                  </div>

                  {position.isListed && position.askPrice && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-yellow-400">Listed for Sale</p>
                        <p className="text-lg font-bold text-yellow-400">
                          {formatPrice(position.askPrice)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                        </p>
                      </div>
                    </div>
                  )}

                  {!position.canCashout && position.reason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <p className="text-sm text-red-400">{position.reason}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Fee Info */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold text-white mb-1">Transfer Fee: 2%</p>
                  <p className="text-gray-400">
                    A 2% platform fee applies to all position transfers. The seller receives the net amount after the fee.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {isListing && onBuy && (
                <button
                  onClick={onBuy}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  Buy Position
                </button>
              )}
              {isPosition && position?.canCashout && !position.isListed && onList && (
                <button
                  onClick={onList}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  List for Sale
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/5 border border-white/20 text-text-primary rounded-lg hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

