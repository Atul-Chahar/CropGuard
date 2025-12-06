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
    mapping(address => bool) public submitters;

    event SubmitterUpdated(address indexed submitter, bool allowed);
    event WeatherUpdated(string indexed location, bool adverse);

    constructor(address _submitter) Ownable(msg.sender) {
        submitters[_submitter] = true;
        emit SubmitterUpdated(_submitter, true);
    }

    function setSubmitter(address _submitter, bool allowed) external onlyOwner {
        submitters[_submitter] = allowed;
        emit SubmitterUpdated(_submitter, allowed);
    }

    /**
     * @dev Temporary write without proof. Replace with proof verification when integrating full FDC flow.
     */
    function setWeather(string calldata location, bool isAdverse) external {
        require(submitters[msg.sender], "Not authorized");
        adverseWeather[location] = isAdverse;
        emit WeatherUpdated(location, isAdverse);
    }

    function isAdverse(string calldata location) external view returns (bool) {
        return adverseWeather[location];
    }
}
