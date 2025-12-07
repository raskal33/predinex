'use client';

import { useCreatorYield } from '@/hooks/useCreatorYield';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

export function CreatorYieldCard() {
  const {
    totalClaimable,
    formattedTotalClaimable,
    claimYield,
    isPending,
    isConfirming,
    isConfirmed,
    refetchTotalClaimable,
  } = useCreatorYield();

  useEffect(() => {
    if (isConfirmed) {
      toast.success('Creator yield claimed successfully!');
      refetchTotalClaimable();
    }
  }, [isConfirmed, refetchTotalClaimable]);

  const handleClaim = async () => {
    try {
      await claimYield();
    } catch (_error) {
      // Error already handled in hook
    }
  };

  const hasClaimable = totalClaimable && totalClaimable > 0n;

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 sm:p-6 border border-[var(--border-card)] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Creator Yield</h3>
        <span className="text-xl sm:text-2xl">💰</span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <div className="text-xs sm:text-sm text-[var(--text-muted)] mb-1 font-medium">Total Claimable</div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {formattedTotalClaimable} BNB
          </div>
        </div>

        {hasClaimable ? (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className={`
              w-full py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition-all duration-200
              text-sm sm:text-base
              ${isPending || isConfirming
                ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-card)]'
                : 'bg-[var(--market-rise)] hover:bg-[var(--market-rise)]/90 text-white shadow-lg shadow-[var(--market-rise)]/20 active:scale-95'
              }
            `}
          >
            {isPending || isConfirming ? 'Processing...' : 'Claim Yield'}
          </button>
        ) : (
          <div className="text-xs sm:text-sm text-[var(--text-muted)] text-center py-2">
            No yield available to claim
          </div>
        )}
      </div>

      <div className="mt-4 sm:mt-6 pt-4 border-t border-[var(--border-card)]">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Creator yield is calculated based on pool performance and can be claimed after pools are settled.
        </p>
      </div>
    </div>
  );
}

