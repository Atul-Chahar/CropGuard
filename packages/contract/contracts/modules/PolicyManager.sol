// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICollateralPool {
    function depositPremiumFAsset(address token, uint256 amount) external;
}

contract PolicyManager is Ownable {
    struct Policy {
        address farmer;
        string location;
        string cropType;
        uint256 insuredAmount;
        uint256 premium;
        address premiumToken; // address(0) for native FLR
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool paidOut;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public policyCount;
    
    address public collateralPool;
    address public payoutModule;

    event PolicyCreated(uint256 policyId, address farmer, uint256 insuredAmount, address token);

    constructor() Ownable(msg.sender) {}

    function setCollateralPool(address _pool) external onlyOwner {
        collateralPool = _pool;
    }

    function setPayoutModule(address _module) external onlyOwner {
        payoutModule = _module;
    }

    // 1. Native FLR Policy
    function createPolicy(
        string memory _location, 
        string memory _cropType, 
        uint256 _insuredAmount, 
        uint256 _duration
    ) external payable {
        require(msg.value > 0, "Premium must be > 0");
        require(collateralPool != address(0), "Collateral pool not set");

        (bool sent, ) = collateralPool.call{value: msg.value}("");
        require(sent, "Failed to send premium to pool");

        _mintPolicy(msg.sender, _location, _cropType, _insuredAmount, msg.value, address(0), _duration);
    }

    // 2. FAsset (ERC20) Policy
    function createPolicyWithFAsset(
        string memory _location, 
        string memory _cropType, 
        uint256 _insuredAmount, 
        uint256 _duration,
        address _token,
        uint256 _amount
    ) external {
        require(_amount > 0, "Premium must be > 0");
        require(collateralPool != address(0), "Collateral pool not set");

        // Transfer FAsset from Farmer to CollateralPool
        IERC20(_token).transferFrom(msg.sender, collateralPool, _amount);
        // Notify Pool
        ICollateralPool(collateralPool).depositPremiumFAsset(_token, _amount);

        _mintPolicy(msg.sender, _location, _cropType, _insuredAmount, _amount, _token, _duration);
    }

    function _mintPolicy(
        address _farmer,
        string memory _location,
        string memory _cropType,
        uint256 _insuredAmount,
        uint256 _premium,
        address _token,
        uint256 _duration
    ) internal {
        policyCount++;
        policies[policyCount] = Policy({
            farmer: _farmer,
            location: _location,
            cropType: _cropType,
            insuredAmount: _insuredAmount,
            premium: _premium,
            premiumToken: _token,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            active: true,
            paidOut: false
        });

        emit PolicyCreated(policyCount, _farmer, _insuredAmount, _token);
    }

    function payoutPolicy(uint256 _policyId) external {
        require(msg.sender == payoutModule, "Only PayoutModule");
        Policy storage policy = policies[_policyId];
        require(policy.active, "Policy inactive");
        require(!policy.paidOut, "Already paid out");

        policy.paidOut = true;
        policy.active = false;
    }
    
     function getPolicy(uint256 _id) external view returns (Policy memory) {
        return policies[_id];
    }
}
