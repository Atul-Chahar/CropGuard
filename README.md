# CropGuard (Flare Coston2)

Parametric crop insurance dapp on Flare Coston2. Frontend is Next.js/Tailwind; smart contracts are Hardhat. Weather status is written on-chain through a WeatherOracleAdapter, and payouts use FTSO price feeds.

## Current deployed addresses (Coston2)
- PolicyManager: `0x4aDEea1FEa03a462720C38BAb146934cfd96F924`
- CollateralPool: `0x5Ed6CF1ADf3330F61D666D3336a2d59eeeA7E0fE`
- PayoutModule: `0xCF8B54c0D4f10a05254a007f24F099aBFEd585c7`
- WeatherOracleAdapter: `0x0Fd10bb23f3D17a149FFC0c0e7AA4eBE82eD9226`
- FdcHub (attestation): `0x48aC463d7975828989331F4De43341627b9c5f1D`
- FTSO Registry: `0x48Da21ce34966A64E267CeFb78012C0282D0Ac87`

## Prerequisites
- Node.js 20+ and npm installed.
- MetaMask on Coston2 with some test FLR (for gas and the 10 FLR premium when buying a policy).

## Install dependencies
```bash
# from repo root
cd packages/contract && npm install
cd ../app && npm install
```

## Environment files (already filled with current deploys)
- `packages/contract/.env` holds deploy/oracle settings (private key, hubs, adapters, policy addresses, API key).
- `packages/app/.env.local` holds frontend RPC and contract addresses.
If you redeploy, update these files with the new addresses you get from the deploy script.

## Run the frontend (dashboard)
```bash
cd packages/app
npm run dev
```
Open http://localhost:3000 and click “Get Protected” to reach the dashboard. Connect MetaMask (Coston2).

### Using the dashboard (simple steps)
1) Connect your wallet (needs test FLR on Coston2).  
2) Enter farm location, crop type, and insured amount in USD. Premium is fixed at 10 FLR in the UI.  
3) Click “Purchase Coverage” and confirm in MetaMask.  
4) After confirmation, the dashboard shows the latest policy, weather status (from on-chain adapter), and live FLR price.  
5) When the oracle reports bad weather, the policy can be paid out automatically; the dashboard status updates when that happens.

## Run the oracle script (writes weather on-chain and can trigger payouts)
```bash
cd packages/contract
npx hardhat run scripts/oracle/weather-oracle.js --network coston2
```
What it does: for each active policy, fetches OpenWeather data, requests an attestation on FdcHub, stores the result in WeatherOracleAdapter, and if adverse weather is detected, calls `checkAndPayout` on PayoutModule.

### Run the oracle in a loop (automation)
```bash
cd packages/contract
# every 5 minutes by default; override with ORACLE_INTERVAL_MS in milliseconds
npx hardhat run scripts/oracle/run-loop.js --network coston2
```
This keeps running the oracle cycle continuously so users don’t need to run it manually.

## Staking / Liquidity (collateral providers)
- Staking is handled by `CollateralPool` and surfaced in the dashboard.
- Rule (demo): premium is 1 FLR per $100 insured, and premiums are distributed to stakers pro-rata.
- Stake FLR: enter an amount and click “Stake” (gas + amount in FLR).
- Unstake FLR: enter an amount and click “Unstake”.
- Claim rewards: click “Claim Rewards” to withdraw accumulated premiums.

## Demo control panel (set weather / trigger payout)
- Visit `/control` in the app (http://localhost:3000/control).
- Connect with the oracle submitter wallet (env: `NEXT_PUBLIC_ORACLE_SUBMITTER_ADDRESS`).
- Set a location to Normal/Adverse (writes to WeatherOracleAdapter).
- Optionally trigger payout for the latest policy via the button (calls `checkAndPayout`).

## Notes
- WeatherOracleAdapter is a temporary store for weather status; when FDC proof verification is integrated, replace the direct write with proof-based verification.
- Payout math uses insured amount as USD cents and FTSO price via `getCurrentPriceWithDecimals`.
