const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Setup Addresses
    let ftsoAddress, fdcAddress, weatherAdapterAddress;
    const envFtso = process.env.FTSO_REGISTRY_ADDRESS;
    const envFdc = process.env.FDC_CONTRACT_ADDRESS;
    const envWeatherAdapter = process.env.WEATHER_ADAPTER_ADDRESS;
    const oracleSubmitters = (process.env.WEATHER_SUBMITTERS || process.env.WEATHER_SUBMITTER_ADDRESS || deployer.address)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    if (hre.network.name === "coston2") {
        console.log("Using Real Flare FTSO Registry on Coston2");
        ftsoAddress = envFtso || "0x48Da21ce34966A64E267CeFb78012C0282D0Ac87"; // FtsoRegistry default

        if (envFdc) {
            console.log("Using provided FDC contract:", envFdc);
            fdcAddress = envFdc;
        } else {
            console.log("⚠️ No FDC contract address provided; requestAttestation will be unavailable.");
        }

        if (envWeatherAdapter) {
            console.log("Using existing WeatherAdapter:", envWeatherAdapter);
            weatherAdapterAddress = envWeatherAdapter;
        } else {
            console.log("Deploying WeatherOracleAdapter...");
            const WeatherOracleAdapter = await hre.ethers.getContractFactory("WeatherOracleAdapter");
            const adapter = await WeatherOracleAdapter.deploy(oracleSubmitters[0]);
            await adapter.waitForDeployment();
            weatherAdapterAddress = await adapter.getAddress();
            console.log("WeatherOracleAdapter deployed to:", weatherAdapterAddress);

            // add any additional submitters
            for (let i = 1; i < oracleSubmitters.length; i++) {
                await adapter.setSubmitter(oracleSubmitters[i], true);
            }
        }

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

        const WeatherOracleAdapter = await hre.ethers.getContractFactory("WeatherOracleAdapter");
        const adapter = await WeatherOracleAdapter.deploy(oracleSubmitter);
        await adapter.waitForDeployment();
        weatherAdapterAddress = await adapter.getAddress();
        console.log("WeatherOracleAdapter deployed to:", weatherAdapterAddress);
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
        weatherAdapterAddress
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
