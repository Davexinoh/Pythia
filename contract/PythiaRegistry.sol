// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PythiaRegistry {
    uint256 public constant STARTING_BALANCE = 1000 * 1e6;

    struct Wallet {
        bool registered;
        uint256 virtualBalance;
        uint256 totalExecutions;
        uint256 totalSkips;
        uint256 registeredAt;
        uint256 lastActiveAt;
    }

    mapping(address => Wallet) public wallets;
    address[] public registeredAddresses;
    address public owner;

    event WalletRegistered(address indexed wallet, uint256 startingBalance, uint256 timestamp);
    event BalanceUpdated(address indexed wallet, uint256 newBalance, uint256 timestamp);
    event ExecutionRecorded(address indexed wallet, uint256 betSize, string direction, uint256 timestamp);
    event SkipRecorded(address indexed wallet, string reason, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Owner registers wallet on behalf of user
    function registerWallet(address wallet) external onlyOwner {
        require(!wallets[wallet].registered, "Already registered");

        wallets[wallet] = Wallet({
            registered: true,
            virtualBalance: STARTING_BALANCE,
            totalExecutions: 0,
            totalSkips: 0,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp
        });

        registeredAddresses.push(wallet);
        emit WalletRegistered(wallet, STARTING_BALANCE, block.timestamp);
    }

    function isRegistered(address wallet) external view returns (bool) {
        return wallets[wallet].registered;
    }

    function getWallet(address wallet) external view returns (
        bool registered,
        uint256 virtualBalance,
        uint256 totalExecutions,
        uint256 totalSkips,
        uint256 registeredAt,
        uint256 lastActiveAt
    ) {
        Wallet memory w = wallets[wallet];
        return (
            w.registered,
            w.virtualBalance,
            w.totalExecutions,
            w.totalSkips,
            w.registeredAt,
            w.lastActiveAt
        );
    }

    function recordExecution(
        address wallet,
        uint256 betSize,
        string calldata direction
    ) external onlyOwner {
        require(wallets[wallet].registered, "Wallet not registered");
        require(wallets[wallet].virtualBalance >= betSize, "Insufficient balance");

        wallets[wallet].virtualBalance -= betSize;
        wallets[wallet].totalExecutions += 1;
        wallets[wallet].lastActiveAt = block.timestamp;

        emit ExecutionRecorded(wallet, betSize, direction, block.timestamp);
        emit BalanceUpdated(wallet, wallets[wallet].virtualBalance, block.timestamp);
    }

    function recordSkip(
        address wallet,
        string calldata reason
    ) external onlyOwner {
        require(wallets[wallet].registered, "Wallet not registered");

        wallets[wallet].totalSkips += 1;
        wallets[wallet].lastActiveAt = block.timestamp;

        emit SkipRecorded(wallet, reason, block.timestamp);
    }

    function updateBalance(
        address wallet,
        uint256 newBalance
    ) external onlyOwner {
        require(wallets[wallet].registered, "Wallet not registered");

        wallets[wallet].virtualBalance = newBalance;
        wallets[wallet].lastActiveAt = block.timestamp;

        emit BalanceUpdated(wallet, newBalance, block.timestamp);
    }

    function getTotalWallets() external view returns (uint256) {
        return registeredAddresses.length;
    }

    function getAllWallets() external view returns (address[] memory) {
        return registeredAddresses;
    }
}