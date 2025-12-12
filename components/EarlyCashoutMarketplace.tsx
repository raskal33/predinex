"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { 
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingDownIcon,
  ShoppingBagIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";
import { earlyCashoutService, type MarketListing, type PoolData } from "@/services/earlyCashoutService";
import { useEarlyCashout } from "@/hooks/useEarlyCashout";
import PositionDetailsModal from "./PositionDetailsModal";
import BuyPositionModal from "./BuyPositionModal";
import { formatUnits } from "viem";

export default function EarlyCashoutMarketplace() {
  const { address, isConnected } = useAccount();
  const { getPositionValue } = useEarlyCashout();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [poolDataMap, setPoolDataMap] = useState<Map<number, PoolData>>(new Map());
  const [positionValues, setPositionValues] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "POOL" | "POSITION">("all");

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await earlyCashoutService.getMarketListings();
      const activeListings = data.filter(l => l.status === 'active');
      setListings(activeListings);

      // Load pool data for all listings
      const poolIds = [...new Set(activeListings.map(l => l.poolId))];
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

      // Load position values
      const valuePromises = activeListings.map(async (listing) => {
        try {
          const isCreatorSide = listing.listingType === 'POOL';
          const value = await getPositionValue(
            listing.poolId,
            isCreatorSide,
            listing.bettorAddress
          );
          return {
            key: `${listing.poolId}-${listing.listingType}-${listing.bettorAddress || ''}`,
            value: formatUnits(value, 18)
          };
        } catch (error) {
          console.error('Error loading position value:', error);
          return null;
        }
      });

      const valueResults = await Promise.all(valuePromises);
      const newPositionValues = new Map<string, string>();
      valueResults.forEach(result => {
        if (result) {
          newPositionValues.set(result.key, result.value);
        }
      });
      setPositionValues(newPositionValues);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();

    // Listen for refresh events
    const handleRefresh = () => {
      loadListings();
    };
    window.addEventListener('refresh-cashout-data', handleRefresh);
    return () => window.removeEventListener('refresh-cashout-data', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredListings = filter === "all" 
    ? listings 
    : listings.filter(l => l.listingType === filter);

  const handleListingClick = (listing: MarketListing) => {
    setSelectedListing(listing);
    setShowDetailsModal(true);
  };

  const handleBuyClick = (listing: MarketListing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num >= 1) {
      return num.toFixed(3);
    }
    return num.toFixed(6);
  };

  const getPriceDifference = (listing: MarketListing): { diff: number; isGood: boolean } => {
    const key = `${listing.poolId}-${listing.listingType}-${listing.bettorAddress || ''}`;
    const positionValue = positionValues.get(key);
    
    if (!positionValue) {
      return { diff: 0, isGood: false };
    }

    const askPrice = parseFloat(listing.price);
    const value = parseFloat(positionValue);
    const diff = ((askPrice - value) / value) * 100;
    
    return {
      diff: Math.abs(diff),
      isGood: askPrice <= value * 1.05 // Good if within 5% of value
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading marketplace...</span>
      </div>
    );
  }

  if (filteredListings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="glass-card border border-slate-700/50 p-8 rounded-xl max-w-md mx-auto">
          <ShoppingBagIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Listings Available</h3>
          <p className="text-gray-400">
            {filter === "all" 
              ? "There are no active listings in the marketplace right now."
              : `No ${filter === "POOL" ? "pool" : "bettor position"} listings available.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === "all"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
              : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
          }`}
        >
          All ({listings.length})
        </button>
        <button
          onClick={() => setFilter("POOL")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === "POOL"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
              : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
          }`}
        >
          Pool Positions ({listings.filter(l => l.listingType === 'POOL').length})
        </button>
        <button
          onClick={() => setFilter("POSITION")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === "POSITION"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
              : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
          }`}
        >
          Bettor Positions ({listings.filter(l => l.listingType === 'POSITION').length})
        </button>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.map((listing, index) => {
          const poolData = poolDataMap.get(listing.poolId);
          const priceDiff = getPriceDifference(listing);
          const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();

          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="glass-card border border-border-card rounded-xl p-5 hover:border-cyan-500/30 transition-all cursor-pointer"
              onClick={() => handleListingClick(listing)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    listing.listingType === 'POOL'
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                      : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                  }`}>
                    {listing.listingType === 'POOL' ? (
                      <TrophyIcon className="h-5 w-5 text-purple-400" />
                    ) : (
                      <CurrencyDollarIcon className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">
                      {listing.listingType === 'POOL' ? 'Pool Position' : 'Bettor Position'}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      Pool #{listing.poolId}
                    </p>
                  </div>
                </div>
                {priceDiff.isGood && (
                  <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                    <ArrowTrendingDownIcon className="h-3 w-3" />
                    <span>Good Deal</span>
                  </div>
                )}
              </div>

              {/* Pool Info */}
              {poolData && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">
                    {poolData.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{poolData.league}</span>
                    <span>•</span>
                    <span>{(poolData.odds / 100).toFixed(2)}x</span>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="mb-4 p-3 bg-black/30 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Asking Price</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {formatPrice(listing.price)} BNB
                  </span>
                </div>
                {positionValues.has(`${listing.poolId}-${listing.listingType}-${listing.bettorAddress || ''}`) && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-400">Est. Value</span>
                    <span className="text-sm text-gray-300">
                      {formatPrice(positionValues.get(`${listing.poolId}-${listing.listingType}-${listing.bettorAddress || ''}`) || '0')} BNB
                    </span>
                  </div>
                )}
              </div>

              {/* Seller */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-cyan-400">
                      {listing.seller.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                  </span>
                </div>
                {isOwnListing && (
                  <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">
                    Your Listing
                  </span>
                )}
              </div>

              {/* Actions */}
              {isConnected && !isOwnListing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBuyClick(listing);
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  Buy Position
                </button>
              )}

              {!isConnected && (
                <div className="text-center text-xs text-gray-500 py-2">
                  Connect wallet to buy
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedListing && (
        <>
          <PositionDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedListing(null);
            }}
            listing={selectedListing}
            poolData={poolDataMap.get(selectedListing.poolId)}
            positionValue={positionValues.get(`${selectedListing.poolId}-${selectedListing.listingType}-${selectedListing.bettorAddress || ''}`)}
            onBuy={() => {
              setShowDetailsModal(false);
              setShowBuyModal(true);
            }}
          />
          <BuyPositionModal
            isOpen={showBuyModal}
            onClose={() => {
              setShowBuyModal(false);
              setSelectedListing(null);
            }}
            listing={selectedListing}
            poolData={poolDataMap.get(selectedListing.poolId)}
            onSuccess={() => {
              setShowBuyModal(false);
              setSelectedListing(null);
              loadListings();
            }}
          />
        </>
      )}
    </>
  );
}
