// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PolicyManager.sol";
import "./CollateralPool.sol";

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 value, uint256 timestamp, uint256 decimals);
}

interface IWeatherAdapter {
    function isAdverse(string calldata location) external view returns (bool);
}

contract PayoutModule is Ownable {
    PolicyManager public policyManager;
    CollateralPool public collateralPool;
    IFtsoRegistry public ftsoRegistry;
    IWeatherAdapter public weatherAdapter;

    constructor(
        address _policyManager, 
        address _collateralPool, 
        address _ftsoRegistry, 
        address _weatherAdapter
    ) Ownable(msg.sender) {
        policyManager = PolicyManager(_policyManager);
        collateralPool = CollateralPool(payable(_collateralPool));
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        weatherAdapter = IWeatherAdapter(_weatherAdapter);
    }

    event PayoutTriggered(uint256 indexed policyId, address indexed farmer, uint256 payoutAmount);

    function checkAndPayout(uint256 _policyId) external {
        PolicyManager.Policy memory policy = policyManager.getPolicy(_policyId);
        
        require(policy.active, "Policy not active");
        require(!policy.paidOut, "Already paid out");

        // Weather status from adapter (currently off-chain oracle writes; replace with proof-based verification when available)
        bool adverseWeather = weatherAdapter.isAdverse(policy.location);
        require(adverseWeather, "Conditions not met");

        // Calculate payout in WEI using FTSO
        // policy.insuredAmount is stored as USD cents (two decimals)
        // PayoutWei = (USD_cents * 10^priceDecimals * 1e18) / (price * 100)
        (uint256 flrPrice, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals("C2FLR");
        require(flrPrice > 0, "Invalid price from FTSO");

        uint256 payoutAmount = (policy.insuredAmount * (10**decimals) * 1e18) / (flrPrice * 100);
        uint256 available = collateralPool.availableLiquidity();
        require(available >= payoutAmount, "Insufficient pool liquidity for payout");

        // Trigger Payout
        policyManager.payoutPolicy(_policyId);
        collateralPool.processPayout(policy.farmer, payoutAmount);
        emit PayoutTriggered(_policyId, policy.farmer, payoutAmount);
    }
}
