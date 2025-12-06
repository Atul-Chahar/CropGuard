// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol) external view returns (uint256 value, uint256 timestamp, uint256 decimals);
}

interface IFDC {
    // This is a simplified interface for the hackathon
    // In production, this would verify a Merkle Proof or attestation
    function isRainy(string memory location, uint256 timestamp) external view returns (bool);
}

contract CropInsurance is Ownable {
    struct Policy {
        address farmer;
        string location;
        string cropType;
        uint256 insuredAmount; // in USD (18 decimals)
        uint256 premiumPaid;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool paidOut;
    }

    IFtsoRegistry public ftsoRegistry;
    IFDC public fdc;
    
    uint256 public policyCount;
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public farmerPolicies;

    event PolicyPurchased(uint256 policyId, address farmer, string location, uint256 amount);
    event Payout(uint256 policyId, address farmer, uint256 amount);

    constructor(address _ftsoRegistry, address _fdc) Ownable(msg.sender) {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        fdc = IFDC(_fdc);
    }

    // Function to calculate premium (Simplified: 10% of insured amount)
    function calculatePremium(uint256 insuredAmountUSD) public pure returns (uint256) {
        return insuredAmountUSD / 10; 
    }

    // Purchase policy. For simplicity, we accept native C2FLR.
    // User sends FLR. We convert FLR to USD using FTSO to check if premium is sufficient.
    function purchasePolicy(string memory location, string memory cropType, uint256 insuredAmountUSD, uint256 duration) external payable {
        uint256 premiumUSD = calculatePremium(insuredAmountUSD);
        
        // Get FLR price from FTSO
        (uint256 flrPrice, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals("FLR");
        
        // Calculate required FLR: premiumUSD / flrPrice
        // Adjust for decimals. FTSO usually returns price with `decimals` decimals.
        // insuredAmountUSD is 18 decimals.
        // flrPrice is `decimals` decimals (e.g. 5).
        // Cost = (premiumUSD * 10^decimals) / flrPrice
        
        uint256 requiredFLR = (premiumUSD * (10**decimals)) / flrPrice;
        
        require(msg.value >= requiredFLR, "Insufficient premium paid");

        policyCount++;
        policies[policyCount] = Policy({
            farmer: msg.sender,
            location: location,
            cropType: cropType,
            insuredAmount: insuredAmountUSD,
            premiumPaid: msg.value,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            active: true,
            paidOut: false
        });
        
        farmerPolicies[msg.sender].push(policyCount);
        
        emit PolicyPurchased(policyCount, msg.sender, location, insuredAmountUSD);
    }

    // Check weather and payout if applicable
    // In a real scenario, this would be an FDC verification call
    function checkAndPayout(uint256 policyId) external {
        Policy storage policy = policies[policyId];
        require(policy.active, "Policy not active");
        require(!policy.paidOut, "Already paid out");
        require(block.timestamp <= policy.endTime, "Policy expired");

        // Check FDC
        bool adverseWeather = fdc.isRainy(policy.location, block.timestamp);
        
        if (adverseWeather) {
            policy.paidOut = true;
            policy.active = false;
            
            // Payout in FLR equivalent to insuredAmountUSD
            (uint256 flrPrice, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals("FLR");
            uint256 payoutFLR = (policy.insuredAmount * (10**decimals)) / flrPrice;
            
            require(address(this).balance >= payoutFLR, "Insufficient contract balance");
            
            payable(policy.farmer).transfer(payoutFLR);
            emit Payout(policyId, policy.farmer, payoutFLR);
        }
    }
    
    // Allow contract to receive funds (for payouts)
    receive() external payable {}
}
