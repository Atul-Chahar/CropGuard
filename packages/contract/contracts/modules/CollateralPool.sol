// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CollateralPool is Ownable {
    
    address public policyManager;
    address public payoutModule;

    mapping(address => uint256) public stakes;
    uint256 public totalLiquidity;

    constructor() Ownable(msg.sender) {}

    function setModules(address _policyManager, address _payoutModule) external onlyOwner {
        policyManager = _policyManager;
        payoutModule = _payoutModule;
    }

    // Acccept deposits (staking)
    function stake() external payable {
        stakes[msg.sender] += msg.value;
        totalLiquidity += msg.value;
    }

    // Receive premiums from PolicyManager
    receive() external payable {
        if(msg.sender == policyManager) {
            // Logic to distribute yield to stakers could go here
            totalLiquidity += msg.value; 
        }
    }

    function processPayout(address recipient, uint256 amount) external {
        require(msg.sender == payoutModule, "Only PayoutModule");
        require(address(this).balance >= amount, "Insufficient liquidity");
        
        payable(recipient).transfer(amount);
        totalLiquidity -= amount;
    }
}
