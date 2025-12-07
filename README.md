# CropGuard 🌾🛡️

**Decentralized, Automated Parametric Crop Insurance on the Flare Network.**

> **Live Demo:** [https://crop-guard-jade.vercel.app/](https://crop-guard-jade.vercel.app/)  
> **Repository:** [https://github.com/Atul-Chahar/CropGuard](https://github.com/Atul-Chahar/CropGuard)

CropGuard solves the inefficiency of traditional agriculture insurance by automating the entire lifecycle—from policy purchase to weather verification and payout—using the Flare Blockchain.

---

## 🏗️ Technology Stack (Where we use Flare)

We leverage Flare's enshrined protocols to build a system that is both **trustless** and **economically sound**.

| Technology | Implementation in Project | Why it matters? |
| :--- | :--- | :--- |
| **FTSO** (Flare Time Series Oracle) | **`PayoutModule.sol`**: Calls `getCurrentPriceWithDecimals("C2FLR")`. | Ensures payouts are pegged to real-world **USD value**, unaffected by FLR price volatility. |
| **FDC** (Flare Data Connector) | **`WeatherOracleAdapter.sol`**: Receives off-chain attestation data. | Allows the blockchain to verify "Did it rain?" without trusting a central server. |
| **Smart Contracts** | **`CollateralPool.sol`** & **`PolicyManager.sol`** | Automated logic for risk management, premiums, and liquidations. |
| **Next.js & Tailwind** | **`packages/app`** | A modern, high-performance UI for farmers to interact with the blockchain. |

---

## ⚙️ How It Works: The "Set It and Forget It" System

CropGuard is designed for **100% Automation** and **Reliability**.

### 1. Farmer Buys Policy 🚜
*   Farmer selects **Crop** (e.g., Wheat) and **Location**.
*   Pays a Premium in FLR (e.g., 10 FLR).
*   **Reliability:** The premium is instantly locked in the `CollateralPool`.

### 2. "The Sentinel" Monitors Weather ⛈️
*   Our **Off-Chain Oracle** (`scripts/oracle/weather-oracle.js`) runs continuously.
*   It checks OpenWeatherMap data against the policy's location.
*   **Automation:** If Adverse Weather (Drought/Flood) is detected, the script *automatically* submits a transaction to the blockchain. No human claim filing needed.

### 3. Instant Payout 💸
*   **`PayoutModule`** receives the weather trigger.
*   It queries **FTSO** for the current FLR price.
*   It calculates the payout: `(Insured USD Amount / FLR Price)`.
*   Funds are sent directly to the farmer.

---

## 💰 The Liquidity Model: How Investors Earn

We built a **Shared Risk/Reward Protocol** so the community can enable this insurance.

### For Liquidity Providers (Investors)
1.  **Stake:** Anyone can deposit FLR into the `CollateralPool`.
2.  **Earn:** Every time a farmer buys a policy, the premium (e.g., 10 FLR) is added to the pool.
3.  **Reward:** This premium is **distributed pro-rata** to all Stakers over time.
    *   *Example:* If you own 10% of the pool, you earn 10% of every premium paid.
4.  **Risk:** If a payout happens, it comes from the pool. Stakers effectively become the "Insurance Company," earning steady yield in exchange for covering disaster risk.

### Security
*   **Reentrancy Guard:** Protected against reentrancy attacks using OpenZeppelin's `ReentrancyGuard`.
*   **Module Separation:** Logic is split into `PolicyManager` (Data), `PayoutModule` (Logic), and `CollateralPool` (Money) for better security and upgradability.

---

## 🚀 Deployment (Coston2 Testnet)

**Contracts:**
*   **PolicyManager:** `0x4aDEea1FEa03a462720C38BAb146934cfd96F924`
*   **CollateralPool:** `0x5Ed6CF1ADf3330F61D666D3336a2d59eeeA7E0fE`
*   **PayoutModule:** `0xCF8B54c0D4f10a05254a007f24F099aBFEd585c7`
*   **WeatherAdapter:** `0x0Fd10bb23f3D17a149FFC0c0e7AA4eBE82eD9226`

---

## 🛠️ Installation

```bash
# 1. Clone
git clone https://github.com/Atul-Chahar/CropGuard.git

# 2. Install
npm install
cd packages/contract && npm install
cd ../app && npm install

# 3. Configure .env (See .env.example)

# 4. Run App
cd packages/app
npm run dev
```

*Built with ❤️ for the Flare Hackathon.*
