// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title StakingManager
 * @dev Manages staking of Herena (HRN) tokens to obtain quadratic voting power.
 */
contract StakingManager is Ownable, ReentrancyGuard {
    /// @dev Emitted when a user stakes tokens.
    event Staked(address indexed user, uint256 amount);

    /// @dev Emitted when a user unstakes tokens.
    event Unstaked(address indexed user, uint256 amount);

    /// @dev Emitted when the minimum stake amount is updated.
    event MinStakeUpdated(uint256 oldMinStake, uint256 newMinStake);

    /// @dev Emitted when the voting manager address is updated.
    event VotingManagerUpdated(address indexed oldVotingManager, address indexed newVotingManager);

    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when an amount parameter is zero.
    error ZeroAmount();

    /// @dev Thrown when a stake would not satisfy the minimum stake requirement.
    error BelowMinStake();

    /// @dev Thrown when trying to unstake more than currently staked.
    error InsufficientStaked();

    /// @dev Thrown when user has an active proposal and cannot unstake.
    error ActiveProposal();

    IERC20 public immutable token;

    /// @dev Minimum total stake required per user.
    uint256 public minStake;

    /// @dev Total staked amount per user.
    mapping(address => uint256) private _stakedAmount;

    /// @dev Optional voting manager used to lock stakes while proposals are active.
    address public votingManager;

    /**
     * @dev Initializes the StakingManager.
     * @param token_ Address of the Herena (HRN) token contract.
     * @param minStake_ Initial minimum stake amount.
     */
    constructor(address token_, uint256 minStake_) Ownable(msg.sender) {
        if (token_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
        minStake = minStake_;
    }

    /**
     * @dev Stake HRN tokens to gain quadratic voting power.
     * @param amount Amount of HRN to stake.
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 current = _stakedAmount[msg.sender];
        uint256 newTotal = current + amount;

        if (newTotal < minStake) revert BelowMinStake();

        _stakedAmount[msg.sender] = newTotal;

        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "StakingManager: transfer failed");

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake previously staked HRN tokens.
     * @param amount Amount of HRN to unstake.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 current = _stakedAmount[msg.sender];
        if (amount > current) revert InsufficientStaked();

        if (votingManager != address(0)) {
            (bool ok, bytes memory data) = votingManager.staticcall(
                abi.encodeWithSignature("hasActiveProposal(address)", msg.sender)
            );
            if (!ok || !abi.decode(data, (bool))) {
                revert ActiveProposal();
            }
        }

        _stakedAmount[msg.sender] = current - amount;

        bool success = token.transfer(msg.sender, amount);
        require(success, "StakingManager: transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Returns raw staked amount for a user.
     * @param user Address of the user.
     * @return amount Raw staked amount.
     */
    function getStakedAmount(address user) external view returns (uint256 amount) {
        amount = _stakedAmount[user];
    }

    /**
     * @dev Returns quadratic voting power for a user as sqrt(stakedAmount).
     * @param user Address of the user.
     * @return votingPower Quadratic voting power.
     */
    function getVotingPower(address user) external view returns (uint256 votingPower) {
        votingPower = Math.sqrt(_stakedAmount[user]);
    }

    /**
     * @dev Sets the minimum stake amount. Only callable by the owner.
     * @param newMinStake New minimum stake amount.
     */
    function setMinStake(uint256 newMinStake) external onlyOwner {
        uint256 oldMinStake = minStake;
        minStake = newMinStake;
        emit MinStakeUpdated(oldMinStake, newMinStake);
    }

    /**
     * @dev Sets the voting manager contract. Only callable by the owner.
     * @param newVotingManager Address of the VotingManager contract.
     */
    function setVotingManager(address newVotingManager) external onlyOwner {
        if (newVotingManager == address(0)) revert ZeroAddress();
        address oldVotingManager = votingManager;
        votingManager = newVotingManager;
        emit VotingManagerUpdated(oldVotingManager, newVotingManager);
    }
}

