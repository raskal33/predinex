import { useEffect, useState } from 'react'

export function useWeb3ModalSafe() {
  const [_modalOpen, _setModalOpen] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
        import('@web3modal/wagmi/react').then(({ useWeb3Modal: _useWeb3Modal }) => {
        // We'll use a global reference instead
        if ((window as any).web3modal) {
          _setModalOpen(() => (window as any).web3modal.open)
        }
      })
    }
  }, [])

  const openModal = () => {
    if (typeof window !== 'undefined' && (window as any).web3modal) {
      (window as any).web3modal.open()
    }
  }

  return { open: openModal }
} 