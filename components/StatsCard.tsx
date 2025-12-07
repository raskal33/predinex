import { motion } from "framer-motion";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from "@heroicons/react/24/solid";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ElementType;
    trend?: {
        value: number;
        label?: string;
        direction?: 'up' | 'down' | 'neutral';
    };
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    delay?: number;
}

export default function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = 'primary',
    delay = 0
}: StatsCardProps) {

    const getColorClass = (colorType: string) => {
        switch (colorType) {
            case 'primary': return 'text-bsc-yellow from-bsc-yellow to-yellow-200';
            case 'secondary': return 'text-cyan-400 from-cyan-400 to-blue-400';
            case 'success': return 'text-market-rise from-market-rise to-emerald-300';
            case 'warning': return 'text-orange-400 from-orange-400 to-amber-200';
            case 'danger': return 'text-market-fall from-market-fall to-rose-300';
            case 'info': return 'text-blue-400 from-blue-400 to-indigo-300';
            default: return 'text-white from-white to-gray-300';
        }
    };

    const getBgColorClass = (colorType: string) => {
        switch (colorType) {
            case 'primary': return 'bg-yellow-500/10 border-yellow-500/20';
            case 'secondary': return 'bg-cyan-500/10 border-cyan-500/20';
            case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'warning': return 'bg-orange-500/10 border-orange-500/20';
            case 'danger': return 'bg-rose-500/10 border-rose-500/20';
            case 'info': return 'bg-blue-500/10 border-blue-500/20';
            default: return 'bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className={`stats-glass-panel p-6 relative overflow-hidden group hover:border-opacity-50 transition-all duration-300`}
        >
            {/* Background Glow */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 ${getColorClass(color).split(' ')[0].replace('text-', 'bg-')}`}></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
                        {subtitle && <span className="text-xs text-gray-500 mt-1">{subtitle}</span>}
                    </div>
                    {Icon && (
                        <div className={`p-2 rounded-lg ${getBgColorClass(color)}`}>
                            <Icon className={`w-5 h-5 ${getColorClass(color).split(' ')[0]}`} />
                        </div>
                    )}
                </div>

                <div className="flex items-end gap-3">
                    <div className={`stats-value-lg bg-gradient-to-br ${getColorClass(color)} bg-clip-text text-transparent`}>
                        {value}
                    </div>
                </div>

                {trend && (
                    <div className="mt-4 flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${trend.direction === 'up' || (trend.value > 0 && trend.direction !== 'down')
                                ? 'text-emerald-400 bg-emerald-400/10'
                                : trend.direction === 'down' || trend.value < 0
                                    ? 'text-rose-400 bg-rose-400/10'
                                    : 'text-gray-400 bg-gray-400/10'
                            }`}>
                            {trend.direction === 'up' || (trend.value > 0 && trend.direction !== 'down') ? (
                                <ArrowTrendingUpIcon className="w-3 h-3" />
                            ) : trend.direction === 'down' || trend.value < 0 ? (
                                <ArrowTrendingDownIcon className="w-3 h-3" />
                            ) : (
                                <MinusIcon className="w-3 h-3" />
                            )}
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                        {trend.label && <span className="text-xs text-gray-500">{trend.label}</span>}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
