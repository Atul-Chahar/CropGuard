# CropGuard on Flare (Coston2)

Parametric crop insurance on Flare testnet (Coston2). Farmers buy coverage; when adverse weather is detected, payouts trigger automatically using on-chain data. Uses Flare Time Series Oracle (FTSO) for prices, Flare Data Connector (FDC) hub for attestations (stubbed into our adapter), and a WeatherOracleAdapter for demo control. Frontend is Next.js/Tailwind; contracts are Hardhat/Solidity.

> Keep in mind: if you redeploy, addresses change. Update `.env` files accordingly.

## Current deployed addresses (Coston2)
- PolicyManager: `0x4aDEea1FEa03a462720C38BAb146934cfd96F924`
- CollateralPool: `0x5Ed6CF1ADf3330F61D666D3336a2d59eeeA7E0fE`
- PayoutModule: `0xCF8B54c0D4f10a05254a007f24F099aBFEd585c7`
- WeatherOracleAdapter: `0x0Fd10bb23f3D17a149FFC0c0e7AA4eBE82eD9226`
- FdcHub (attestation): `0x48aC463d7975828989331F4De43341627b9c5f1D`
- FTSO Registry: `0x48Da21ce34966A64E267CeFb78012C0282D0Ac87`

## How the system works (high level)
1) Farmer buys a policy: pays a premium in FLR to PolicyManager; funds go to CollateralPool. Premium rule (demo): 1 FLR per $100 insured. Capacity check: premium must be at least 1% of insured amount.
2) Data flows on-chain:
   - Weather: WeatherOracleAdapter stores `location -> adverse` (set by authorized submitters or oracle script). In production this would be validated FDC proofs; here we control it for demo.
   - Price: PayoutModule queries FTSO Registry `getCurrentPriceWithDecimals` for `C2FLR` to convert USD insured amount to FLR payout.
3) Payout trigger: When weather is adverse, `checkAndPayout(policyId)` is called (via oracle loop or control panel). It checks adapter flag, marks policy paid, and asks CollateralPool to pay the farmer in FLR.
4) Stakers: Provide FLR liquidity to CollateralPool; premiums are distributed pro-rata as rewards. Payouts are paid from the pool, so stakers bear risk.

## Flare technologies used
- **FTSO**: Real-time FLR price via `getCurrentPriceWithDecimals` from the Coston2 FTSO Registry (`0x48Da...`). Used in PayoutModule to convert USD insured amount to FLR payout.
- **FDC (Flare Data Connector)**: We point to the real FdcHub (`0x48aC...`) for attestation requests. For demo, weather proof storage is simplified into WeatherOracleAdapter; replace with FDC-verified proofs in production.
- **FAssets (planned)**: Contracts include ERC20 staking/payout paths (`stakeFAsset`, `processPayoutFAsset`) but demo focuses on native FLR. Extend by wiring real FAsset addresses and UI when ready.

## On-chain components
- **PolicyManager**: Creates policies, enforces premium floor (>=1% of insured USD), stores policy data, and allows only PayoutModule to mark payout. Receives premium and forwards to CollateralPool.
- **CollateralPool** (ReentrancyGuard): Holds FLR/FAssets liquidity, tracks staker balances, distributes premiums as rewards, pays out claims. `availableLiquidity()` exposes current balance. Staking/unstaking/reward claims are non-reentrant.
- **PayoutModule**: Reads policy, checks weather via WeatherOracleAdapter, fetches FLR price from FTSO, computes payout in FLR, marks policy paid, and asks CollateralPool to pay farmer.
- **WeatherOracleAdapter**: Mapping of `location -> adverse`, supports multiple authorized submitters. For demo, used by control panel/oracle script; production should validate FDC proofs or EIP-712 signatures.

## Off-chain oracle scripts
- `scripts/oracle/weather-oracle.js`: Single run; fetches OpenWeather, requests attestation on FdcHub, writes adverse flag to adapter, optionally triggers payout (`TRIGGER_PAYOUT=true`).
- `scripts/oracle/run-loop.js`: Continuous loop (default 30s; override `ORACLE_INTERVAL_MS`). Keeps updating weather and triggering payouts if enabled.

## Frontend apps
- `/dashboard`: Farmer view to buy policies, see weather status, price, pool stats; stakers can stake/unstake/claim rewards.
- `/control`: Operator/demo panel to set weather (Normal/Adverse) and trigger payout for the latest policy; restricted to authorized submitters configured in env. Includes one-click “Set Adverse + Trigger Payout.”

## Install & setup
Prereqs: Node.js 20+, npm, MetaMask on Coston2 with test FLR.

```bash
# install deps
cd packages/contract && npm install
cd ../app && npm install

# set envs (already populated with current deploys; update if you redeploy)
# packages/contract/.env    -> PRIVATE_KEY, FDC/FTSO/Adapter/Pool/Policy/Payout, WEATHER_API_KEY, WEATHER_SUBMITTERS
# packages/app/.env.local   -> RPC, PolicyManager, CollateralPool, PayoutModule, WeatherAdapter, FTSO Registry, submitters
```

## Run the frontend
```bash
cd packages/app
npm run dev
# open http://localhost:3000 (dashboard), http://localhost:3000/control (operator)
```

### Dashboard flow (farmer/staker)
1) Connect MetaMask (Coston2). Ensure you have FLR.
2) Buy policy: enter location/crop/USD amount → premium auto-calculates (1 FLR per $100). Confirm tx.
3) View status: shows latest policy, weather (from adapter), FLR price, pool stats.
4) Stake/Unstake/Claim: enter FLR amounts to provide liquidity or withdraw; claim rewards from premiums.

### Control panel flow (operator/demo)
1) Connect with an authorized submitter wallet (listed in `NEXT_PUBLIC_ORACLE_SUBMITTERS`).
2) Set weather Normal/Adverse for a location (writes to adapter).
3) Click “Set Adverse + Trigger Payout” to update weather and immediately call `checkAndPayout` on the latest policy. Ensure pool has FLR liquidity.

## Oracle automation (optional)
- Single run: `npx hardhat run scripts/oracle/weather-oracle.js --network coston2`
- Loop (30s default): `ORACLE_INTERVAL_MS=30000 npx hardhat run scripts/oracle/run-loop.js --network coston2`
Set `TRIGGER_PAYOUT=true` in `packages/contract/.env` to allow the loop to call `checkAndPayout`.

## Demo playbook (happy path)
1) Stake FLR into CollateralPool (dashboard stake box). Confirm pool liquidity > 0.
2) Buy a policy (e.g., location “Bangalore”, $1000 insured → ~10 FLR premium). Wait for tx.
3) Go to `/control`, connect with authorized submitter, click “Set Adverse + Trigger Payout.”
4) Show dashboard: policy status changes to Paid Out; pool balance drops; staker pending rewards updated.
5) (Optional) Claim rewards to show staker yield; unstake to show exit.

## Security and constraints (be ready to answer)
- Adapter trust: WeatherOracleAdapter is currently trust-based (multi-submitters). For production, require FDC proof verification or EIP-712 signatures.
- Capacity/pricing: Demo rule enforces premium >=1% insured. For production, implement robust pricing and reserve checks vs `availableLiquidity` and dynamic FTSO pricing to prevent overexposure.
- Reentrancy: CollateralPool uses ReentrancyGuard on staking/payout/rewards/FAsset functions. Keep it.
- Liquidity risk: Payout reverts if pool lacks funds. Ensure pool is funded before triggering payouts.
- Multiple redeploys: Always refresh `.env` addresses after redeploy to avoid calling stale contracts.

## FAQ (judge-facing)
- **Where do prices come from?** Flare FTSO registry `getCurrentPriceWithDecimals(C2FLR)` on Coston2.
- **Where does weather come from?** For demo, authorized submitters/oracle script write to WeatherOracleAdapter; target is FDC-proofed weather (adapter to be upgraded).
- **How are stakers rewarded?** Premiums flow into CollateralPool and are distributed pro-rata via `accRewardPerShare`; stakers can claim anytime.
- **How do payouts work?** Operator/oracle sets adverse; PayoutModule checks adapter, converts insured USD (cents) to FLR via FTSO price, marks policy paid, and pulls funds from CollateralPool to farmer.
- **What stops selling too much coverage?** Premium floor (>=1%) now; recommended next step: enforce max coverage vs `availableLiquidity` and dynamic pricing.

## If you redeploy
After `npx hardhat run scripts/deploy-modules.js --network coston2`, update:
- `packages/contract/.env`: POLICY_MANAGER_ADDRESS, COLLATERAL_POOL_ADDRESS, PAYOUT_MODULE_ADDRESS, WEATHER_ADAPTER_ADDRESS, WEATHER_SUBMITTERS.
- `packages/app/.env.local`: NEXT_PUBLIC_* addresses above. Restart `npm run dev`.

