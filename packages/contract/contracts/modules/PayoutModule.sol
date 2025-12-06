// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PolicyManager.sol";
import "./CollateralPool.sol";

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 value, uint256 timestamp, uint256 decimals);
}

interface IFDC {
    function isRainy(string memory location, uint256 timestamp) external view returns (bool);
}

contract PayoutModule is Ownable {
    PolicyManager public policyManager;
    CollateralPool public collateralPool;
    IFtsoRegistry public ftsoRegistry;
    IFDC public fdc;

    constructor(
        address _policyManager, 
        address _collateralPool, 
        address _ftsoRegistry, 
        address _fdc
    ) Ownable(msg.sender) {
        policyManager = PolicyManager(_policyManager);
        collateralPool = CollateralPool(payable(_collateralPool));
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        fdc = IFDC(_fdc);
    }

    function checkAndPayout(uint256 _policyId) external {
        PolicyManager.Policy memory policy = policyManager.getPolicy(_policyId);
        
        require(policy.active, "Policy not active");
        require(!policy.paidOut, "Already paid out");

        // FDC Verification (Simplified)
        bool adverseWeather = fdc.isRainy(policy.location, block.timestamp);
        require(adverseWeather, "Conditions not met");

        // Calculate payout in FLR using FTSO
        // policy.insuredAmount is in USD (18 decimals)
        (uint256 flrPrice, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals("FLR");
        
        // Payout = (USD Amount * 10^decimals) / Price
        uint256 payoutAmount = (policy.insuredAmount * (10**decimals)) / flrPrice;

        // Trigger Payout
        policyManager.payoutPolicy(_policyId);
        collateralPool.processPayout(policy.farmer, payoutAmount);
    }
}
