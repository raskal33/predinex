"use client";

import { useState } from "react";
import { PoolCardFull, PoolCardCatalog, PoolCardModal } from "@/components/PoolCard";
import { EnhancedPool } from "@/components/EnhancedPoolCard";

export default function DemoPoolCardsPage() {
  const [selectedPool, setSelectedPool] = useState<EnhancedPool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sample pool data with degen aesthetics
  const samplePools: (EnhancedPool & {
    imageUrl?: string;
    yesVolume?: number;
    noVolume?: number;
    yesOdds?: number;
    noOdds?: number;
    topPredictor?: string;
    isMinority?: boolean;
  })[] = [
    {
      id: 1,
      title: "Barcelona to lose vs Getafe",
      category: "LaLiga",
      league: "LaLiga",
      region: "Europe",
      creator: "0xdegenAI",
      odds: 240, // 2.4x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: false,
      filledAbove60: true,
      oracleType: "GUIDED",
      status: "active",
      creatorStake: "1000000000000000000", // 1 SOL
      totalCreatorSideStake: "24000000000000000000", // 24 SOL
      maxBettorStake: "0",
      totalBettorStake: "16000000000000000000", // 16 SOL
      predictedOutcome: "Barcelona wins",
      result: "",
      marketId: "1",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 3, // 3 hours
      bettingEndTime: Date.now() / 1000 + 3600 * 2.5,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "Barcelona",
      awayTeam: "Getafe",
      maxBetPerUser: "0",
      boostTier: "GOLD",
      boostExpiry: Date.now() / 1000 + 3600 * 24,
      trending: true,
      yesVolume: 24,
      noVolume: 16,
      yesOdds: 2.4,
      noOdds: 1.6,
      topPredictor: "whale69",
      isMinority: true,
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 128,
        fillPercentage: 75,
        totalVolume: "40000000000000000000",
        betCount: 45,
        avgBetSize: "800000000000000000",
        creatorReputation: 850,
        categoryRank: 1,
        isHot: true,
        lastActivity: new Date(),
      },
    },
    {
      id: 2,
      title: "Messi red card today",
      category: "Football",
      league: "MLS",
      region: "North America",
      creator: "0xcontrarian",
      odds: 850, // 8.5x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: false,
      filledAbove60: false,
      oracleType: "OPEN",
      status: "active",
      creatorStake: "500000000000000000", // 0.5 SOL
      totalCreatorSideStake: "4000000000000000000", // 4 SOL
      maxBettorStake: "0",
      totalBettorStake: "96000000000000000000", // 96 SOL
      predictedOutcome: "No red card",
      result: "",
      marketId: "2",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 5,
      bettingEndTime: Date.now() / 1000 + 3600 * 4.5,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "Inter Miami",
      awayTeam: "NYC FC",
      maxBetPerUser: "0",
      boostTier: "NONE",
      boostExpiry: 0,
      trending: false,
      yesVolume: 4,
      noVolume: 96,
      yesOdds: 8.5,
      noOdds: 1.1,
      topPredictor: "degenKing",
      isMinority: true,
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 256,
        fillPercentage: 4,
        totalVolume: "100000000000000000000",
        betCount: 120,
        avgBetSize: "800000000000000000",
        creatorReputation: 420,
        categoryRank: 15,
        isHot: false,
        lastActivity: new Date(),
      },
    },
    {
      id: 3,
      title: "Ronaldo misses PK",
      category: "Football",
      league: "Saudi Pro League",
      region: "Middle East",
      creator: "0xwhale",
      odds: 520, // 5.2x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: false,
      filledAbove60: true,
      oracleType: "GUIDED",
      status: "active",
      creatorStake: "2000000000000000000", // 2 SOL
      totalCreatorSideStake: "12000000000000000000", // 12 SOL
      maxBettorStake: "0",
      totalBettorStake: "88000000000000000000", // 88 SOL
      predictedOutcome: "Ronaldo scores",
      result: "",
      marketId: "3",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 2,
      bettingEndTime: Date.now() / 1000 + 3600 * 1.5,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "Al Nassr",
      awayTeam: "Al Hilal",
      maxBetPerUser: "0",
      boostTier: "SILVER",
      boostExpiry: Date.now() / 1000 + 3600 * 12,
      trending: true,
      yesVolume: 12,
      noVolume: 88,
      yesOdds: 5.2,
      noOdds: 1.2,
      topPredictor: "cryptoBull",
      isMinority: true,
      imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 89,
        fillPercentage: 12,
        totalVolume: "100000000000000000000",
        betCount: 67,
        avgBetSize: "1500000000000000000",
        creatorReputation: 720,
        categoryRank: 3,
        isHot: true,
        lastActivity: new Date(),
      },
    },
    {
      id: 4,
      title: "Bitcoin hits $100k this week",
      category: "Crypto",
      league: "Crypto",
      region: "Global",
      creator: "0xbull",
      odds: 320, // 3.2x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: true,
      filledAbove60: true,
      oracleType: "OPEN",
      status: "active",
      creatorStake: "5000000000000000000", // 5 SOL
      totalCreatorSideStake: "60000000000000000000", // 60 SOL
      maxBettorStake: "0",
      totalBettorStake: "40000000000000000000", // 40 SOL
      predictedOutcome: "Bitcoin below $100k",
      result: "",
      marketId: "4",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 24 * 7,
      bettingEndTime: Date.now() / 1000 + 3600 * 24 * 6.5,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "",
      awayTeam: "",
      maxBetPerUser: "0",
      boostTier: "GOLD",
      boostExpiry: Date.now() / 1000 + 3600 * 48,
      trending: true,
      yesVolume: 60,
      noVolume: 40,
      yesOdds: 3.2,
      noOdds: 1.5,
      topPredictor: "cryptoWhale",
      isMinority: false,
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 512,
        fillPercentage: 60,
        totalVolume: "100000000000000000000",
        betCount: 234,
        avgBetSize: "400000000000000000",
        creatorReputation: 950,
        categoryRank: 1,
        isHot: true,
        lastActivity: new Date(),
      },
    },
    {
      id: 5,
      title: "Ethereum merge successful",
      category: "Crypto",
      league: "Crypto",
      region: "Global",
      creator: "0xethMaxi",
      odds: 150, // 1.5x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: true,
      filledAbove60: true,
      oracleType: "OPEN",
      status: "active",
      creatorStake: "10000000000000000000", // 10 SOL
      totalCreatorSideStake: "80000000000000000000", // 80 SOL
      maxBettorStake: "0",
      totalBettorStake: "20000000000000000000", // 20 SOL
      predictedOutcome: "Merge fails",
      result: "",
      marketId: "5",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 12,
      bettingEndTime: Date.now() / 1000 + 3600 * 11,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "",
      awayTeam: "",
      maxBetPerUser: "0",
      boostTier: "NONE",
      boostExpiry: 0,
      trending: false,
      yesVolume: 80,
      noVolume: 20,
      yesOdds: 1.5,
      noOdds: 2.5,
      topPredictor: "ethBuilder",
      isMinority: false,
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 345,
        fillPercentage: 80,
        totalVolume: "100000000000000000000",
        betCount: 189,
        avgBetSize: "500000000000000000",
        creatorReputation: 680,
        categoryRank: 5,
        isHot: false,
        lastActivity: new Date(),
      },
    },
    {
      id: 6,
      title: "Solana breaks $200",
      category: "Crypto",
      league: "Crypto",
      region: "Global",
      creator: "0xsolChad",
      odds: 450, // 4.5x
      settled: false,
      creatorSideWon: false,
      isPrivate: false,
      usesPrix: true,
      filledAbove60: false,
      oracleType: "OPEN",
      status: "active",
      creatorStake: "3000000000000000000", // 3 SOL
      totalCreatorSideStake: "30000000000000000000", // 30 SOL
      maxBettorStake: "0",
      totalBettorStake: "70000000000000000000", // 70 SOL
      predictedOutcome: "Solana below $200",
      result: "",
      marketId: "6",
      eventStartTime: Date.now() / 1000,
      eventEndTime: Date.now() / 1000 + 3600 * 48,
      bettingEndTime: Date.now() / 1000 + 3600 * 47,
      resultTimestamp: 0,
      arprixationDeadline: 0,
      homeTeam: "",
      awayTeam: "",
      maxBetPerUser: "0",
      boostTier: "BRONZE",
      boostExpiry: Date.now() / 1000 + 3600 * 24,
      trending: true,
      yesVolume: 30,
      noVolume: 70,
      yesOdds: 4.5,
      noOdds: 1.3,
      topPredictor: "solMaxi",
      isMinority: true,
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
      indexedData: {
        participantCount: 178,
        fillPercentage: 30,
        totalVolume: "100000000000000000000",
        betCount: 98,
        avgBetSize: "1000000000000000000",
        creatorReputation: 550,
        categoryRank: 8,
        isHot: false,
        lastActivity: new Date(),
      },
    },
  ];

  const handlePoolClick = (pool: EnhancedPool) => {
    setSelectedPool(pool);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🚀 Degen Pool Cards
          </h1>
          <p className="text-neutral-400 text-lg">
            Pump.fun style prediction markets - NFT catalog view with full card expansion
          </p>
        </div>

        {/* Full Card Example */}
        <div className="flex justify-center">
          <PoolCardFull 
            pool={samplePools[0]} 
            onClick={() => handlePoolClick(samplePools[0])}
          />
        </div>

        {/* Catalog Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Catalog View (NFT Style)</h2>
          <PoolCardCatalog 
            pools={samplePools} 
            onPoolClick={handlePoolClick}
          />
        </div>

        {/* Usage Instructions */}
        <div className="mt-12 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
          <h3 className="text-xl font-bold text-white mb-4">Usage</h3>
          <div className="space-y-2 text-neutral-400 text-sm">
            <p>• <code className="text-cyan-400">PoolCardNFT</code> - Compact NFT-style card for catalog view</p>
            <p>• <code className="text-cyan-400">PoolCardFull</code> - Expanded full card view</p>
            <p>• <code className="text-cyan-400">PoolCardCatalog</code> - Grid layout for multiple pools</p>
            <p>• <code className="text-cyan-400">PoolCardModal</code> - Modal overlay for full card view</p>
            <p className="mt-4 text-neutral-300">
              <strong>Color Psychology:</strong> Red/Orange for urgency (hot markets), Green for bullish (trust), 
              Purple for premium (contrarian), Cyan for modern (active markets)
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <PoolCardModal
        pool={selectedPool}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

