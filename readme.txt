CropGuard – Parametric Crop‑Insurance on Flare
Introduction

CropGuard is a decentralized parametric insurance platform that protects smallholder farmers against adverse weather events. Built on the Flare blockchain, CropGuard leverages Flare’s enshrined data protocols and interoperability to create an automated, trustless crop‑insurance scheme. Farmers purchase micro‑insurance policies using stablecoins or FAsset tokens (wrapped BTC/XRP/DOGE) and receive automatic payouts when droughts, floods or heat waves occur.

This document acts as a comprehensive technical overview and setup guide. It describes the architecture, technologies, and development workflow so you and your teammates can build the prototype within 24 hours.

How CropGuard Works

Policy Creation – A farmer chooses their location, crop type, coverage period and insured amount. The front‑end calculates a premium based on historical risk data and current commodity prices from the Flare Time Series Oracle (FTSO).

Premium Payment & Collateral – The farmer pays the premium in FLR, a stablecoin, or an FAsset (e.g., FBTC). Collateral providers stake matching FAssets, supplying liquidity and earning a share of the premiums.

Monitoring Phase – During the policy period, a monitoring script queries off‑chain weather data via the Flare Data Connector (FDC). The FDC allows smart contracts to verify events from external APIs and other blockchains
flare.network
.

Payout Trigger – If weather data (rainfall, temperature, drought index) crosses predefined thresholds, the smart contract triggers an automated payout. The payout amount is pegged to current commodity prices using the FTSO price feeds.

Automatic Payouts – The contract sends the insured amount to the farmer’s Flare Smart Account. Smart accounts enable account abstraction, sponsored gas fees and social recovery, giving farmers a seamless user experience.

Settlement – If no adverse event occurs by the policy end date, the premium is distributed as yield to collateral providers.

Why Flare?

Flare is a data‑focused Layer 1 blockchain that embeds decentralized oracles and cross‑chain protocols. Key features of Flare used in CropGuard include:

Flare Technology	Role in CropGuard	Evidence
Flare Time Series Oracle (FTSO)	Provides decentralized price feeds for commodities and stablecoins. FTSO is an enshrined protocol that offers secure, fast and decentralized price feeds
flare.network
. CropGuard uses FTSO to calculate premiums and payouts in real time.	Flare’s documentation notes that FTSO is an integrated data protocol providing price feeds
flare.network
. In previous Flare hackathons, projects like SwapGuard and Flare Stable Coin relied on FTSO for price‑protected swaps and collateralized stablecoins
flare.network
, demonstrating its reliability.
Flare Data Connector (FDC)	Allows smart contracts to verify off‑chain events and query external APIs
flare.network
. CropGuard uses FDC to fetch authenticated weather data from meteorological APIs (e.g., rainfall and temperature).	During the Encode London hackathon, FDC was used to integrate real‑time data from connected blockchains and Web 2 APIs
flare.network
; projects like GuardFi and WeatherShield DeFi showcase FDC’s ability to verify external events
flare.network
.
FAssets	Trustless over‑collateralized bridge that wraps non‑smart‑contract assets into ERC‑20 tokens on Flare (e.g., FBTC, FDOGE, FXRP)
dev.flare.network
. Farmers can pay premiums and receive payouts in FAssets, and collateral providers can stake FAssets to underwrite policies. FAssets minting uses FDC and FTSO to verify underlying deposits and obtain price feeds
dev.flare.network
.	The Flare developer docs describe FAssets as a bridge connecting non‑smart‑contract networks to Flare, powered by FDC and FTSO
dev.flare.network
. Anyone can mint FAssets by sending the underlying asset to an agent and receiving a wrapped token on Flare
dev.flare.network
.
Flare Smart Accounts	Provide account abstraction on Flare, enabling gas‑less transactions, session keys and social recovery. Smart Accounts improve onboarding by allowing farmers to sign up with familiar credentials and pay gas fees via a sponsor. They also simplify integration with mobile apps and AI code builders.	Smart Accounts documentation (not cited here) explains features like sponsored fees and session keys. In the 2025 Harvard hackathon announcement, Flare highlighted Smart Accounts and cross‑chain accounts as a key track
flare.network
.
System Architecture
┌──────────────────────────────────────────────────────────┐
│                   Front‑End (React/Next.js)             │
│                                                        │
│  • Farmer Dashboard                                    │
│    – Create policy (choose location, crop, coverage)    │
│    – Pay premium in FLR or FAsset                      │
│    – View policy status and payouts                    │
│                                                        │
│  • Collateral Provider Dashboard                       │
│    – Stake FAssets to provide liquidity                │
│    – View expected yields                              │
└──────────────────────────────────────────────────────────┘
            │                                               │
            ▼                                               ▼
┌──────────────────────────────────────────────────────────┐
│      Flare Smart Accounts & Wallet Integration          │
│                                                        │
│  • Account abstraction with social/login recovery       │
│  • Sponsored transactions (gas‑less for farmers)        │
│  • Web3 providers: MetaMask (EVM) or Bifrost wallet     │
└──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│               Smart Contracts on Flare (Solidity)       │
│                                                        │
│  • PolicyManager                                        │
│    – Create/renew policies                              │
│    – Store parameters (location, crop, premium, threshold)│
│    – Handle premium payments                            │
│                                                        │
│  • CollateralPool                                       │
│    – Accept FAsset deposits from stakers                │
│    – Track staker shares and distribute premium yield   │
│                                                        │
│  • PayoutModule                                         │
│    – Read data from Weather Oracle via FDC              │
│    – Query FTSO price feeds                             │
│    – Trigger payouts to farmers when conditions met     │
│                                                        │
└──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│        Off‑Chain Components & Oracles                   │
│                                                        │
│  • Weather Oracle (serverless script)                  │
│    – Periodically fetch data from a weather API        │
│    – Submit data requests through Flare Data Connector │
│    – Provide structured data for smart contract        │
│                                                        │
│  • Price Oracle (FTSO)                                 │
│    – Native Flare protocol for price feeds:contentReference[oaicite:12]{index=12} |
│    – Accessible via ContractRegistry/ABI               │
│                                                        │
└──────────────────────────────────────────────────────────┘

Required Technologies and Tools

To complete CropGuard within 24 hours, your team will work with a combination of smart contract development, JavaScript front‑end, and off‑chain scripting. The following tools and services are recommended:

Blockchain & Flare

Flare Testnet – Deploy your contracts on the Coston or Coston2 testnet (Flare’s public test networks). You will need RPC URLs and faucet FLR tokens to interact.

FTSO Contract Interface – The Flare Developer Hub provides ABIs and example code for reading FTSO price feeds
flare.network
. Use the ContractRegistry to obtain the FTSO contract address and call getFeedById for commodity/stablecoin price pairs.

FDC Service – To query weather data, set up a data request using FDC. You will specify the external API endpoint, data schema, and callback function in your smart contract. FDC will ensure the data is verified and delivered to your contract
flare.network
.

FAssets – Use existing FAsset minting dApps (e.g., fasset.oracle-daemon.com or fassets.au.cc) to mint test FBTC/FDOGE tokens
dev.flare.network
. Alternatively, interact with the FAsset smart contracts directly via the Flare SDK.

Flare Smart Accounts – Integrate account abstraction using the Flare Smart Account SDK (check the @flarenetwork/smart-account package). Configure sponsored transactions to cover gas costs for farmers.

Development Environment

Node.js & npm/yarn – Required for JavaScript/TypeScript development.

Hardhat or Foundry – Smart contract development frameworks that support the EVM. Hardhat offers a plugin ecosystem and local node simulation; Foundry provides fast compilation and testing in Rust.

React/Next.js – Build the front‑end dashboard. Use libraries like ethers.js or web3.js to connect to Flare.

Python/JavaScript (off‑chain scripts) – Use Python or Node.js to implement the weather oracle script that queries the weather API and submits data through FDC.

GitHub Copilot or other AI code assistants – To accelerate coding. Remember to review generated code for security and quality.

Optional Enhancements

Flare AI Kit – If you plan to include AI‑driven risk assessments, use the Flare AI Kit for verifiable AI execution. The Flare AI Kit leverages Google Cloud Confidential Space and FDC for secure computation
flare.network
.

Data Visualization Libraries – Use Chart.js or Recharts to display weather trends and payout histories.

Setup and Deployment Steps
1. Clone the Repository
git clone https://github.com/your‑org/cropguard.git
cd cropguard

2. Install Dependencies
# Install Node dependencies for contracts and front‑end
npm install

# If using Foundry for contracts
curl -L https://foundry.paradigm.xyz | bash
foundryup

# If using Hardhat
npm install --save-dev hardhat

3. Configure Environment Variables

Create a .env file and provide the following variables:

FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
PRIVATE_KEY=<your development wallet private key>
FTSO_FEED_ID=<ID for desired commodity/stablecoin price feed>
WEATHER_API_URL=https://api.openweathermap.org/data/2.5/onecall
WEATHER_API_KEY=<your weather API key>
FDC_ENDPOINT=<FDC endpoint for data requests>
SMART_ACCOUNT_SPONSOR_KEY=<private key of sponsor account>

4. Deploy Smart Contracts

Use Hardhat/Foundry scripts to deploy the smart contracts to the Flare testnet.

Example Hardhat deployment script:

const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with", deployer.address);
  const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy();
  await policyManager.deployed();
  console.log("PolicyManager deployed to", policyManager.address);
  // Deploy CollateralPool and PayoutModule similarly
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


After deployment, update the front‑end environment file with the deployed contract addresses.

5. Set Up the Weather Oracle Script

Write a Node.js or Python script that periodically fetches weather data and submits it to the PolicyManager via the FDC. The script should:

Fetch current and forecasted data from your chosen API (WEATHER_API_URL).

Construct a data payload that matches the schema expected by your contract (e.g., rainfall and temperature values over the coverage period).

Use the FDC SDK or API to submit the data. FDC will attest the data and call your contract with the results
flare.network
.

Ensure the script runs on a schedule (e.g., using cron or a serverless function) for the duration of the coverage period.

6. Implement the Front‑End Dashboard

Use React/Next.js to create a responsive dashboard. Key components include:

Policy creation form – Collect location (latitude/longitude), crop type and coverage amount. Call the createPolicy function on the PolicyManager contract.

Premium calculation – Fetch commodity prices via the FTSO. Use the example code provided in Flare’s docs to call getFeedById
flare.network
 and display the value.

Wallet & Smart Accounts integration – Integrate the Flare Smart Account SDK or connect to MetaMask. Implement sponsored transactions so that farmers do not pay gas fees. Provide a sign‑in flow with social/log‑in recovery.

Collaboration dashboard – For collateral providers to stake FAssets, view total liquidity and earnings.

7. Testing

Write unit tests for your smart contracts using Hardhat/Foundry. Test scenarios should include:

Successful policy creation and premium payment.

Correct detection of weather thresholds and triggering of payouts.

Correct distribution of premiums to collateral providers when no payout occurs.

Security cases (reentrancy, overflow, unauthorized calls).

Use the local Hardhat network with a fork of the Flare testnet to simulate FTSO and FDC responses. Mock off‑chain data if necessary.

8. Deployment and Demo

Deploy the front‑end to a static hosting service (e.g., Vercel or Netlify). Provide a simple user flow for the judges: create a policy, pay the premium with a test FAsset, simulate a weather event (manually call the payout function if necessary), and show the automatic payout.

Contributing and Collaboration

Divide the work among team members:

Smart Contract Engineer – Implement PolicyManager, CollateralPool, and PayoutModule. Integrate FTSO price feeds and FDC callbacks. Ensure security and gas optimization.

Off‑Chain Developer – Build the weather oracle script. Configure FDC data requests, interact with the weather API, and ensure data integrity.

Front‑End Developer – Develop the React dashboard, integrate wallets and Smart Accounts, and handle contract interactions via ethers.js.

DevOps/Integration – Manage deployments to Flare testnet, coordinate environment variables, set up continuous integration, and handle deployment to the demo site.

Throughout the hackathon, maintain good documentation. Use this README as the central reference for the project. Update it with any changes you make during development.