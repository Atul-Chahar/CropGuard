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

    function checkAndPayout(uint256 _policyId) external {
        PolicyManager.Policy memory policy = policyManager.getPolicy(_policyId);
        
        require(policy.active, "Policy not active");
        require(!policy.paidOut, "Already paid out");

        // Weather status from adapter (currently off-chain oracle writes; replace with proof-based verification when available)
        bool adverseWeather = weatherAdapter.isAdverse(policy.location);
        require(adverseWeather, "Conditions not met");

        // Calculate payout in FLR using FTSO
        // policy.insuredAmount is stored as USD cents (two decimals)
        // Coston2 uses "C2FLR" symbol
        (uint256 flrPrice, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals("C2FLR");
        require(flrPrice > 0, "Invalid price from FTSO");

        // Payout = (USD cents * 10^decimals) / (price * 100) to bring cents back to whole USD
        uint256 payoutAmount = (policy.insuredAmount * (10**decimals)) / (flrPrice * 100);

        // Trigger Payout
        policyManager.payoutPolicy(_policyId);
        collateralPool.processPayout(policy.farmer, payoutAmount);
    }
}
