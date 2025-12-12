"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { 
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";
import { earlyCashoutService, type PositionInfo, type PoolData } from "@/services/earlyCashoutService";
import { useEarlyCashout } from "@/hooks/useEarlyCashout";
import PositionDetailsModal from "./PositionDetailsModal";
import ListingModal from "./ListingModal";

export default function MyCashoutPositions() {
  const { address } = useAccount();
  const { cancelPoolListing, cancelBettorListing } = useEarlyCashout();
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [poolDataMap, setPoolDataMap] = useState<Map<number, PoolData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<PositionInfo | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);

  const loadPositions = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const data = await earlyCashoutService.getUserPositions(address);
      setPositions(data);

      // Load pool data
      const poolIds = [...new Set(data.map(p => p.poolId))];
      const poolDataPromises = poolIds.map(id => 
        earlyCashoutService.getPoolData(id).catch(() => null)
      );
      const poolDataResults = await Promise.all(poolDataPromises);
      
      const newPoolDataMap = new Map<number, PoolData>();
      poolDataResults.forEach((data, index) => {
        if (data) {
          newPoolDataMap.set(poolIds[index], data);
        }
      });
      setPoolDataMap(newPoolDataMap);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();

    const handleRefresh = () => {
      loadPositions();
    };
    window.addEventListener('refresh-cashout-data', handleRefresh);
    return () => window.removeEventListener('refresh-cashout-data', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handlePositionClick = (position: PositionInfo) => {
    setSelectedPosition(position);
    setShowDetailsModal(true);
  };

  const handleListClick = (position: PositionInfo) => {
    setSelectedPosition(position);
    setShowListingModal(true);
  };

  const handleCancelListing = async (position: PositionInfo) => {
    try {
      if (position.isCreatorSide) {
        await cancelPoolListing(position.poolId);
      } else {
        await cancelBettorListing(position.poolId);
      }
      loadPositions();
    } catch (error) {
      console.error('Error canceling listing:', error);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) {
      return num.toFixed(3);
    }
    return num.toFixed(6);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading your positions...</span>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="glass-card border border-slate-700/50 p-8 rounded-xl max-w-md mx-auto">
          <TrophyIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Cashout Positions</h3>
          <p className="text-gray-400">
            You don&apos;t have any positions that can be cashed out right now.
          </p>
        </div>
      </div>
    );
  }

  const cashoutablePositions = positions.filter(p => p.canCashout);
  const listedPositions = positions.filter(p => p.isListed);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card border border-border-card p-4 rounded-xl">
          <p className="text-xs text-gray-400 mb-1">Total Positions</p>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
        </div>
        <div className="glass-card border border-border-card p-4 rounded-xl">
          <p className="text-xs text-gray-400 mb-1">Can Cashout</p>
          <p className="text-2xl font-bold text-cyan-400">{cashoutablePositions.length}</p>
        </div>
        <div className="glass-card border border-border-card p-4 rounded-xl">
          <p className="text-xs text-gray-400 mb-1">Listed for Sale</p>
          <p className="text-2xl font-bold text-yellow-400">{listedPositions.length}</p>
        </div>
      </div>

      {/* Positions List */}
      <div className="space-y-4">
        {positions.map((position, index) => {
          const poolData = poolDataMap.get(position.poolId);
          const profit = parseFloat(position.positionValue) - parseFloat(position.stake);
          const profitPercent = (profit / parseFloat(position.stake)) * 100;

          return (
            <motion.div
              key={`${position.poolId}-${position.isCreatorSide}-${position.bettorAddress || ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card border border-border-card rounded-xl p-5 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => handlePositionClick(position)}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${
                      position.isCreatorSide
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                        : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                    }`}>
                      {position.isCreatorSide ? (
                        <TrophyIcon className="h-5 w-5 text-purple-400" />
                      ) : (
                        <CurrencyDollarIcon className="h-5 w-5 text-cyan-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white">
                          Pool #{position.poolId}
                        </p>
                        <span className="text-xs text-gray-400 uppercase">
                          {position.isCreatorSide ? 'Creator' : 'Bettor'} Position
                        </span>
                      </div>
                      {poolData && (
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {poolData.title}
                        </p>
                      )}
                    </div>
                    {position.isListed && (
                      <div className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                        <SparklesIcon className="h-3 w-3" />
                        <span>Listed</span>
                      </div>
                    )}
                    {!position.canCashout && (
                      <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                        {position.reason || 'Not Available'}
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-400 mb-1">Your Stake</p>
                      <p className="text-sm font-bold text-white">
                        {formatPrice(position.stake)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-400 mb-1">Position Value</p>
                      <p className="text-sm font-bold text-cyan-400">
                        {formatPrice(position.positionValue)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                      <p className="text-xs text-gray-400 mb-1">Potential Profit</p>
                      <div className="flex items-center gap-1">
                        {profit >= 0 ? (
                          <ArrowUpIcon className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-red-400" />
                        )}
                        <p className={`text-sm font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {profit >= 0 ? '+' : ''}{formatPrice(profit.toString())} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    {position.isListed && position.askPrice && (
                      <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <p className="text-xs text-gray-400 mb-1">Asking Price</p>
                        <p className="text-sm font-bold text-yellow-400">
                          {formatPrice(position.askPrice)} {poolData?.usesPrix ? 'PRIX' : 'BNB'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {position.canCashout && !position.isListed && (
                    <button
                      onClick={() => handleListClick(position)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all text-sm whitespace-nowrap"
                    >
                      List for Sale
                    </button>
                  )}
                  {position.isListed && (
                    <button
                      onClick={() => handleCancelListing(position)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-all text-sm whitespace-nowrap flex items-center gap-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Cancel Listing
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedPosition && (
        <>
          <PositionDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedPosition(null);
            }}
            position={selectedPosition}
            poolData={poolDataMap.get(selectedPosition.poolId)}
            onList={() => {
              setShowDetailsModal(false);
              setShowListingModal(true);
            }}
          />
          <ListingModal
            isOpen={showListingModal}
            onClose={() => {
              setShowListingModal(false);
              setSelectedPosition(null);
            }}
            position={selectedPosition}
            poolData={poolDataMap.get(selectedPosition.poolId)}
            onSuccess={() => {
              setShowListingModal(false);
              setSelectedPosition(null);
              loadPositions();
            }}
          />
        </>
      )}
    </>
  );
}

