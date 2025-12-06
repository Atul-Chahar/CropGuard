const { ethers } = require("hardhat");

async function main() {
    // PayoutModule deployed at: 0x0031E3A13c2Fa56CE3fAe4355197c8F69855D853
    const PAYOUT_MODULE_ADDR = "0x0031E3A13c2Fa56CE3fAe4355197c8F69855D853";

    // Minimal ABI to check FTSO Registry address and maybe try a price check if possible through it
    const PAYOUT_ABI = [
        "function ftsoRegistry() external view returns (address)",
        "function getPolicy(uint256) external view" // Checks PolicyManager link
    ];

    // IFtsoRegistry ABI to fetch price
    const FTSO_REGISTRY_ABI = [
        "function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 value, uint256 timestamp, uint256 decimals)"
    ];

    const [deployer] = await ethers.getSigners();
    console.log("Verifying On-Chain Modules with account:", deployer.address);

    const payoutModule = new ethers.Contract(PAYOUT_MODULE_ADDR, PAYOUT_ABI, deployer);

    // 1. Verify FTSO Registry Address stored in contract
    const storedRegistry = await payoutModule.ftsoRegistry();
    console.log("Stored FTSO Registry:", storedRegistry);

    // 2. Query Real Price via that Registry
    const ftsoRegistry = new ethers.Contract(storedRegistry, FTSO_REGISTRY_ABI, deployer);
    try {
        console.log("Fetching Live FLR Price from Coston2 FTSO...");
        const symbols = ["FLR", "WFLR", "C2FLR", "testFLR", "USD"];
        for (const sym of symbols) {
            try {
                console.log(`Trying symbol: ${sym}...`);
                const [price, timestamp, decimals] = await ftsoRegistry.getCurrentPriceWithDecimals(sym);
                console.log(`✅ LIVE PRICE (${sym}): ${ethers.formatUnits(price, decimals)} USD`);
                return; // Exit on success
            } catch (e) {
                console.log(`   Symbol ${sym} failed (Index not supported)`);
            }
        }
    } catch (e) {
        console.error("❌ Failed to fetch price (Maybe symbol not supported or registry issue):", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
