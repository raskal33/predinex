# Comprehensive Fix Plan

## Issue Summary
1. ✅ **Biconomy single-tx not working** - Separate approve + execute transactions
2. ⚠️ **Bet placement RPC error** - Network/RPC issue, not amount issue  
3. ❌ **getPool() position out of bounds** - ABI struct mismatch
4. ✅ **Direct contract calls** - Already implemented

## Root Causes Identified

### 1. Biconomy Not Used
- `useContractInteractions.ts` has manual approve + execute flow
- `biconomyService.ts` has `executeApproveAndExecute()` but it's not being used
- Need to integrate Biconomy batch transactions

### 2. RPC Error is Network Issue
- The approval amount (5000 PRIX) is correct - it's a quick bet button amount
- Error: "RPC endpoint returned HTTP client error"
- This is a BSC Testnet RPC reliability issue, not a code issue
- **Solution**: Add retry logic and fallback RPC endpoints

### 3. Pool Struct Mismatch
Contract Pool struct (from LibAppStorage.sol):
```solidity
struct Pool {
    address creator;           // 20 bytes
    uint16 odds;              // 2 bytes
    uint8 flags;              // 1 byte
    OracleType oracleType;    // 1 byte (enum)
    MarketType marketType;    // 1 byte (enum)
    uint8 leverage;           // 1 byte
    uint256 creatorStake;     // 32 bytes
    uint256 totalCreatorSideStake;
    uint256 maxBettorStake;
    uint256 totalBettorStake;
    bytes32 predictedOutcome;
    bytes32 result;
    uint256 eventStartTime;
    uint256 eventEndTime;
    uint256 bettingEndTime;
    uint256 resultTimestamp;
    uint256 arbitrationDeadline;
    uint256 maxBetPerUser;
    uint256 stakeTimestamp;
    bytes32 league;
    bytes32 category;
    bytes32 homeTeam;
    bytes32 awayTeam;
    bytes32 title;
    string marketId;          // Dynamic bytes
}
```

Frontend needs to match this EXACTLY in the ABI.

## Implementation Plan

### Step 1: Fix RPC Reliability ⚡
Add retry logic and fallback RPCs in `lib/network-connection.ts`:
- Retry failed transactions 3 times
- Use multiple RPC endpoints
- Better error messages

### Step 2: Integrate Biconomy for Pool Creation 🚀
Update `useContractInteractions.ts`:
- Check if Biconomy is available
- Use `biconomyService.executeApproveAndExecute()` for PRIX pools
- Fall back to manual approve + execute if Biconomy unavailable
- Single signature for better UX

### Step 3: Fix Pool ABI Struct 🔧
Update `contracts/index.ts`:
- Regenerate ABI from latest diamond contract
- Ensure Pool struct matches LibAppStorage.sol
- Test getPool() calls

### Step 4: Add Biconomy for Betting 🎯
Update `usePools.ts`:
- Use Biconomy batch for approve + placeBet
- Single signature for PRIX bets
- Better UX, fewer transactions

## Priority Order
1. **HIGH**: Fix RPC reliability (affects all transactions)
2. **HIGH**: Fix Pool ABI (breaks pool display)
3. **MEDIUM**: Integrate Biconomy for pool creation
4. **MEDIUM**: Integrate Biconomy for betting

## Testing Checklist
- [ ] Create BNB pool (no approval needed)
- [ ] Create PRIX pool with Biconomy (single signature)
- [ ] Create PRIX pool without Biconomy (fallback)
- [ ] Place BNB bet
- [ ] Place PRIX bet with Biconomy
- [ ] Place PRIX bet without Biconomy
- [ ] Verify getPool() returns correct data
- [ ] Test with poor RPC connection (retry logic)

