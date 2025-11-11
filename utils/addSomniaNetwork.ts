export const BSC_TESTNET_NETWORK = {
  chainId: '0x61', // 97 in hex
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-testnet-rpc.publicnode.com', 'https://bsc-testnet.drpc.org'],
  blockExplorerUrls: ['https://testnet.bscscan.com'],
}

export async function addBSCNetwork() {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      // Try to switch to the network first
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_NETWORK.chainId }],
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_NETWORK],
          })
        } catch (addError) {
          console.error('Failed to add BSC Testnet network:', addError)
          throw addError
        }
      } else {
        console.error('Failed to switch to BSC Testnet network:', switchError)
        throw switchError
      }
    }
  } else {
    throw new Error('MetaMask is not installed')
  }
}

export function getBSCNetworkConfig() {
  return BSC_TESTNET_NETWORK
}

// Legacy export for backward compatibility
export const addSomniaNetwork = addBSCNetwork
export const getSomniaNetworkConfig = getBSCNetworkConfig 