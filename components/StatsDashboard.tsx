"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChartBarIcon,
    GlobeAltIcon,
    ArrowTrendingUpIcon,
    TrophyIcon,
    SparklesIcon,
    BoltIcon,
    ShieldCheckIcon,
    ArrowPathIcon
} from "@heroicons/react/24/outline";
import { useUnifiedAnalyticsDashboard } from "@/hooks/useContractAnalytics";
import StatsCard from "./StatsCard";
import StatsChart from "./StatsChart";
import AnimatedTitle from "./AnimatedTitle";

export default function StatsDashboard() {
    const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "leaderboard">("overview");
    const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("7d");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        globalStats,
        activePools,
        isLoading,
        error,
        refetchAll
    } = useUnifiedAnalyticsDashboard(timeframe);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        await refetchAll();
        setTimeout(() => setIsRefreshing(false), 1000);
    }, [isRefreshing, refetchAll]);

    // Mock data for charts (replace with real data when available)
    const volumeData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Volume (BNB)',
                data: [120, 190, 300, 500, 200, 300, 450],
                borderColor: '#FFC107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const categoryData = {
        labels: ['Sports', 'Crypto', 'Politics', 'Finance'],
        datasets: [{
            data: [45, 30, 15, 10],
            backgroundColor: [
                '#FFC107', '#10B981', '#8B5CF6', '#3B82F6',
            ],
            borderWidth: 0,
        }],
    };

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="stats-glass-panel p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheckIcon className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Analytics Error</h3>
                    <p className="text-gray-300 mb-4">
                        {error instanceof Error ? error.message : 'Failed to load analytics data'}
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="btn btn-primary w-full"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <AnimatedTitle
                        size="lg"
                        leftIcon={ChartBarIcon}
                        rightIcon={SparklesIcon}
                    >
                        Platform Analytics
                    </AnimatedTitle>
                    <p className="text-gray-400 mt-2 max-w-2xl">
                        Real-time insights into market performance, user activity, and platform growth on the Somnia Network.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Timeframe Selector */}
                    <div className="glass-card p-1 flex items-center gap-1 rounded-xl">
                        {[
                            { id: "24h", label: "24H" },
                            { id: "7d", label: "7D" },
                            { id: "30d", label: "30D" },
                            { id: "all", label: "ALL" },
                        ].map((period) => (
                            <button
                                key={period.id}
                                onClick={() => setTimeframe(period.id as any)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${timeframe === period.id
                                        ? "bg-bsc-yellow text-black shadow-lg"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        className={`p-3 rounded-xl glass-card text-bsc-yellow hover:bg-white/5 transition-all duration-200 ${isRefreshing ? "animate-spin" : ""
                            }`}
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Volume"
                    value={isLoading ? "..." : `${globalStats?.globalMetrics.totalVolume?.toFixed(2) || '0'} BNB`}
                    icon={ArrowTrendingUpIcon}
                    color="primary"
                    trend={{ value: 12.5, direction: 'up', label: 'vs last period' }}
                    delay={0.1}
                />
                <StatsCard
                    title="Active Pools"
                    value={isLoading ? "..." : (globalStats?.globalMetrics.activePools?.toLocaleString() || '0')}
                    icon={BoltIcon}
                    color="secondary"
                    trend={{ value: 5.2, direction: 'up' }}
                    delay={0.2}
                />
                <StatsCard
                    title="Total Users"
                    value={isLoading ? "..." : (globalStats?.globalMetrics.totalUsers?.toLocaleString() || '0')}
                    icon={GlobeAltIcon}
                    color="success"
                    trend={{ value: 8.1, direction: 'up' }}
                    delay={0.3}
                />
                <StatsCard
                    title="Platform Health"
                    value={isLoading ? "..." : (globalStats?.performanceInsights.platformHealth?.toUpperCase() || 'STABLE')}
                    icon={ShieldCheckIcon}
                    color="info"
                    subtitle="System Status"
                    delay={0.4}
                />
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-800">
                <div className="flex gap-8">
                    {[
                        { id: "overview", label: "Overview" },
                        { id: "analytics", label: "Market Analytics" },
                        { id: "leaderboard", label: "Leaderboard" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 text-sm font-bold transition-all duration-200 relative ${activeTab === tab.id
                                    ? "text-bsc-yellow"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-bsc-yellow"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 h-[400px]">
                                <StatsChart
                                    title="Volume Trends"
                                    subtitle="Transaction volume over time"
                                    type="line"
                                    data={volumeData}
                                    height={320}
                                />
                            </div>
                            <div className="h-[400px]">
                                <StatsChart
                                    title="Market Distribution"
                                    subtitle="Active pools by category"
                                    type="doughnut"
                                    data={categoryData}
                                    height={320}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === "analytics" && (
                    <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatsChart
                                title="User Activity"
                                subtitle="Daily active users"
                                type="bar"
                                data={volumeData} // Reuse for demo
                                height={300}
                            />
                            <StatsChart
                                title="Pool Performance"
                                subtitle="Success rate by category"
                                type="bar"
                                data={categoryData} // Reuse for demo
                                height={300}
                            />
                        </div>
                    </motion.div>
                )}

                {activeTab === "leaderboard" && (
                    <motion.div
                        key="leaderboard"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        <div className="stats-glass-panel p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <TrophyIcon className="w-5 h-5 text-bsc-yellow" />
                                    Top Creators
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {activePools?.slice(0, 5).map((pool: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index === 0 ? 'bg-yellow-500 text-black' :
                                                    index === 1 ? 'bg-gray-300 text-black' :
                                                        index === 2 ? 'bg-orange-500 text-black' :
                                                            'bg-gray-700 text-white'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Pool #{pool.poolId?.toString()}</p>
                                                <p className="text-xs text-gray-400">{pool.creator?.slice(0, 6)}...{pool.creator?.slice(-4)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-bsc-yellow">{Number(pool.creatorStake || 0) / 1e18} ETH</p>
                                            <p className="text-xs text-gray-500">Total Stake</p>
                                        </div>
                                    </div>
                                ))}
                                {!activePools?.length && (
                                    <p className="text-center text-gray-500 py-4">No active creators found</p>
                                )}
                            </div>
                        </div>

                        <div className="stats-glass-panel p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BoltIcon className="w-5 h-5 text-orange-500" />
                                    Trending Pools
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {activePools?.slice(0, 5).map((pool: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
                                                <BoltIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Pool #{pool.poolId?.toString()}</p>
                                                <p className="text-xs text-gray-400">{pool.category || 'General'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-green-400">Active</p>
                                            <p className="text-xs text-gray-500">Status</p>
                                        </div>
                                    </div>
                                ))}
                                {!activePools?.length && (
                                    <p className="text-center text-gray-500 py-4">No trending pools found</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
