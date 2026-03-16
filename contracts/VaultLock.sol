// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


contract VaultLock {
    address public owner;
    string  public greeting;

    struct Deposit {
        uint256 amount;
        uint256 unlocksAt;
    }

    mapping(address => Deposit) private _deposits;

    event Deposited(address indexed user, uint256 amount, uint256 unlocksAt);
    event Withdrawn(address indexed user, uint256 amount);
    event GreetingUpdated(string newGreeting);

    error NotOwner();
    error ZeroAmount();
    error AlreadyLocked();
    error StillLocked(uint256 unlocksAt);
    error NothingToWithdraw();
    error TransferFailed();

    constructor(string memory _greeting) {
        owner    = msg.sender;
        greeting = _greeting;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function deposit(uint256 lockSeconds) external payable {
        if (msg.value == 0)                   revert ZeroAmount();
        if (_deposits[msg.sender].amount > 0) revert AlreadyLocked();

        uint256 unlocksAt = block.timestamp + lockSeconds;
        _deposits[msg.sender] = Deposit(msg.value, unlocksAt);

        emit Deposited(msg.sender, msg.value, unlocksAt);
    }

    function withdraw() external {
        Deposit memory dep = _deposits[msg.sender];

        if (dep.amount == 0)                 revert NothingToWithdraw();
        if (block.timestamp < dep.unlocksAt) revert StillLocked(dep.unlocksAt);

        uint256 amount = dep.amount;
        delete _deposits[msg.sender];

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function getDeposit(address user)
        external
        view
        returns (uint256 amount, uint256 unlocksAt)
    {
        Deposit memory dep = _deposits[user];
        return (dep.amount, dep.unlocksAt);
    }

    function setGreeting(string calldata _greeting) external onlyOwner {
        greeting = _greeting;
        emit GreetingUpdated(_greeting);
    }

    function totalBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
