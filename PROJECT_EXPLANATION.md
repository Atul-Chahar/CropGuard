# CropGuard: A Beginner's Guide 🌾🛡️

Welcome to **CropGuard**! This document explains exactly how our project works, broken down so anyone (even without a crypto background) can understand it.

---

## 1. The Big Idea: "Automatic Insurance" 🤖

Imagine a farmer named **Ravi**.
*   **The Old Way:** If a drought kills Ravi's crops, he has to call an insurance agent, fill out paperwork, wait for an inspector to visit his farm, and maybe — months later — he gets paid.
*   **The CropGuard Way:** Ravi buys insurance on our website. A computer program constantly checks the weather. If it sees "No Rain for 30 Days," it **instantly** sends money to Ravi's wallet. No phone calls, no waiting, no humans involved.

This is called **Parametric Insurance**. It pays out based on *parameters* (data like rainfall or temperature) rather than someone's opinion.

---

## 2. The Tech: What is "Flare Network"? ☀️

We built this on **Flare**, a special type of Blockchain. Think of a **Blockchain** as a shared, unchangeable digital notebook. Once something is written there, it can't be erased.

Flare has two superpowers that make it perfect for insurance:

### A. FTSO (Flare Time Series Oracle) 📉
*   **The Problem:** Blockchains live in their own world. They don't know the price of things in the real world (like dollars, gold, or crops).
*   **The FTSO Solution:** It's like a decentralized "Price Checker." Thousands of data providers constantly vote on the accurate price of assets.
*   **In CropGuard:** We use FTSO to know the price of the **FLR token** (the money used on Flare). This ensures that if we promise to pay Ravi $1,000, we calculate exactly how many FLR tokens that matches right now.

### B. FDC (Flare Data Connector) ☁️
*   **The Problem:** Blockchains can't access Google or Weather.com directly.
*   **The FDC Solution:** It's a "Fact Checker." It allows us to bring data from the outside world (like "Did it rain in Bangalore?") onto the blockchain safely.
*   **In CropGuard:** We use a standardized way to check weather data so the smart contract "knows" if it rained or not.

### C. Coston2 Testnet 🧪
*   This is just a "Practice Playground" for Flare. It works exactly like the real thing, but the money is "fake" (test tokens) so developers can experiment without losing real cash.

---

## 3. How the Project Layout Works 🏗️

Our project is split into two main parts:

### The Website (Frontend) 💻
*   **Where:** `packages/app` (The code for the screen you see).
*   **What it is:** The visual part you see in your browser.
*   **Tech:** Built with **Next.js** (a tool for making websites) and styled with **Tailwind** (for colors/layout).
*   **Analogy:** This is like the "Service Counter" at a bank. It's where you talk to the system, but the money is kept in the vault (the smart contracts).

### The Smart Contracts (Backend) 📜
*   **Where:** `packages/contract` (The rules of the game).
*   **What they are:** Computer programs that live on the blockchain. They execute rules automatically.
*   **Key Contracts:**
    1.  **`PolicyManager` (The Filing Cabinet):** Keeps a record of every insurance policy sold.
    2.  **`CollateralPool` (The Vault):** Holds all the money (FLR tokens). Farmers pay premiums here, and payouts come from here.
    3.  **`PayoutModule` (The Cashier):** This contract checks the rules. It asks: *"Did the Oracle say it rained?"* If yes, it tells the Vault to pay the Farmer.
    4.  **`WeatherOracleAdapter` (The Messenger):** This receives the weather report from our off-chain script and saves it so the Cashier can read it.

### The "Oracle Script" 🕵️
*   **Where:** `scripts/oracle/weather-oracle.js`
*   **What it is:** A small robot code running on our server.
*   **Job:**
    1.  It wakes up every few minutes.
    2.  It asks OpenWeatherMap: *"Hey, what's the weather in Bangalore?"*
    3.  It gets the answer and writes it to the **WeatherOracleAdapter** on the blockchain.
    4.  If the weather is bad (Adverse), it yells at the **PayoutModule**: *"Pay the farmer now!"*

---

## 4. The Complete Story (Walkthrough) 🚶

1.  **Buy Policy:** You go to our website and click "Purchase Coverage". You send **10 FLR** (Premium) to the **Vault** (`CollateralPool`).
2.  **Record Kept:** The **Filing Cabinet** (`PolicyManager`) writes down: *"User 0x123 insured Wheat in Bangalore for $1000."*
3.  **Weather Watch:** Our **Oracle Script** keeps checking the weather in Bangalore.
4.  **Bad Weather Hits:** The script sees "Heavy Rain > 5mm".
5.  **Proof Submitted:** The script sends this "Rain" status to the **Messenger** (`WeatherOracleAdapter`).
6.  **Payout Check:** The script triggers the **Cashier** (`PayoutModule`).
7.  **Price Check:** The Cashier asks the **FTSO**: *"How much is $1000 worth in FLR right now?"* FTSO says: *"25,000 FLR"*.
8.  **Payment:** The Cashier tells the **Vault**: *"Send 25,000 FLR to User 0x123"*.
9.  **Done:** You check your wallet, and the money is there!

---

## Summary Definitions 📚

*   **dApp**: Decentralized App. An app that runs on a blockchain, not a single company's server.
*   **Smart Contract**: Code that runs on the blockchain. "If This, Then That" for money.
*   **Wallet (MetaMask)**: Your digital ID and bank account combined. You need it to log in and pay.
*   **Transaction (Tx)**: Any action that changes data on the blockchain (buying insurance, updating weather).

---
*Created for CropGuard Documentation.*
