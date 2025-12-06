// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockFTSO {
    uint256 private price;
    uint256 private decimals;

    constructor(uint256 _initialPrice, uint256 _decimals) {
        price = _initialPrice;
        decimals = _decimals;
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }

    function getCurrentPriceWithDecimals(string memory /*_symbol*/) external view returns (uint256, uint256, uint256) {
        return (price, block.timestamp, decimals);
    }
}
