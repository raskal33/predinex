"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { 
  MagnifyingGlassIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";
import { GuidedMarketService, type Cryptocurrency } from "@/services/guidedMarketService";

interface H2HCryptoSelectorProps {
  onSelect: (crypto: Cryptocurrency | null, marketId: string, outcome: string, eventStartTime: number, timeframe: string) => void;
  selectedCrypto?: Cryptocurrency | null;
  selectedOutcome?: string;
}

export default function H2HCryptoSelector({
  onSelect,
  selectedCrypto,
  selectedOutcome,
}: H2HCryptoSelectorProps) {
  const [cryptos, setCryptos] = useState<Cryptocurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [timeframe, setTimeframe] = useState("24h");
  const [direction, setDirection] = useState<'above' | 'below'>('above');

  // Fetch cryptocurrencies
  useEffect(() => {
    const loadCryptos = async () => {
      setIsLoading(true);
      try {
        const cryptosData = await GuidedMarketService.getCryptocurrencies();
        setCryptos(cryptosData);
      } catch (error) {
        console.error('Error loading cryptocurrencies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCryptos();
  }, []);

  // Filter cryptos
  const filteredCryptos = useMemo(() => {
    if (!searchTerm) return cryptos.slice(0, 50); // Show top 50 by default

    const lowerSearch = searchTerm.toLowerCase();
    return cryptos.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) ||
      c.symbol.toLowerCase().includes(lowerSearch)
    ).slice(0, 50);
  }, [cryptos, searchTerm]);

  const handleCryptoSelect = (crypto: Cryptocurrency) => {
    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      return;
    }

    // Generate marketId (format: crypto_{symbol}_{timeframe})
    const marketId = `crypto_${crypto.symbol}_${timeframe}`;
    
    // Generate outcome (format: PRICE_ABOVE_XXX or PRICE_BELOW_XXX)
    const outcome = direction === 'above' 
      ? `PRICE_ABOVE_${parseFloat(targetPrice).toFixed(2)}`
      : `PRICE_BELOW_${parseFloat(targetPrice).toFixed(2)}`;
    
    // Calculate event start time based on timeframe
    const now = new Date();
    let eventStartTime = now;
    
    switch (timeframe) {
      case '1h':
        eventStartTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        break;
      case '4h':
        eventStartTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        break;
      case '24h':
        eventStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '7d':
        eventStartTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        eventStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    onSelect(
      crypto,
      marketId,
      outcome,
      Math.floor(eventStartTime.getTime() / 1000),
      timeframe
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading cryptocurrencies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search cryptocurrency..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Selected Crypto Display */}
      {selectedCrypto && (
        <div className="glass-card border border-cyan-500/30 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedCrypto.logo && (
                <Image
                  src={selectedCrypto.logo}
                  alt={selectedCrypto.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedCrypto.name} ({selectedCrypto.symbol})
                </p>
                <p className="text-xs text-gray-400">
                  Current: ${(selectedCrypto.currentPrice || selectedCrypto.price_usd || 0).toFixed(2)}
                </p>
                {selectedOutcome && (
                  <p className="text-xs text-cyan-400 mt-1">Outcome: {selectedOutcome}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(null, '', '', 0, '')}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Crypto Selection Form */}
      {!selectedCrypto && (
        <>
          {/* Target Price and Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">
                Target Price (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
            </select>
          </div>

          {/* Cryptocurrency List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCryptos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No cryptocurrencies found
              </div>
            ) : (
              filteredCryptos.map((crypto) => (
                <motion.button
                  key={crypto.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleCryptoSelect(crypto)}
                  disabled={!targetPrice || parseFloat(targetPrice) <= 0}
                  className="w-full glass-card border border-white/10 p-4 rounded-xl hover:border-cyan-500/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {crypto.logo && (
                        <Image
                          src={crypto.logo}
                          alt={crypto.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                          unoptimized
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {crypto.name}
                        </p>
                        <p className="text-xs text-gray-400">{crypto.symbol.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        ${(crypto.currentPrice || crypto.price_usd || 0).toFixed(2)}
                      </p>
                      {crypto.rank && (
                        <p className="text-xs text-gray-400">#{crypto.rank}</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

