const { ethers } = require("hardhat");


const REGISTRY_ADDR = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";
const REGISTRY_ABI = [
    "function getContractAddressByName(string calldata _name) external view returns (address)"
];

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Resolving addresses on Coston2...");

    const registry = new ethers.Contract(REGISTRY_ADDR, REGISTRY_ABI, deployer);

    try {
        const ftsoRegistry = await registry.getContractAddressByName("FtsoRegistry");
        console.log("FtsoRegistry:", ftsoRegistry);

        // Trying common names for FDC
        const fdcHub = await registry.getContractAddressByName("FdcHub");
        console.log("FdcHub:", fdcHub);

        // Also try PriceSubmitter just in case
        const priceSubmitter = await registry.getContractAddressByName("PriceSubmitter");
        console.log("PriceSubmitter:", priceSubmitter);

    } catch (error) {
        console.error("Error resolving:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
