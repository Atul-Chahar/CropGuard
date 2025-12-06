const axios = require('axios');
const { ethers } = require('hardhat');
require('dotenv').config();

// Configuration
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const FDC_HUB_ADDRESS = process.env.FDC_HUB_ADDRESS || ''; // Real FdcHub (requestAttestation)
const WEATHER_ADAPTER_ADDRESS = process.env.WEATHER_ADAPTER_ADDRESS || ''; // Our on-chain adapter that stores weather status
const POLICY_MANAGER_ADDRESS = process.env.POLICY_MANAGER_ADDRESS || '';
const PAYOUT_MODULE_ADDRESS = process.env.PAYOUT_MODULE_ADDRESS || '';
const TRIGGER_PAYOUT = process.env.TRIGGER_PAYOUT === 'true';
// ABI pulled from repo root (fdc-abi.json)
const FDC_ABI = require('../../../../fdc-abi.json');

const WEATHER_ADAPTER_ABI = [
    "function setWeather(string location, bool isAdverse) external",
    "function isAdverse(string location) external view returns (bool)"
];

const POLICY_MANAGER_ABI = [
    "function policyCount() public view returns (uint256)",
    "function getPolicy(uint256 _id) external view returns (tuple(address farmer, string location, string cropType, uint256 insuredAmount, uint256 premium, address premiumToken, uint256 startTime, uint256 endTime, bool active, bool paidOut))"
];

const PAYOUT_ABI = ["function checkAndPayout(uint256 _policyId) external"];

async function fetchWeatherData(location) {
    if (!WEATHER_API_KEY) {
        throw new Error("Missing WEATHER_API_KEY. Set it in .env");
    }

    const response = await axios.get(WEATHER_API_URL, {
        params: {
            q: location,
            appid: WEATHER_API_KEY,
            units: 'metric'
        }
    });

    // Simple logic: If rain > 5mm or temp > 35C, trigger 'adverse'
    const rain = response.data.rain ? response.data.rain['1h'] : 0;
    const temp = response.data.main.temp;

    return {
        isRainy: rain > 5 || temp > 35,
        temp,
        rain
    };
}

async function runOracle() {
    console.log("🌦️ Starting Weather Oracle (OpenWeather + on-chain submit)...");

    if (!POLICY_MANAGER_ADDRESS) throw new Error("POLICY_MANAGER_ADDRESS is required");
    if (!FDC_HUB_ADDRESS) throw new Error("FDC_HUB_ADDRESS is required");
    if (!WEATHER_ADAPTER_ADDRESS) throw new Error("WEATHER_ADAPTER_ADDRESS is required");

    const [signer] = await ethers.getSigners();
    const policyManager = new ethers.Contract(POLICY_MANAGER_ADDRESS, POLICY_MANAGER_ABI, signer);
    const fdcHub = new ethers.Contract(FDC_HUB_ADDRESS, FDC_ABI, signer);
    const weatherAdapter = new ethers.Contract(WEATHER_ADAPTER_ADDRESS, WEATHER_ADAPTER_ABI, signer);
    const payoutModule = PAYOUT_MODULE_ADDRESS ? new ethers.Contract(PAYOUT_MODULE_ADDRESS, PAYOUT_ABI, signer) : null;

    const count = Number(await policyManager.policyCount());
    if (count === 0) {
        console.log("No policies to check. Exiting.");
        return;
    }

    for (let id = 1; id <= count; id++) {
        const policy = await policyManager.getPolicy(id);
        if (!policy.active || policy.paidOut) continue;

        const location = policy.location;
        console.log(`📍 Checking policy ${id} at location ${location}...`);

        try {
            const data = await fetchWeatherData(location);
            console.log(`   Temp: ${data.temp}°C | Rain: ${data.rain || 0}mm | Adverse: ${data.isRainy}`);

            // Submit attestation request to FDC Hub (payload is generic bytes; here we pass encoded location+weather)
            const payload = ethers.AbiCoder.defaultAbiCoder().encode(
                ["string", "bool", "uint256"],
                [location, data.isRainy, Math.floor(Date.now() / 1000)]
            );
            const attTx = await fdcHub.requestAttestation(payload, { value: 0 });
            await attTx.wait();
            console.log(`   ✅ Attestation requested (tx: ${attTx.hash})`);

            // Write result into our WeatherAdapter (temporary until proof verification is wired)
            const tx = await weatherAdapter.setWeather(location, data.isRainy);
            await tx.wait();
            console.log(`   ✅ Weather status stored in adapter (tx: ${tx.hash})`);

            // Optionally trigger payout flow if adverse
            if (data.isRainy && payoutModule && TRIGGER_PAYOUT) {
                const payoutTx = await payoutModule.checkAndPayout(id);
                await payoutTx.wait();
                console.log(`   💸 Payout triggered (tx: ${payoutTx.hash})`);
            }
        } catch (error) {
            console.error(`   ❌ Failed for policy ${id}:`, error.message);
        }
    }
}

module.exports = { runOracle };

if (require.main === module) {
    runOracle().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
