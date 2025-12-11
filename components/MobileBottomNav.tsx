"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon,
  ChartBarIcon,
  SparklesIcon,
  WalletIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { 
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  SparklesIcon as SparklesIconSolid,
  WalletIcon as WalletIconSolid,
  UserIcon as UserIconSolid
} from "@heroicons/react/24/solid";
import { useWalletConnection } from '@/hooks/useWalletConnection';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isConnected, address } = useWalletConnection();

  const navItems = [
    {
      href: "/",
      label: "Home",
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
    },
    {
      href: "/markets",
      label: "Markets",
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid,
    },
    {
      href: "/h2h",
      label: "H2H",
      icon: UserIcon,
      iconSolid: UserIconSolid,
    },
    {
      href: "/create-prediction",
      label: "Create",
      icon: SparklesIcon,
      iconSolid: SparklesIconSolid,
    },
    {
      href: isConnected && address ? "/profile" : "#",
      label: isConnected && address ? "Profile" : "Wallet",
      icon: isConnected && address ? UserIcon : WalletIcon,
      iconSolid: isConnected && address ? UserIconSolid : WalletIconSolid,
      onClick: !isConnected ? (e: React.MouseEvent) => {
        e.preventDefault();
        // Wallet connect will be handled by the header
      } : undefined
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = isActive ? item.iconSolid : item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 ${
                isActive
                  ? "text-cyan-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'text-cyan-400' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

