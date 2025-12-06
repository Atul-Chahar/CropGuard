const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Mocks (if on testnet/local without real FTSO/FDC)
    // For Hackathon, we might want to deploy mocks even on testnet if access is tricky, 
    // but let's assume we use Mocks for the FDC part at least.

    const MockFTSO = await hre.ethers.getContractFactory("MockFTSO");
    const mockFtso = await MockFTSO.deploy(10000000, 5); // Price: 100.00000, Decimals: 5
    await mockFtso.waitForDeployment();
    console.log("MockFTSO deployed to:", await mockFtso.getAddress());

    const MockFDC = await hre.ethers.getContractFactory("MockFDC");
    const mockFdc = await MockFDC.deploy();
    await mockFdc.waitForDeployment();
    console.log("MockFDC deploy to:", await mockFdc.getAddress());

    // 2. Deploy Modules
    const PolicyManager = await hre.ethers.getContractFactory("PolicyManager");
    const policyManager = await PolicyManager.deploy();
    await policyManager.waitForDeployment();
    console.log("PolicyManager deployed to:", await policyManager.getAddress());

    const CollateralPool = await hre.ethers.getContractFactory("CollateralPool");
    const collateralPool = await CollateralPool.deploy();
    await collateralPool.waitForDeployment();
    console.log("CollateralPool deployed to:", await collateralPool.getAddress());

    const PayoutModule = await hre.ethers.getContractFactory("PayoutModule");
    const payoutModule = await PayoutModule.deploy(
        await policyManager.getAddress(),
        await collateralPool.getAddress(),
        await mockFtso.getAddress(), // Use Real FTSO address in production
        await mockFdc.getAddress()   // Use Real FDC address in production
    );
    await payoutModule.waitForDeployment();
    console.log("PayoutModule deployed to:", await payoutModule.getAddress());

    // 3. Wiring it all up
    console.log("Wiring modules...");
    await policyManager.setCollateralPool(await collateralPool.getAddress());
    await policyManager.setPayoutModule(await payoutModule.getAddress());
    await collateralPool.setModules(await policyManager.getAddress(), await payoutModule.getAddress());

    console.log("✅ Deployment Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
