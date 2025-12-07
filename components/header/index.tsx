"use client";

import { useWindowScroll } from "@uidotdev/usehooks";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  UsersIcon,
  UserIcon,
  FireIcon,
  TrophyIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
  WalletIcon,
  SparklesIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";
import {
  TrophyIcon as TrophyIconSolid,
  SparklesIcon as SparklesIconSolid,
  FireIcon as FireIconSolid
} from "@heroicons/react/24/solid";
import { useProfileStore } from '@/stores/useProfileStore';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import NotificationBadge from "@/components/NotificationBadge";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isPredinextorOpen, setIsPredinextorOpen] = useState<boolean>(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState<boolean>(false);
  const [isMarketsOpen, setIsMarketsOpen] = useState<boolean>(false);
  const [{ y }] = useWindowScroll();
  const segment = useSelectedLayoutSegment();
  const [isRender, setIsRender] = useState<boolean>(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Refs for dropdown positioning
  const predinextorButtonRef = useRef<HTMLButtonElement>(null);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const marketsButtonRef = useRef<HTMLButtonElement>(null);


  // Custom wallet connection hook
  const {
    isConnected,
    address,
    isOnSomnia,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchToSomnia,
  } = useWalletConnection();
  const { setCurrentProfile } = useProfileStore();

  useEffect(() => {
    setIsRender(true);
  }, []);

  // Update current profile when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      setCurrentProfile(address);
    } else {
      setCurrentProfile(null);
    }
  }, [address, isConnected, setCurrentProfile]);

  const newY = y || 1;
  const isScrolled = newY > 50;

  const handleClose = () => {
    setIsMenuOpen(false);
  };
  const handlePredinextorToggle = () => setIsPredinextorOpen(!isPredinextorOpen);
  const handlePredinextorClose = () => setIsPredinextorOpen(false);
  const handleWalletDropdownToggle = () => setIsWalletDropdownOpen(!isWalletDropdownOpen);
  const handleWalletDropdownClose = () => setIsWalletDropdownOpen(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsPredinextorOpen(false);
      setIsWalletDropdownOpen(false);
      setIsMarketsOpen(false);
    };

    if (isPredinextorOpen || isWalletDropdownOpen || isMarketsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isPredinextorOpen, isWalletDropdownOpen, isMarketsOpen]);

  // Close dropdowns on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsPredinextorOpen(false);
      setIsWalletDropdownOpen(false);
      setIsMarketsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const handleMarketsToggle = () => setIsMarketsOpen(!isMarketsOpen);
  const handleMarketsClose = () => setIsMarketsOpen(false);

  const marketsSubItems = [
    { href: "/markets", label: "All Markets", icon: ChartBarIcon, segment: "markets", color: "from-cyan-500 to-blue-500" },
    { href: "/markets/trending", label: "Trending", icon: FireIcon, segment: "trending", color: "from-orange-500 to-red-500" },
    { href: "/markets/boosted", label: "Boosted", icon: SparklesIcon, segment: "boosted", color: "from-yellow-500 to-amber-500" },
    { href: "/markets/private", label: "Private", icon: CubeTransparentIcon, segment: "private", color: "from-purple-500 to-pink-500" },
    { href: "/markets/combo", label: "Combo", icon: CubeTransparentIcon, segment: "combo", color: "from-emerald-500 to-green-500" },
  ];

  const navItems = [
    { href: "/gauntlet", label: "Gauntlet", icon: FireIcon, iconSolid: FireIconSolid, segment: "gauntlet", color: "from-[#FFC107] to-[#F7B600]" },
    { href: "/stats", label: "Stats", icon: ChartBarIcon, iconSolid: ChartBarIcon, segment: "stats", color: "from-[#3B82F6] to-[#2563EB]" },
    { href: "/rewards", label: "Prize", icon: TrophyIcon, iconSolid: TrophyIconSolid, segment: "rewards", color: "from-[#FFC107] to-[#F7B600]" },
    { href: "/staking", label: "Staking", icon: SparklesIcon, iconSolid: SparklesIconSolid, segment: "staking", color: "from-[#10B981] to-[#059669]" },
    { href: "/docs", label: "Docs", icon: BookOpenIcon, iconSolid: BookOpenIcon, segment: "docs", color: "from-[#FFC107] to-[#10B981]" },
  ];

  if (segment !== "/_not-found") {
    return (
      <>
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            backgroundColor: isScrolled
              ? "rgba(15, 20, 25, 0.95)"
              : "rgba(15, 20, 25, 0.8)",
            backdropFilter: isScrolled ? "blur(20px)" : "blur(12px)",
            borderBottomColor: isScrolled ? "rgba(255, 255, 255, 0.05)" : "transparent"
          }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-0 top-0 z-[100] transition-all duration-300 border-b border-transparent"
        >
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">

              {/* Left - Logo */}
              <motion.div
                className="flex items-center gap-6 flex-shrink-0"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link href="/" className="relative group">
                  <Image
                    src="/logo.png"
                    alt="Predinex Logo"
                    width={120}
                    height={40}
                    className="relative navbar-logo object-contain"
                    priority
                    style={{ mixBlendMode: 'lighten' }}
                  />
                </Link>
              </motion.div>

              {/* Center - Icon-Based Navigation with Hover Reveals */}
              <nav className="hidden lg:flex items-center gap-2 min-w-0">
                {/* Markets Dropdown */}
                <div className="relative" style={{ zIndex: 1000 }}>
                  <motion.button
                    ref={marketsButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarketsToggle();
                    }}
                    onMouseEnter={() => setHoveredNav("/markets")}
                    onMouseLeave={() => setHoveredNav(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group"
                  >
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 ${segment === "markets" || segment?.startsWith("markets")
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <ChartBarIcon className="h-5 w-5 relative z-10" />
                    </div>

                    <AnimatePresence>
                      {hoveredNav === "/markets" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 px-2 py-2 bg-[#0F1419] border border-white/10 rounded-xl shadow-xl z-50 min-w-[180px]"
                        >
                          <div className="relative space-y-1">
                            {marketsSubItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isActive = segment === subItem.segment;
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  onClick={handleMarketsClose}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group ${isActive
                                    ? "bg-white/10 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                  <SubIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                  <span>{subItem.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* Nexpert - Icon Button in Center */}
                <div className="relative" style={{ zIndex: 1000 }}>
                  <motion.button
                    ref={predinextorButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePredinextorToggle();
                    }}
                    onMouseEnter={() => setHoveredNav("/nexpert")}
                    onMouseLeave={() => setHoveredNav(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group"
                  >
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 ${segment === "dashboard" || segment === "profile" || segment === "leaderboard" || segment === "community"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <UserIcon className="h-5 w-5 relative z-10" />
                    </div>

                    <AnimatePresence>
                      {hoveredNav === "/nexpert" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-2 bg-[#0F1419] border border-white/10 rounded-xl shadow-xl z-50 min-w-[160px]"
                        >
                          <div className="relative space-y-1">
                            {nexpertLinks.map((link) => {
                              const LinkIcon = link.icon;
                              const isActive = segment === link.segment;
                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  onClick={handlePredinextorClose}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group ${isActive
                                    ? "bg-white/10 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                  <LinkIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                  <span>{link.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {navItems.map((item) => {
                  const Icon = segment === item.segment ? item.iconSolid : item.icon;
                  const isActive = segment === item.segment;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setHoveredNav(item.href)}
                      onMouseLeave={() => setHoveredNav(null)}
                      className="relative group"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 ${isActive
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                      >
                        <Icon className="h-5 w-5 relative z-10" />
                      </motion.div>

                      {/* Label on hover */}
                      <AnimatePresence>
                        {hoveredNav === item.href && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#0F1419] border border-white/10 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-xl z-50"
                          >
                            {item.label}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </nav>

              {/* Right - Wallet & Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Notification Badge */}
                {isConnected && address && isRender && (
                  <div className="hidden sm:block">
                    <NotificationBadge />
                  </div>
                )}

                {/* Wallet Connection */}
                {isRender && (
                  <div className="hidden sm:block">
                    {isConnected && address ? (
                      <div className="relative" style={{ zIndex: 1000 }}>
                        <motion.button
                          ref={walletButtonRef}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWalletDropdownToggle();
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-medium transition-all duration-300 overflow-hidden group"
                        >
                          <div className={`w-2 h-2 rounded-full ${isOnSomnia ? 'bg-emerald-400' : 'bg-orange-400'} relative z-10 shadow-lg ${isOnSomnia ? 'shadow-emerald-400/50' : 'shadow-orange-400/50'}`}></div>
                          <span className="text-gray-200 font-mono text-xs relative z-10">
                            {address.slice(0, 5)}...{address.slice(-4)}
                          </span>
                          <motion.div
                            animate={{ rotate: isWalletDropdownOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative z-10"
                          >
                            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                          </motion.div>
                        </motion.button>

                        <AnimatePresence>
                          {isWalletDropdownOpen && (() => {
                            if (!walletButtonRef.current || typeof window === 'undefined') return null;
                            const rect = walletButtonRef.current.getBoundingClientRect();
                            return (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="fixed w-48 bg-[#0F1419] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                style={{
                                  zIndex: 1001,
                                  top: `${rect.bottom + 8}px`,
                                  right: `${window.innerWidth - rect.right}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="relative py-2 px-1">
                                  {!isOnSomnia && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        switchToSomnia();
                                        handleWalletDropdownClose();
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 mx-1 text-sm font-medium transition-all duration-200 rounded-lg text-orange-400 hover:text-orange-300 hover:bg-white/5"
                                    >
                                      <span>Switch Network</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      disconnectWallet();
                                      handleWalletDropdownClose();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 mx-1 text-sm font-medium transition-all duration-200 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
                                  >
                                    <span>Disconnect</span>
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <motion.button
                        onClick={connectWallet}
                        disabled={isConnecting}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 overflow-hidden group bg-bsc-yellow text-black hover:bg-bsc-gold"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <WalletIcon className="h-4 w-4" />
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </span>
                      </motion.button>
                    )}
                  </div>
                )}


                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="lg:hidden relative z-50 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white transition-all"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  <AnimatePresence mode="wait">
                    {isMenuOpen ? (
                      <motion.div
                        key="close"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="menu"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Bars3Icon className="h-5 w-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-[#0F1419] border-l border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2" onClick={handleClose}>
                      <Image
                        src="/logo.png"
                        alt="Predinex Logo"
                        width={100}
                        height={32}
                        className="navbar-logo object-contain"
                        priority
                        style={{ mixBlendMode: 'lighten' }}
                      />
                    </Link>
                  </div>

                  <nav className="flex-1 p-4 overflow-y-auto space-y-2">
                    {/* Markets Section */}
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Markets</h3>
                      <div className="space-y-1">
                        {marketsSubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isActive = segment === subItem.segment;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={handleClose}
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-white/10 text-white"
                                : "text-gray-300 hover:text-white hover:bg-white/5"
                                }`}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Nav Items */}
                    {navItems.map((item) => {
                      const Icon = segment === item.segment ? item.iconSolid : item.icon;
                      const isActive = segment === item.segment;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleClose}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                            ? "bg-white/10 text-white"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                            }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="p-4 border-t border-white/5 space-y-2">
                    {isConnected && address ? (
                      <>
                        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${isOnSomnia ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
                            <span className="text-gray-300 font-mono text-xs">
                              {address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            disconnectWallet();
                          }}
                          className="w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          connectWallet();
                        }}
                        disabled={isConnecting}
                        className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-bsc-yellow text-black hover:bg-bsc-gold transition-colors disabled:opacity-50"
                      >
                        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
}

const nexpertLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    segment: "dashboard",
    icon: ChartBarIcon,
  },
  {
    label: "Profile",
    href: "/profile",
    segment: "profile",
    icon: UserIcon,
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    segment: "leaderboard",
    icon: TrophyIcon,
  },
  {
    label: "Community",
    href: "/community",
    segment: "community",
    icon: UsersIcon,
  },
];
