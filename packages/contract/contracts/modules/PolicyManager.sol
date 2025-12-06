// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolicyManager is Ownable {
    struct Policy {
        address farmer;
        string location;
        string cropType;
        uint256 insuredAmount;
        uint256 premium;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool paidOut;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public policyCount;
    
    // Address of the CollateralPool to deposit premiums
    address public collateralPool;
    // Address of the PayoutModule to authorize payouts
    address public payoutModule;

    event PolicyCreated(uint256 policyId, address farmer, uint256 insuredAmount);

    constructor() Ownable(msg.sender) {}

    function setCollateralPool(address _pool) external onlyOwner {
        collateralPool = _pool;
    }

    function setPayoutModule(address _module) external onlyOwner {
        payoutModule = _module;
    }

    function createPolicy(
        string memory _location, 
        string memory _cropType, 
        uint256 _insuredAmount, 
        uint256 _duration
    ) external payable {
        require(msg.value > 0, "Premium must be > 0");
        require(collateralPool != address(0), "Collateral pool not set");

        // Transfer premium to CollateralPool
        // Note: In production, use SafeERC20 for tokens. For native FLR, we transfer value.
        (bool sent, ) = collateralPool.call{value: msg.value}("");
        require(sent, "Failed to send premium to pool");

        policyCount++;
        policies[policyCount] = Policy({
            farmer: msg.sender,
            location: _location,
            cropType: _cropType,
            insuredAmount: _insuredAmount,
            premium: msg.value,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            active: true,
            paidOut: false
        });

        emit PolicyCreated(policyCount, msg.sender, _insuredAmount);
    }

    // Only PayoutModule can trigger this
    function payoutPolicy(uint256 _policyId) external {
        require(msg.sender == payoutModule, "Only PayoutModule");
        Policy storage policy = policies[_policyId];
        require(policy.active, "Policy inactive");
        require(!policy.paidOut, "Already paid out");

        policy.paidOut = true;
        policy.active = false;
        
        // Logic to trigger payout from CollateralPool would go here
        // For simplicity in this hackathon version, we assume CollateralPool handles the transfer
    }
    
     function getPolicy(uint256 _id) external view returns (Policy memory) {
        return policies[_id];
    }
}
