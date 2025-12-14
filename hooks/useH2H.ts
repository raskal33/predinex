import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS, CONTRACT_ADDRESSES } from '@/contracts';
import { useCallback, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { parseEther, formatEther } from 'viem';
import { encodeBytes32String, decodeBytes32String } from 'ethers';
import { type Address } from 'viem';

export type CurrencyType = 0 | 1 | 2; // 0=BNB, 1=PRIX, 2=USDT
export type ChallengeState = 0 | 1 | 2 | 3; // Active, Matched, Resolved, Cancelled

export interface Challenge {
  id: bigint;
  creator: Address;
  marketId: string;
  creatorOutcome: string; // bytes32 decoded
  currency: CurrencyType;
  makerStake: bigint;
  minBid: bigint;
  highestBid: bigint;
  highestBidder: Address;
  eventStartTime: bigint;
  state: ChallengeState;
  result: string; // bytes32 decoded
  creatorWon: boolean;
  creationTime: bigint;
}

const CREATION_FEE = parseEther('0.005'); // 0.005 BNB
const AUCTION_CLOSE_BUFFER = 5 * 60; // 5 minutes

export function useH2H() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  // Get challenge count
  const { data: challengeCount } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'challengeCount',
    query: { enabled: CONTRACT_ADDRESSES.H2H !== '0x0000000000000000000000000000000000000000' },
  });

  // Get user stats
  const { data: userTotalChallenges } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'userTotalChallenges',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const { data: userTotalWins } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'userTotalWins',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // Get pending refunds
  const { data: pendingRefundBNB } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'pendingRefunds',
    args: address ? [address, 0] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const { data: pendingRefundPRIX } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'pendingRefunds',
    args: address ? [address, 1] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const { data: pendingRefundUSDT } = useReadContract({
    address: CONTRACT_ADDRESSES.H2H,
    abi: CONTRACTS.H2H.abi,
    functionName: 'pendingRefunds',
    args: address ? [address, 2] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // Fetch a single challenge
  const fetchChallenge = useCallback(async (id: number): Promise<Challenge | null> => {
    if (!publicClient || CONTRACT_ADDRESSES.H2H === '0x0000000000000000000000000000000000000000') return null;
    
    try {
      const challengeData = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'challenges',
        args: [BigInt(id)],
      });

      const [id_, creator, marketId, creatorOutcomeBytes, currency, makerStake, minBid, highestBid, highestBidder, eventStartTime, state, resultBytes, creatorWon, creationTime] = challengeData as any[];

      return {
        id: id_,
        creator: creator as Address,
        marketId: marketId as string,
        creatorOutcome: decodeBytes32String(creatorOutcomeBytes as `0x${string}`),
        currency: currency as CurrencyType,
        makerStake: makerStake as bigint,
        minBid: minBid as bigint,
        highestBid: highestBid as bigint,
        highestBidder: highestBidder as Address,
        eventStartTime: eventStartTime as bigint,
        state: state as ChallengeState,
        result: resultBytes && resultBytes !== '0x0000000000000000000000000000000000000000000000000000000000000000' 
          ? decodeBytes32String(resultBytes as `0x${string}`)
          : '',
        creatorWon: creatorWon as boolean,
        creationTime: creationTime as bigint,
      };
    } catch (error) {
      console.error('Error fetching challenge:', error);
      return null;
    }
  }, [publicClient]);

  // Fetch all challenges
  const fetchAllChallenges = useCallback(async () => {
    if (!publicClient || !challengeCount || CONTRACT_ADDRESSES.H2H === '0x0000000000000000000000000000000000000000') {
      setChallenges([]);
      return;
    }

    setLoading(true);
    try {
      const count = Number(challengeCount);
      const challengePromises = [];
      
      for (let i = 1; i <= count; i++) {
        challengePromises.push(fetchChallenge(i));
      }

      const results = await Promise.all(challengePromises);
      const validChallenges = results.filter((c): c is Challenge => c !== null);
      setChallenges(validChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [publicClient, challengeCount, fetchChallenge]);

  // Create challenge
  const createChallenge = useCallback(async (
    marketId: string,
    outcome: string,
    makerStake: string,
    minBid: string,
    eventStartTime: number,
    currency: CurrencyType
  ) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const stakeAmount = parseEther(makerStake);
      const minBidAmount = parseEther(minBid);
      const outcomeBytes32 = encodeBytes32String(outcome.slice(0, 31));

      // Validate event time
      const currentTime = Math.floor(Date.now() / 1000);
      if (eventStartTime <= currentTime + AUCTION_CLOSE_BUFFER) {
        toast.error(`Event must start at least ${AUCTION_CLOSE_BUFFER / 60} minutes from now`);
        return null;
      }

      let value: bigint = CREATION_FEE;
      if (currency === 0) {
        // BNB: creation fee + stake
        value = CREATION_FEE + stakeAmount;
      }
      // For tokens (currency 1 or 2): only creation fee in BNB

      toast.loading('Creating challenge...', { id: 'create-challenge' });

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'createChallenge',
        args: [marketId, outcomeBytes32, stakeAmount, minBidAmount, BigInt(eventStartTime), currency],
        value, // Use calculated value (CREATION_FEE for tokens, CREATION_FEE + stake for BNB)
      });

      toast.loading('Waiting for confirmation...', { id: 'create-challenge' });

      // Wait for confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Challenge created successfully!', { id: 'create-challenge' });
      
      // Refresh challenges
      await fetchAllChallenges();
      
      return hash;
    } catch (error: any) {
      toast.dismiss('create-challenge');
      const errorMsg = error?.message || 'Failed to create challenge';
      if (errorMsg.includes('insufficient funds')) {
        toast.error('Insufficient balance');
      } else if (errorMsg.includes('Event too soon')) {
        toast.error(`Event must start at least ${AUCTION_CLOSE_BUFFER / 60} minutes from now`);
      } else {
        toast.error(errorMsg);
      }
      return null;
    }
  }, [address, isConnected, writeContractAsync, publicClient, fetchAllChallenges]);

  // Place bid
  const placeBid = useCallback(async (challengeId: number, bidAmount: string, currency: CurrencyType) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      const bidAmountBigInt = parseEther(bidAmount);
      const challenge = await fetchChallenge(challengeId);
      
      if (!challenge) {
        toast.error('Challenge not found');
        return null;
      }

      // Validate bid
      if (challenge.state !== 0) {
        toast.error('Challenge is not active');
        return null;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (Number(challenge.eventStartTime) <= currentTime + AUCTION_CLOSE_BUFFER) {
        toast.error('Bidding has closed');
        return null;
      }

      if (challenge.highestBidder === address) {
        toast.error('You are already the highest bidder');
        return null;
      }

      const minBid = challenge.highestBidder === '0x0000000000000000000000000000000000000000' 
        ? challenge.minBid 
        : challenge.highestBid + 1n;

      if (bidAmountBigInt < minBid) {
        toast.error(`Bid must be at least ${formatEther(minBid)}`);
        return null;
      }

      toast.loading('Placing bid...', { id: 'place-bid' });

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'placeBid',
        args: [BigInt(challengeId), bidAmountBigInt],
        value: currency === 0 ? bidAmountBigInt : 0n,
      });

      toast.loading('Waiting for confirmation...', { id: 'place-bid' });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Bid placed successfully!', { id: 'place-bid' });
      
      await fetchAllChallenges();
      
      return hash;
    } catch (error: any) {
      toast.dismiss('place-bid');
      const errorMsg = error?.message || 'Failed to place bid';
      if (errorMsg.includes('insufficient funds')) {
        toast.error('Insufficient balance');
      } else if (errorMsg.includes('Bidding closed')) {
        toast.error('Bidding has closed');
      } else if (errorMsg.includes('Bid must be higher')) {
        toast.error('Bid must be higher than current highest bid');
      } else {
        toast.error(errorMsg);
      }
      return null;
    }
  }, [address, isConnected, writeContractAsync, publicClient, fetchChallenge, fetchAllChallenges]);

  // Claim winnings
  const claim = useCallback(async (challengeId: number) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      toast.loading('Claiming winnings...', { id: 'claim' });

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'claim',
        args: [BigInt(challengeId)],
      });

      toast.loading('Waiting for confirmation...', { id: 'claim' });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Winnings claimed successfully!', { id: 'claim' });
      
      await fetchAllChallenges();
      
      return hash;
    } catch (error: any) {
      toast.dismiss('claim');
      const errorMsg = error?.message || 'Failed to claim winnings';
      toast.error(errorMsg);
      return null;
    }
  }, [address, isConnected, writeContractAsync, publicClient, fetchAllChallenges]);

  // Cancel challenge
  const cancelChallenge = useCallback(async (challengeId: number) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      toast.loading('Cancelling challenge...', { id: 'cancel' });

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'cancelChallenge',
        args: [BigInt(challengeId)],
      });

      toast.loading('Waiting for confirmation...', { id: 'cancel' });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Challenge cancelled successfully!', { id: 'cancel' });
      
      await fetchAllChallenges();
      
      return hash;
    } catch (error: any) {
      toast.dismiss('cancel');
      const errorMsg = error?.message || 'Failed to cancel challenge';
      toast.error(errorMsg);
      return null;
    }
  }, [address, isConnected, writeContractAsync, publicClient, fetchAllChallenges]);

  // Withdraw refund
  const withdrawRefund = useCallback(async (currency: CurrencyType) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      toast.loading('Withdrawing refund...', { id: 'withdraw-refund' });

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.H2H,
        abi: CONTRACTS.H2H.abi,
        functionName: 'withdrawRefund',
        args: [currency],
      });

      toast.loading('Waiting for confirmation...', { id: 'withdraw-refund' });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Refund withdrawn successfully!', { id: 'withdraw-refund' });
      
      return hash;
    } catch (error: any) {
      toast.dismiss('withdraw-refund');
      const errorMsg = error?.message || 'Failed to withdraw refund';
      toast.error(errorMsg);
      return null;
    }
  }, [address, isConnected, writeContractAsync, publicClient]);

  // Auto-refresh challenges
  useEffect(() => {
    if (CONTRACT_ADDRESSES.H2H !== '0x0000000000000000000000000000000000000000') {
      fetchAllChallenges();
      const interval = setInterval(fetchAllChallenges, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchAllChallenges]);

  return {
    challenges,
    loading,
    challengeCount: challengeCount ? Number(challengeCount) : 0,
    userTotalChallenges: userTotalChallenges ? Number(userTotalChallenges) : 0,
    userTotalWins: userTotalWins ? Number(userTotalWins) : 0,
    pendingRefundBNB: pendingRefundBNB || 0n,
    pendingRefundPRIX: pendingRefundPRIX || 0n,
    pendingRefundUSDT: pendingRefundUSDT || 0n,
    createChallenge,
    placeBid,
    claim,
    cancelChallenge,
    withdrawRefund,
    fetchChallenge,
    fetchAllChallenges,
  };
}

