// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WeatherOracleAdapter
 * @notice Minimal adapter where an authorized submitter (off-chain oracle) writes the latest weather status per location.
 *         This is a stand-in for verified FDC proofs; replace setWeatherWithProof with real verification when available.
 */
contract WeatherOracleAdapter is Ownable {
    // location => adverse weather flag
    mapping(string => bool) public adverseWeather;

    address public submitter;

    event SubmitterUpdated(address indexed newSubmitter);
    event WeatherUpdated(string indexed location, bool adverse);

    constructor(address _submitter) Ownable(msg.sender) {
        submitter = _submitter;
    }

    function setSubmitter(address _submitter) external onlyOwner {
        submitter = _submitter;
        emit SubmitterUpdated(_submitter);
    }

    /**
     * @dev Temporary write without proof. Replace with proof verification when integrating full FDC flow.
     */
    function setWeather(string calldata location, bool isAdverse) external {
        require(msg.sender == submitter, "Not authorized");
        adverseWeather[location] = isAdverse;
        emit WeatherUpdated(location, isAdverse);
    }

    function isAdverse(string calldata location) external view returns (bool) {
        return adverseWeather[location];
    }
}
