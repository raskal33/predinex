"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { SocialIcons } from "@/components/icons/SocialIcons";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: "Markets", href: "/" },
    { name: "Create Prediction", href: "/create-prediction" },
    { name: "Staking", href: "/staking" },
    { name: "Stats", href: "/stats" },
  ];

  const communityLinks = [
    { name: "Community Hub", href: "/community" },
    { name: "Profile", href: "/profile" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Leaderboard", href: "/stats" },
  ];

  const resourceLinks = [
    { name: "Documentation", href: "https://drive.google.com/file/d/1YeC8u3tkSA-VOI96Ut2WEfrQhps1OIjG/view" },
    { name: "API", href: "https://predinex.com/api" },
    { name: "Help Center", href: "/contact" },
    { name: "Blog", href: "/community" },
  ];

  const legalLinks = [
    { name: "Terms of Service", href: "/terms-of-service" },
    { name: "Privacy Policy", href: "https://predinex.com/privacy-policy" },
    { name: "Cookie Policy", href: "https://predinex.com/cookie-policy" },
    { name: "Disclaimer", href: "/disclaimer" },
  ];

  return (
    <footer className="relative mt-auto z-10 border-t border-white/5 bg-[#0F1419]">
      <div className="container-nav section-padding py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Logo */}
              <Link href="/" className="inline-block relative">
                <Image
                  src="/logo.png"
                  alt="Predinex"
                  width={180}
                  height={45}
                  className="h-auto relative object-contain"
                  style={{ mixBlendMode: 'lighten' }}
                />
              </Link>

              {/* Description */}
              <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
                The future of decentralized prediction markets. Trade on real-world outcomes
                with transparent, blockchain-powered markets on Binance Smart Chain.
              </p>

              {/* Social Links */}
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-4">Follow Us</p>
                <SocialIcons />
              </div>
            </motion.div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Product */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Product</h3>
                <ul className="space-y-3">
                  {productLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Community */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Community</h3>
                <ul className="space-y-3">
                  {communityLinks.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Resources */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Resources</h3>
                <ul className="space-y-3">
                  {resourceLinks.map((link) => (
                    <li key={link.name}>
                      {link.href.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Legal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Legal</h3>
                <ul className="space-y-3">
                  {legalLinks.map((link) => (
                    <li key={link.name}>
                      {link.href.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-gray-400 hover:text-bsc-yellow transition-colors duration-200"
                        >
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 pt-8 border-t border-white/5"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>© {currentYear} Predinex.</span>
              <span>All rights reserved.</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Powered by</span>
              <a
                href="https://www.bnbchain.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-semibold text-yellow-400 hover:text-yellow-300 transition-colors duration-200 group"
              >
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
                  Binance Smart Chain
                </span>
                <svg
                  className="w-4 h-4 text-yellow-400 group-hover:text-yellow-300 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
