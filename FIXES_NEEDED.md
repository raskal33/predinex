# Critical Fixes Needed

## 1. Biconomy Single-TX Not Working ❌
**Problem**: Pool creation with PRIX is doing separate approve + execute transactions instead of batching them.

**Root Cause**: `useContractInteractions.ts` is calling `approve()` then `writeContractAsync()` separately instead of using Biconomy's `executeApproveAndExecute()`.

**Solution**: 
- Use `biconomyService.executeApproveAndExecute()` for PRIX pool creation
- Combine approve + createPool in single signature
- Only fall back to separate transactions if Biconomy not available

## 2. Bet Placement RPC Error ❌
**Problem**: Trying to approve 5000 PRIX when bet amount is much less, causing RPC error.

**Error Log**:
```
approve(address spender, uint256 value)
args: (0x735DE180558679E6132F51e410387A8f7d10c07E, 5000000000000000000000)
```

**Root Cause**: `usePools.ts` `approvePRIX()` is approving a hardcoded or incorrect amount instead of the actual bet amount.

**Solution**:
- Fix `approvePRIX()` to approve exact `betAmount` passed
- Use Biconomy batch for approve + placeBet
- Add proper error handling for RPC failures

## 3. getPool() Position Out of Bounds ❌
**Problem**: Contract read failing with "Position out of bounds" error.

**Error Log**:
```
Failed to fetch pool state for pool 4: ContractFunctionExecutionError: 
Position `3.047713452654047e+76` is out of bounds (`0 < position < 896`).
```

**Root Cause**: ABI decoding issue - likely the Pool struct in frontend doesn't match contract.

**Solution**:
- Verify Pool struct in frontend ABI matches diamond contract
- Check if using correct facet (PoolViewFacet vs PoolCoreFacet)
- May need to regenerate ABI from latest contract

## 4. Direct Contract Calls for Betting ✅
**Problem**: Need to use direct contract calls for betting (not through complex hooks).

**Solution**: Already implemented in `usePools.ts` with `placeBetDirect()` - just need to fix approval amount.

