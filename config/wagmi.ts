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
    url: typeof window !== 'undefined' ? window.location.origin : 'https://prixedict.vercel.app',
    icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://prixedict.vercel.app/logo.png'],
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

// Contract addresses for smart contract integration - BSC TESTNET DEPLOYMENT
export const CONTRACT_ADDRESSES = {
  // Core Contracts (BSC TESTNET)
  PRIX_TOKEN: (process.env.NEXT_PUBLIC_PRIX_TOKEN_ADDRESS || '0x0892AC037225CABBd6e499c5cA6AeA7f5fca60bb') as `0x${string}`,
  POOL_CORE: (process.env.NEXT_PUBLIC_POOL_CORE_ADDRESS || '0x8240BCeFd8965AD1543dB073F6Bf60ABf34DB743') as `0x${string}`,
  BOOST_SYSTEM: (process.env.NEXT_PUBLIC_BOOST_SYSTEM_ADDRESS || '0x9CB57EfBC26F559348eb0ca6A389EBa8784f62C4') as `0x${string}`,
  COMBO_POOLS: (process.env.NEXT_PUBLIC_COMBO_POOLS_ADDRESS || '0x4d1313F0FcFB75B982Ae857570CCEf159A71719A') as `0x${string}`,
  FACTORY: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xCBA34A05BD12D840e49601cFc9dD1266619Ec9E0') as `0x${string}`,
  
  // Oracle Contracts
  GUIDED_ORACLE: (process.env.NEXT_PUBLIC_GUIDED_ORACLE_ADDRESS || '0x602914c266AB6982B497d26d9E96bF9D96ae2441') as `0x${string}`,
  OPTIMISTIC_ORACLE: (process.env.NEXT_PUBLIC_OPTIMISTIC_ORACLE_ADDRESS || '0xe2c8e75d603C0500F8Ed4E62454185AbA8fe2bC1') as `0x${string}`,
  
  // System Contracts
  REPUTATION_SYSTEM: (process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS || '0x31AfDC3978317a1de606e76037429F3e456015C6') as `0x${string}`,
  STAKING_CONTRACT: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || '0x39a72b531330738f49AA2Aa6A534B967e21A5AFB') as `0x${string}`,
  FAUCET: (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '0xD7962056072A61F3eF6407e4c91A85d3cA75e02C') as `0x${string}`,
  ODDYSSEY: (process.env.NEXT_PUBLIC_ODDYSSEY_ADDRESS || '0x90C34114f1Dd6Ebf34a11F9Dd8f9306d3E1cE8c8') as `0x${string}`,
  
  // Legacy support (for backward compatibility) - UPDATED TO BSC TESTNET ADDRESSES
  PRIXEDICT_POOL: (process.env.NEXT_PUBLIC_PRIXEDICT_POOL_ADDRESS || '0x8240BCeFd8965AD1543dB073F6Bf60ABf34DB743') as `0x${string}`,
  PRIXEDICT_STAKING: (process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || '0x39a72b531330738f49AA2Aa6A534B967e21A5AFB') as `0x${string}`,
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
