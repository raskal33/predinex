import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia, type AppKitNetwork } from '@reown/appkit/networks'

// BSC Testnet Network configuration
export const bscTestnetNetwork: AppKitNetwork = {
  id: 97,
  name: 'BSC Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8080/api/rpc-proxy'
          : process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
        'https://bsc-testnet.drpc.org',
        'https://data-seed-prebsc-1-s1.binance.org:8545',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
}

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '6a0514d82fb621e41aa6cad5473883a3'

// Create the networks array
const networks = [bscTestnetNetwork, mainnet, sepolia] as [AppKitNetwork, ...AppKitNetwork[]]

// Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// Create AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'PRIX - Connect Wallet',
    description: 'Connect your wallet to access decentralized prediction markets on BSC Testnet',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://predinex.vercel.app',
    icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://predinex.vercel.app/logo.png'],
  },
  features: {
    analytics: false, // Disable analytics to remove Reown tracking
    email: false,
    socials: false,
    emailShowWallets: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-font-family': 'var(--font-onest), system-ui, sans-serif',
    '--w3m-accent': '#22C7FF',
    '--w3m-color-mix': '#22C7FF',
    '--w3m-color-mix-strength': 25,
    '--w3m-border-radius-master': '16px',
    '--w3m-z-index': 999999,
  },
  allWallets: 'HIDE',
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
  ],
  // Improved connection settings
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: false, // Disable Coinbase for better performance
})

export const config = wagmiAdapter.wagmiConfig

// Contract addresses for smart contract integration - BSC TESTNET DEPLOYMENT (Diamond Pattern)
// ✅ UPDATED: New deployment addresses (January 2025)
export const CONTRACT_ADDRESSES = {
  // Core Contracts (BSC TESTNET) - Updated with NEW Diamond deployment
  PRIX_TOKEN: (process.env.NEXT_PUBLIC_PRIX_TOKEN_ADDRESS || '0x4675C0B7ab27805Eb91192Adaefc80f6A4d07771') as `0x${string}`,
  POOL_CORE: (process.env.NEXT_PUBLIC_POOL_CORE_ADDRESS || '0x735DE180558679E6132F51e410387A8f7d10c07E') as `0x${string}`, // PredinexDiamond
  PREDINEX_DIAMOND: (process.env.NEXT_PUBLIC_POOL_CORE_ADDRESS || '0x735DE180558679E6132F51e410387A8f7d10c07E') as `0x${string}`, // Main Diamond proxy
  BOOST_SYSTEM: (process.env.NEXT_PUBLIC_BOOST_SYSTEM_ADDRESS || '0xe97e95D7c6d4973E998c5FF446Cd7D0A21b18bDe') as `0x${string}`,
  COMBO_POOLS: (process.env.NEXT_PUBLIC_COMBO_POOLS_ADDRESS || '0x8FFaEf1FCa8C9FDba38D60fb0606136ccc405Da3') as `0x${string}`,
  FACTORY: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xd016d1F5814Ef331112D8334A03b7D4142D0650A') as `0x${string}`,
  
  // Oracle Contracts
  GUIDED_ORACLE: (process.env.NEXT_PUBLIC_GUIDED_ORACLE_ADDRESS || '0xa77EC39Ea46b12Ef37c19565066Cf2B74347bB1d') as `0x${string}`,
  OPTIMISTIC_ORACLE: (process.env.NEXT_PUBLIC_OPTIMISTIC_ORACLE_ADDRESS || '0x2cD2f828d392945AbCbe1d2e3f35AC703de633E1') as `0x${string}`,
  
  // System Contracts
  REPUTATION_SYSTEM: (process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS || '0x27Bd891EA40DE45d4da18e52D7f6CD3EB804f833') as `0x${string}`,
  STAKING_CONTRACT: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || '0xfBb8cBb91D5c4fBF47a5dbdd9EE809CeaaBc5ee7') as `0x${string}`,
  H2H: (process.env.NEXT_PUBLIC_H2H_ADDRESS || '0x925d026F27eD571e0239de7F4Dda40B45F38b983') as `0x${string}`, // PredinexH2H (BSC Testnet)
  FAUCET: (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '') as `0x${string}`, // No longer deployed
  ODDYSSEY: (process.env.NEXT_PUBLIC_ODDYSSEY_ADDRESS || '0x4B2FcfaC9b8ABF108699c63d2648AF8943673954') as `0x${string}`,
  
  // Legacy support (for backward compatibility) - UPDATED TO NEW BSC TESTNET ADDRESSES
  PREDINEX_POOL: (process.env.NEXT_PUBLIC_PREDINEX_POOL_ADDRESS || '0x735DE180558679E6132F51e410387A8f7d10c07E') as `0x${string}`, // Points to Diamond
  PREDINEX_STAKING: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || '0xfBb8cBb91D5c4fBF47a5dbdd9EE809CeaaBc5ee7') as `0x${string}`,
  
  // Token Contracts
  USDT_TOKEN: (process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS || '0x55d398326f99059fF775485246999027B3197955') as `0x${string}`, // USDT on BSC (testnet/mainnet)
}

// Network configuration for contract calls
export const NETWORK_CONFIG = {
  chainId: 97,
  rpcUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8080/api/rpc-proxy'
    : process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
  explorerUrl: 'https://testnet.bscscan.com',
}

// Global gas settings - Optimized for BSC Testnet
export const GAS_SETTINGS = {
  gas: BigInt(10000000), // 10M gas limit
  gasPrice: BigInt(10000000000), // 10 gwei (BSC testnet optimized)
  maxFeePerGas: BigInt(20000000000), // 20 gwei max fee
  maxPriorityFeePerGas: BigInt(1000000000), // 1 gwei priority fee
}

// Robust network connection settings
export const NETWORK_CONNECTION_CONFIG = {
  // Multiple RPC endpoints for redundancy
  rpcUrls: [
    'https://bsc-testnet-rpc.publicnode.com',
    'https://bsc-testnet.drpc.org',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
  ],
  // Connection retry settings
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  // Timeout settings
  requestTimeout: 30000, // 30 seconds
  // Health check settings
  healthCheckInterval: 60000, // 1 minute
}
