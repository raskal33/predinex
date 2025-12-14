# Biconomy Features Available for Predinex

## Overview

Biconomy's Account Abstraction (AA) infrastructure provides multiple features beyond basic single-signature approve+execute. Here's what we can utilize:

---

## 1. ✅ Single Signature Approve + Execute (Implemented)

**What it does**: Combines ERC20 token approval and contract execution in one user signature.

**Benefits**:
- Better UX: One signature instead of two separate transactions
- Faster: No waiting between approve and execute
- Gas efficient: Batched into one meta-transaction

**Implemented for**:
- ✅ Gaunlet: `placeSlipWithToken` (when using tokens)
- ✅ H2H: `createChallengeWithToken`, `placeBidWithToken`
- ✅ Prediction Market: `createPoolWithToken`, `createBoostedPoolWithToken`

---

## 2. 🚀 Gasless Transactions (Recommended)

**What it does**: Users don't pay gas fees; the dapp sponsors them.

**Benefits**:
- Remove gas fee barrier for new users
- Better onboarding experience
- Users don't need native tokens (BNB) to interact
- Can be limited by rules (e.g., only for small transactions)

**How to implement**:
```typescript
// Enable gas sponsorship in Biconomy config
const config: BiconomyConfig = {
  apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
  sponsorGas: true, // Enable gas sponsorship
};

// Use in hooks
const { executeApproveAndExecute } = useBiconomy(config);

// Transactions will now be gasless (if you have paymaster configured)
```

**Setup requirements**:
1. Configure Paymaster in Biconomy dashboard
2. Fund your paymaster contract with gas tokens (BNB)
3. Set spending limits and rules

**Use cases for Predinex**:
- First-time user bonus: Sponsor first 3 transactions
- Small predictions: Sponsor predictions < $10
- Onboarding: Sponsor profile creation, first pool join

---

## 3. 📦 Transaction Batching (Recommended)

**What it does**: Execute multiple contract calls in a single transaction.

**Benefits**:
- Atomic execution: All succeed or all fail
- Gas savings: One transaction instead of multiple
- Better UX: One signature for complex operations

**How to implement**:
```typescript
const { buildComposable, executeBatch } = useBiconomy(config);

// Build multiple instructions
const instruction1 = await buildComposable({
  to: CONTRACTS.PRIX_TOKEN.address,
  abi: CONTRACTS.PRIX_TOKEN.abi,
  functionName: 'approve',
  args: [CONTRACTS.H2H.address, parseEther('100')],
});

const instruction2 = await buildComposable({
  to: CONTRACTS.H2H.address,
  abi: CONTRACTS.H2H.abi,
  functionName: 'createChallenge',
  args: [matchId, outcome, minBid, eventTime, currency],
});

const instruction3 = await buildComposable({
  to: CONTRACTS.H2H.address,
  abi: CONTRACTS.H2H.abi,
  functionName: 'placeBid',
  args: [challengeId, currency],
  value: bidAmount,
});

// Execute all in one transaction
const { hash } = await executeBatch([instruction1, instruction2, instruction3]);
```

**Use cases for Predinex**:
- Create pool + place first prediction
- Approve token + create multiple challenges
- Claim rewards from multiple pools at once
- Update profile + create pool

---

## 4. 🎯 Session Keys (Advanced)

**What it does**: Pre-authorize specific actions without requiring signatures each time.

**Benefits**:
- Gaming-like UX: No signature for every action
- Time-limited permissions (e.g., 24 hours)
- Scope-limited (e.g., only predictions < $10)

**How to implement**:
```typescript
// Create a session key
const sessionKey = await createSessionKey({
  validUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  limits: {
    maxAmountPerTx: parseEther('10'), // Max $10 per transaction
    maxTransactionsPerDay: 20,
  },
  allowedContracts: [CONTRACTS.GAUNLET.address, CONTRACTS.H2H.address],
});

// Use session key for transactions
const tx = await executeWithSessionKey({
  sessionKey,
  instruction: await buildComposable({...}),
});
```

**Use cases for Predinex**:
- Active trader mode: Pre-authorize 24h of predictions < $10
- Tournament mode: Pre-authorize all tournament actions
- Bot trading: Pre-authorize automated predictions

---

## 5. 💰 Multi-Asset Gas Payment

**What it does**: Pay gas fees with ERC20 tokens instead of native BNB.

**Benefits**:
- Users can pay gas with PRIX tokens
- Simplifies onboarding (don't need BNB)
- Better token utility for PRIX

**How to implement**:
```typescript
// Pay gas with PRIX tokens
const { hash } = await executeApproveAndExecute({
  tokenAddress: PRIX_TOKEN_ADDRESS,
  spender: CONTRACTS.GAUNLET.address,
  approveAmount: parseEther('100'),
  executeInstruction: instruction,
  feeToken: {
    address: PRIX_TOKEN_ADDRESS, // Pay gas with PRIX
    chainId: 97, // BSC Testnet
  },
});
```

**Use cases for Predinex**:
- PRIX holders pay gas with PRIX
- Stakers get gas fee discounts
- VIP users pay no gas (we cover it)

---

## 6. 🔒 Social Recovery (Advanced)

**What it does**: Recover wallet access through trusted guardians.

**Benefits**:
- No seed phrases to lose
- Recover through email, phone, or trusted contacts
- Better security for mainstream users

**Use cases for Predinex**:
- Onboard non-crypto users
- Provide recovery option for all users
- Reduce support burden for lost wallets

---

## 7. 📱 Cross-Chain Operations (Future)

**What it does**: Execute transactions across multiple chains in one signature.

**Benefits**:
- Cross-chain predictions
- Multi-chain liquidity
- Unified user experience

**Use cases for Predinex**:
- Predict on BSC, claim on Ethereum
- Cross-chain tournaments
- Multi-chain leaderboards

---

## Recommended Implementation Priority

### Phase 1: Immediate (Current)
- ✅ Single signature approve + execute (Implemented)

### Phase 2: High Priority
- 🚀 **Gasless transactions** - Best for onboarding
- 📦 **Transaction batching** - Multiple actions in one tx

### Phase 3: Medium Priority
- 💰 **Multi-asset gas payment** - Pay gas with PRIX
- 🎯 **Session keys** - For active traders

### Phase 4: Future
- 🔒 **Social recovery** - For mainstream adoption
- 📱 **Cross-chain operations** - When expanding chains

---

## Implementation Examples

### Gasless First-Time User Experience
```typescript
// Sponsor first 3 transactions for new users
const { biconomyReady, accountAddress } = useBiconomy({
  apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
  sponsorGas: true, // Enable for new users
});

// Check if user is new (< 3 transactions)
const txCount = await getUserTransactionCount(accountAddress);
const shouldSponsorGas = txCount < 3;
```

### Batch Create + Predict
```typescript
// Create pool and place first prediction in one tx
const createInstruction = await buildComposable({
  to: CONTRACTS.POOL_CORE.address,
  abi: CONTRACTS.POOL_CORE.abi,
  functionName: 'createPool',
  args: [matchId, predictionType, creatorStake],
});

const predictInstruction = await buildComposable({
  to: poolAddress,
  abi: CONTRACTS.POOL.abi,
  functionName: 'placePrediction',
  args: [outcome],
  value: predictionAmount,
});

const { hash } = await executeBatch([createInstruction, predictInstruction]);
```

### Pay Gas with PRIX
```typescript
// User pays gas with PRIX tokens instead of BNB
const { hash } = await executeApproveAndExecute({
  tokenAddress: CONTRACTS.PRIX_TOKEN.address,
  spender: CONTRACTS.GAUNLET.address,
  approveAmount: parseEther('100'),
  executeInstruction: instruction,
  feeToken: {
    address: CONTRACTS.PRIX_TOKEN.address,
    chainId: 97,
  },
});
```

---

## Gas Cost Comparison

| Action | Without Biconomy | With Biconomy | Savings |
|--------|------------------|---------------|---------|
| Approve + Execute | 2 tx (~80k gas) | 1 tx (~50k gas) | ~37% |
| 3 Actions | 3 tx (~120k gas) | 1 tx (~70k gas) | ~42% |
| Gasless | User pays full gas | $0 for user | 100% |

---

## Security Considerations

### API Key Security
- ✅ Safe to expose client-side with domain restrictions
- Set rate limits in dashboard
- Monitor usage regularly

### Session Keys
- Set appropriate time limits (24h recommended)
- Set transaction amount limits
- Restrict to specific contracts

### Gas Sponsorship
- Set spending limits per user
- Implement rate limiting
- Monitor for abuse

---

## Next Steps

1. **Enable Gasless Transactions**:
   - Configure Paymaster in Biconomy dashboard
   - Fund paymaster with BNB
   - Sponsor first 3 transactions for new users

2. **Implement Transaction Batching**:
   - Create pool + predict in one tx
   - Claim multiple rewards in one tx
   - Update profile + create pool in one tx

3. **Multi-Asset Gas Payment**:
   - Allow PRIX holders to pay gas with PRIX
   - Offer discounts for stakers
   - Implement tiered gas fees

4. **Session Keys** (Future):
   - Active trader mode
   - Tournament mode
   - Bot trading

---

## Resources

- [Biconomy Documentation](https://docs.biconomy.io/)
- [Account Abstraction Guide](https://docs.biconomy.io/account-abstraction)
- [Gasless Transactions](https://docs.biconomy.io/gasless)
- [Biconomy Dashboard](https://dashboard.biconomy.io/)

