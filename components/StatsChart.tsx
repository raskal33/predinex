import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartData,
    ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface StatsChartProps {
    title: string;
    subtitle?: string;
    type: 'line' | 'bar' | 'doughnut';
    data: ChartData<any>;
    height?: number;
    delay?: number;
}

export default function StatsChart({
    title,
    subtitle,
    type,
    data,
    height = 300,
    delay = 0
}: StatsChartProps) {

    const commonOptions: ChartOptions<any> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: '#9CA3AF',
                    font: {
                        family: 'var(--font-onest)',
                        size: 12
                    },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 20, 25, 0.9)',
                titleColor: '#FFFFFF',
                bodyColor: '#E5E7EB',
                borderColor: 'rgba(255, 193, 7, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                titleFont: {
                    family: 'var(--font-onest)',
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    family: 'var(--font-onest)',
                    size: 13
                }
            }
        },
        scales: type !== 'doughnut' ? {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6B7280',
                    font: {
                        family: 'var(--font-onest)',
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#6B7280',
                    font: {
                        family: 'var(--font-onest)',
                        size: 11
                    }
                }
            }
        } : undefined,
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5 }}
            className="stats-glass-panel p-6 flex flex-col h-full"
        >
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
            </div>

            <div className="flex-grow w-full relative" style={{ minHeight: height }}>
                {type === 'line' && <Line data={data} options={commonOptions} />}
                {type === 'bar' && <Bar data={data} options={commonOptions} />}
                {type === 'doughnut' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-full max-w-[300px]">
                            <Doughnut
                                data={data}
                                options={{
                                    ...commonOptions,
                                    cutout: '70%',
                                    plugins: {
                                        ...commonOptions.plugins,
                                        legend: {
                                            ...commonOptions.plugins?.legend,
                                            position: 'bottom'
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
