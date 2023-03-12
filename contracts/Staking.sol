//SPDX-License-Identifier:MIT

pragma solidity ^0.8.0;

contract Staking {
    address public owner;

    struct Position {
        uint256 positionId;
        address walletAddress;
        uint256 createDate;
        uint256 unlockDate;
        uint256 percentInterest;
        uint256 weiStaked;
        uint256 weiInterest;
        bool open;
    }

    Position position;

    uint256 public currentPositonId;

    mapping(uint256 => Position) public positions;

    mapping(address => uint256[]) public positionIdsByAddress;
    mapping(uint256 => uint256) public tiers;

    uint256[] public lockPeriods;

    constructor() payable {
        owner = msg.sender;
        tiers[30] = 700;
        tiers[90] = 1000;
        tiers[180] = 1200;

        lockPeriods.push(30);
        lockPeriods.push(90);
        lockPeriods.push(180);
    }

    function stakeEther(uint256 numDays) external payable {
        require(tiers[numDays] > 0, "Mapping not found");

        positions[currentPositonId] = Position(
            currentPositonId,
            msg.sender,
            block.timestamp,
            block.timestamp + (numDays * 1 days),
            tiers[numDays],
            msg.value,
            calculateInterest(tiers[numDays], msg.value),
            true
        );

        positionIdsByAddress[msg.sender].push(currentPositonId);
        currentPositonId += 1;
    }

    function calculateInterest(uint256 basisPoints, uint256 weiAmount)
        private
        pure
        returns (uint256)
    {
        return (basisPoints * weiAmount) / 1000; //700/1000 =>0.07
    }

    function modifyLockPeriods(uint256 numDays, uint256 basisPoints) external {
        require(owner == msg.sender, "Only owner may modify staking periods");

        tiers[numDays] = basisPoints;
        lockPeriods.push(numDays);
    }

    function getLockPeriod() external view returns (uint256[] memory) {
        return lockPeriods;
    }

    function getInterestRate(uint256 numDays) external view returns (uint256) {
        return tiers[numDays];
    }

    function getPositionByIdS(uint256 positionId)
        external
        view
        returns (Position memory)
    {
        return positions[positionId];
    }

    function getPositionIdsForAddress(address walletAddress)
        external
        view
        returns (uint256[] memory)
    {
        return positionIdsByAddress[walletAddress];
    }

    function changeUnlockDate(uint256 positionId, uint256 newUnlockDate)
        external
    {
        require(owner == msg.sender, "Only owner may modify staking period");

        positions[positionId].unlockDate = newUnlockDate;
    }

    function closePosition(uint256 positionId) external {
        require(
            positions[positionId].walletAddress == msg.sender,
            "Only Person creator may modify position"
        );
        require(positions[positionId].open == true, "Position is closed");

        positions[positionId].open = false;

        if (block.timestamp > positions[positionId].unlockDate) {
            uint256 amount = positions[positionId].weiStaked +
                positions[positionId].weiInterest;
            payable(msg.sender).call{value: amount}("");
        } else {
            payable(msg.sender).call{value: positions[positionId].weiStaked}(
                ""
            );
        }
    }
}
