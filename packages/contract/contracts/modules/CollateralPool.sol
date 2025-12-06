// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CollateralPool is Ownable {
    
    address public policyManager;
    address public payoutModule;

    // Native FLR stakes
    mapping(address => uint256) public stakes;
    uint256 public totalLiquidity;

    // FAsset (ERC20) stakes: token => user => amount
    mapping(address => mapping(address => uint256)) public tokenStakes;
    mapping(address => uint256) public totalTokenLiquidity;

    constructor() Ownable(msg.sender) {}

    function setModules(address _policyManager, address _payoutModule) external onlyOwner {
        policyManager = _policyManager;
        payoutModule = _payoutModule;
    }

    // --- Native FLR Logic ---
    function stake() external payable {
        stakes[msg.sender] += msg.value;
        totalLiquidity += msg.value;
    }

    receive() external payable {
        if(msg.sender == policyManager) {
            totalLiquidity += msg.value; 
        }
    }

    function processPayout(address recipient, uint256 amount) external {
        require(msg.sender == payoutModule, "Only PayoutModule");
        require(address(this).balance >= amount, "Insufficient liquidity");
        payable(recipient).transfer(amount);
        totalLiquidity -= amount;
    }

    // --- FAsset (ERC20) Logic ---
    function stakeFAsset(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenStakes[token][msg.sender] += amount;
        totalTokenLiquidity[token] += amount;
    }

    function depositPremiumFAsset(address token, uint256 amount) external {
        require(msg.sender == policyManager, "Only PolicyManager");
        // PolicyManager has already transferred tokens to this contract
        totalTokenLiquidity[token] += amount;
    }

    function processPayoutFAsset(address token, address recipient, uint256 amount) external {
        require(msg.sender == payoutModule, "Only PayoutModule");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient FAsset liquidity");
        
        IERC20(token).transfer(recipient, amount);
        totalTokenLiquidity[token] -= amount;
    }
}
