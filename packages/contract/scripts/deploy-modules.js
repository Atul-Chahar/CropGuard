const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Setup Addresses
    let ftsoAddress, fdcAddress;

    if (hre.network.name === "coston2") {
        console.log("Using Real Flare FTSO Registry on Coston2");
        ftsoAddress = "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87"; // FtsoRegistry

        // For FDC, we still need our custom weather logic (isRainy).
        // Real FdcHub is for verification, not storage of arbitrary weather state.
        // So we deploy our own 'Oracle' for weather but call it FDC for architecture.
        console.log("Deploying Custom Weather Oracle (MockFDC)...");
        const MockFDC = await hre.ethers.getContractFactory("MockFDC");
        const mockFdc = await MockFDC.deploy();
        await mockFdc.waitForDeployment();
        fdcAddress = await mockFdc.getAddress();
        console.log("Custom Weather Oracle deployed to:", fdcAddress);

    } else {
        console.log("Deploying Mocks...");
        const MockFTSO = await hre.ethers.getContractFactory("MockFTSO");
        const mockFtso = await MockFTSO.deploy(10000000, 5);
        await mockFtso.waitForDeployment();
        ftsoAddress = await mockFtso.getAddress();
        console.log("MockFTSO deployed to:", ftsoAddress);

        const MockFDC = await hre.ethers.getContractFactory("MockFDC");
        const mockFdc = await MockFDC.deploy();
        await mockFdc.waitForDeployment();
        fdcAddress = await mockFdc.getAddress();
        console.log("MockFDC deployed to:", fdcAddress);
    }

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
        ftsoAddress,
        fdcAddress
    );
    await payoutModule.waitForDeployment();
    console.log("PayoutModule deployed to:", await payoutModule.getAddress());

    // 3. Wiring it all up
    console.log("Wiring modules...");
    await policyManager.setCollateralPool(await collateralPool.getAddress());
    await policyManager.setPayoutModule(await payoutModule.getAddress());
    await collateralPool.setModules(await policyManager.getAddress(), await payoutModule.getAddress());

    console.log("✅ Deployment Complete (Real FTSO + Custom Oracle)!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
