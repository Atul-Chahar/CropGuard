const axios = require('axios');
const { ethers } = require('hardhat');
require('dotenv').config();

// Configuration
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY; // User needs to provide this
const FDC_CONTRACT_ADDRESS = process.env.FDC_CONTRACT_ADDRESS; // Set after deployment

async function fetchWeatherData(location) {
    if (!WEATHER_API_KEY) {
        console.warn("⚠️ No API Key found. Using Mock Data.");
        return { isRainy: false, temp: 25 };
    }

    try {
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
            temp: temp,
            rain: rain
        };
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        return null;
    }
}

async function main() {
    console.log("🌦️ Starting Weather Oracle...");

    // In a real scenario, this would loop or be a cron job
    // querying all active policies.
    // For Hackathon Demo: We check one fixed location 'Bangalore'

    const location = "Bangalore";
    const data = await fetchWeatherData(location);

    if (data) {
        console.log(\`📍 Location: \${location} | Temp: \${data.temp}°C | Rain: \${data.rain}mm\`);
        console.log(\`⚠️ Adverse Weather? \${data.isRainy ? 'YES' : 'NO'}\`);
        
        if (data.isRainy) {
            console.log("🚀 Submitting verification to FDC...");
            // Logic to call submitVerification on FDC contract
        } else {
            console.log("✅ Conditions normal. No action needed.");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
