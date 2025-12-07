'use client';

import { useEarlyCashout, type ListedPosition, type PositionType } from '@/hooks/useEarlyCashout';
import { formatEther } from 'viem';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface EarlyCashoutMarketplaceProps {
  poolId: bigint;
  onClose?: () => void;
}

export function EarlyCashoutMarketplace({ poolId, onClose }: EarlyCashoutMarketplaceProps) {
  const {
    listPoolForSale,
    listBettorPositionForSale,
    buyPoolOwnership,
    buyBettorPosition,
    isPending,
  } = useEarlyCashout();

  const [activeTab, setActiveTab] = useState<'list' | 'buy'>('buy');
  const [positionType, setPositionType] = useState<PositionType>('POOL');
  const [askingPrice, setAskingPrice] = useState('');

  // Mock listed positions - in real app, fetch from contract/backend
  const [listedPositions, setListedPositions] = useState<ListedPosition[]>([]);

  const handleListForSale = async () => {
    if (!askingPrice) {
      toast.error('Please enter an asking price');
      return;
    }

    try {
      const price = BigInt(parseFloat(askingPrice) * 1e18);
      
      if (positionType === 'POOL') {
        await listPoolForSale(poolId, price);
      } else {
        await listBettorPositionForSale(poolId, price);
      }
      
      toast.success('Position listed for sale!');
      setAskingPrice('');
    } catch (_error) {
      // Error handled in hook
    }
  };

  const handleBuy = async (position: ListedPosition) => {
    try {
      if (position.positionType === 'POOL') {
        await buyPoolOwnership(poolId, position.askingPrice);
      } else {
        await buyBettorPosition(poolId, position.seller, position.askingPrice);
      }
      
      toast.success('Position purchased!');
      setListedPositions(prev => prev.filter(p => p.poolId !== poolId));
    } catch (_error) {
      // Error handled in hook
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Early Cashout Marketplace</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('buy')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${activeTab === 'buy'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
        >
          Buy Positions
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${activeTab === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
        >
          List for Sale
        </button>
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <div className="space-y-4">
          {listedPositions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-[var(--text-muted)] text-sm sm:text-base">
              No positions listed for sale
            </div>
          ) : (
            listedPositions.map((position, index) => (
              <div
                key={index}
                className="bg-[var(--bg-card)] rounded-lg p-3 sm:p-4 border border-[var(--border-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] text-sm sm:text-base mb-1">
                    {position.positionType === 'POOL' ? 'Pool Ownership' : 'Bettor Position'}
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--text-muted)]">
                    Seller: {position.seller.slice(0, 6)}...{position.seller.slice(-4)}
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--text-muted)]">
                    Original Stake: {formatEther(position.originalStake)} {position.currency}
                  </div>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2 sm:mb-0">
                    {formatEther(position.askingPrice)} {position.currency}
                  </div>
                  <button
                    onClick={() => handleBuy(position)}
                    disabled={isPending}
                    className="w-full sm:w-auto mt-2 px-4 py-2 bg-[var(--market-rise)] hover:bg-[var(--market-rise)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-all duration-200 active:scale-95"
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-2">
              Position Type
            </label>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setPositionType('POOL')}
                className={`
                  px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold transition-all duration-200
                  text-sm sm:text-base flex-1
                  ${positionType === 'POOL'
                    ? 'bg-[var(--bsc-yellow)] text-[var(--bsc-dark)] shadow-lg shadow-[var(--bsc-yellow)]/30 border-2 border-[var(--bsc-yellow)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--bsc-yellow)]/50 hover:bg-[var(--bg-card)]/80'
                  }
                  active:scale-95
                `}
              >
                Pool Ownership
              </button>
              <button
                onClick={() => setPositionType('BETTOR')}
                className={`
                  px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg font-semibold transition-all duration-200
                  text-sm sm:text-base flex-1
                  ${positionType === 'BETTOR'
                    ? 'bg-[var(--bsc-yellow)] text-[var(--bsc-dark)] shadow-lg shadow-[var(--bsc-yellow)]/30 border-2 border-[var(--bsc-yellow)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:border-[var(--bsc-yellow)]/50 hover:bg-[var(--bg-card)]/80'
                  }
                  active:scale-95
                `}
              >
                Bettor Position
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-2">
              Asking Price (BNB)
            </label>
            <input
              type="number"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="0.0"
              step="0.001"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--bg-card)] border border-[var(--border-input)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--bsc-yellow)] focus:ring-2 focus:ring-[var(--bsc-yellow)]/20 transition-all text-sm sm:text-base"
            />
          </div>

          <button
            onClick={handleListForSale}
            disabled={isPending || !askingPrice}
            className="w-full py-2.5 sm:py-3 px-4 bg-[var(--bsc-yellow)] hover:bg-[var(--bsc-gold)] text-[var(--bsc-dark)] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 text-sm sm:text-base shadow-lg shadow-[var(--bsc-yellow)]/20"
          >
            {isPending ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
      )}
    </div>
  );
}

