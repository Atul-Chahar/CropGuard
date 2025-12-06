// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockFDC {
    mapping(string => bool) public weatherStatus;

    function setWeather(string memory location, bool _isRainy) external {
        weatherStatus[location] = _isRainy;
    }

    function isRainy(string memory location, uint256 /*timestamp*/) external view returns (bool) {
        return weatherStatus[location];
    }
}
