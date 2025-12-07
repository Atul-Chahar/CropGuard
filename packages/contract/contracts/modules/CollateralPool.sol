// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CollateralPool is Ownable, ReentrancyGuard {
    
    address public policyManager;
    address public payoutModule;

    // Native FLR stakes
    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalLiquidity;
    uint256 public totalStakedFLR;

    uint256 public accRewardPerShare; // scaled by 1e12 for precision
    uint256 private constant ACC_PRECISION = 1e12;

    // FAsset (ERC20) stakes: token => user => amount
    mapping(address => mapping(address => uint256)) public tokenStakes;
    mapping(address => uint256) public totalTokenLiquidity;

    constructor() Ownable(msg.sender) {}

    function setModules(address _policyManager, address _payoutModule) external onlyOwner {
        policyManager = _policyManager;
        payoutModule = _payoutModule;
    }

    // --- Native FLR Logic ---
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Zero stake");
        _updateRewards(0);

        StakeInfo storage user = stakes[msg.sender];
        uint256 pending = ((user.amount * accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
        if (pending > 0) {
            require(address(this).balance >= pending, "Insufficient liquidity for rewards");
            totalLiquidity -= pending;
            payable(msg.sender).transfer(pending);
        }

        user.amount += msg.value;
        user.rewardDebt = (user.amount * accRewardPerShare) / ACC_PRECISION;

        totalStakedFLR += msg.value;
        totalLiquidity += msg.value;
    }

    receive() external payable {
        if (msg.sender == policyManager) {
            _updateRewards(msg.value); // distribute premiums to stakers
        } else {
            // treat other incoming funds as additive liquidity; distribute if stakers exist
            if (totalStakedFLR > 0) {
                accRewardPerShare += (msg.value * ACC_PRECISION) / totalStakedFLR;
            }
            totalLiquidity += msg.value;
        }
    }

    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage user = stakes[msg.sender];
        require(user.amount >= amount, "Insufficient stake");

        _updateRewards(0);

        uint256 pending = ((user.amount * accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
        if (pending > 0) {
            require(address(this).balance >= pending, "Insufficient liquidity for rewards");
            totalLiquidity -= pending;
            payable(msg.sender).transfer(pending);
        }

        if (amount > 0) {
            user.amount -= amount;
            totalStakedFLR -= amount;
            totalLiquidity -= amount;
            payable(msg.sender).transfer(amount);
        }

        user.rewardDebt = (user.amount * accRewardPerShare) / ACC_PRECISION;
    }

    function claimRewards() external nonReentrant {
        StakeInfo storage user = stakes[msg.sender];
        _updateRewards(0);

        uint256 pending = ((user.amount * accRewardPerShare) / ACC_PRECISION) - user.rewardDebt;
        require(pending > 0, "No rewards");
        require(address(this).balance >= pending, "Insufficient liquidity for rewards");

        totalLiquidity -= pending;
        user.rewardDebt = (user.amount * accRewardPerShare) / ACC_PRECISION;
        payable(msg.sender).transfer(pending);
    }

    function pendingRewards(address userAddr) external view returns (uint256) {
        StakeInfo memory user = stakes[userAddr];
        uint256 adjustedAcc = accRewardPerShare;
        // simulate distribution if a premium arrives without storage writes
        if (totalStakedFLR > 0) {
            // no additional premium passed here; view only
        }
        return ((user.amount * adjustedAcc) / ACC_PRECISION) - user.rewardDebt;
    }

    function processPayout(address recipient, uint256 amount) external nonReentrant {
        require(msg.sender == payoutModule, "Only PayoutModule");
        require(address(this).balance >= amount, "Insufficient liquidity");
        payable(recipient).transfer(amount);
        totalLiquidity -= amount;
    }

    // --- FAsset (ERC20) Logic ---
    function stakeFAsset(address token, uint256 amount) external nonReentrant {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenStakes[token][msg.sender] += amount;
        totalTokenLiquidity[token] += amount;
    }

    function depositPremiumFAsset(address token, uint256 amount) external nonReentrant {
        require(msg.sender == policyManager, "Only PolicyManager");
        // PolicyManager has already transferred tokens to this contract
        totalTokenLiquidity[token] += amount;
    }

    function processPayoutFAsset(address token, address recipient, uint256 amount) external nonReentrant {
        require(msg.sender == payoutModule, "Only PayoutModule");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient FAsset liquidity");
        
        IERC20(token).transfer(recipient, amount);
        totalTokenLiquidity[token] -= amount;
    }

    function availableLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    function _updateRewards(uint256 premium) internal {
        if (premium > 0) {
            if (totalStakedFLR > 0) {
                accRewardPerShare += (premium * ACC_PRECISION) / totalStakedFLR;
            }
            totalLiquidity += premium;
        }
    }
}
