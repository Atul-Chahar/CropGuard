const { runOracle } = require('./weather-oracle');

const INTERVAL_MS = Number(process.env.ORACLE_INTERVAL_MS || 30000); // default 30 seconds (override via ORACLE_INTERVAL_MS)

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    console.log(`⏱️ Oracle loop starting (interval ${INTERVAL_MS / 1000}s)...`);
    // Run forever; each cycle waits for the previous one to finish to avoid overlap
    while (true) {
        const start = Date.now();
        try {
            await runOracle();
        } catch (err) {
            console.error("Oracle loop iteration failed:", err.message || err);
        }
        const elapsed = Date.now() - start;
        const wait = Math.max(0, INTERVAL_MS - elapsed);
        await sleep(wait);
    }
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
