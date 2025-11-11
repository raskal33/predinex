// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Oddyssey.sol";

/**
 * @title PrixFaucet
 * @notice Distributes 20,000 testnet PRIX tokens to eligible users
 * @dev Eligibility is verified by backend API, not on-chain
 */
contract PrixFaucet is Ownable, ReentrancyGuard {
    IERC20 public immutable prixToken;
    Oddyssey public immutable oddyssey;
    
    // Faucet configuration
    uint256 public constant FAUCET_AMOUNT = 20000 * 1e18; // 20,000 PRIX
    uint256 public constant MIN_ODDYSSEY_SLIPS = 2; // Minimum Oddyssey slips required
    
    // Tracking
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public lastClaimTime;
    uint256 public totalClaimed;
    uint256 public totalUsers;
    bool public faucetActive = true;
    
    // Events
    event FaucetClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetDeactivated(uint256 timestamp);
    event FaucetReactivated(uint256 timestamp);
    event FaucetRefilled(uint256 amount, uint256 timestamp);
    event EmergencyWithdraw(address indexed owner, uint256 amount, uint256 timestamp);
    
    /**
     * @notice Constructor
     * @param _prixToken Address of the PRIX token contract
     * @param _oddyssey Address of the Oddyssey contract
     */
    constructor(address _prixToken, address _oddyssey) Ownable(msg.sender) {
        require(_prixToken != address(0), "Invalid PRIX token address");
        require(_oddyssey != address(0), "Invalid Oddyssey address");
        prixToken = IERC20(_prixToken);
        oddyssey = Oddyssey(_oddyssey);
    }
    
    /**
     * @notice Claim testnet PRIX tokens
     * @dev Eligibility is verified on-chain including Oddyssey slips requirement
     */
    function claimPrix() external nonReentrant {
        require(faucetActive, "Faucet is not active");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(msg.sender == tx.origin, "Contracts not allowed"); // Prevent contract-to-contract claiming
        
        // Check faucet has enough tokens
        uint256 faucetBalance = prixToken.balanceOf(address(this));
        require(faucetBalance >= FAUCET_AMOUNT, "Insufficient faucet balance");
        
        // ✅ ON-CHAIN ELIGIBILITY CHECK: Verify Oddyssey slips requirement
        try oddyssey.getUserSlipCount(msg.sender) returns (uint256 slipCount) {
            require(slipCount >= MIN_ODDYSSEY_SLIPS, "Insufficient Oddyssey slips");
        } catch {
            revert("Error checking Oddyssey slips");
        }
        
        // Mark as claimed
        hasClaimed[msg.sender] = true;
        lastClaimTime[msg.sender] = block.timestamp;
        totalClaimed += FAUCET_AMOUNT;
        totalUsers++;
        
        // Transfer tokens
        require(prixToken.transfer(msg.sender, FAUCET_AMOUNT), "Token transfer failed");
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp);
    }
    
    /**
     * @notice Check if user has already claimed
     * @param user Address to check
     * @return claimed Whether user has claimed
     * @return claimTime When user claimed (0 if not claimed)
     */
    function getUserInfo(address user) external view returns (
        bool claimed,
        uint256 claimTime
    ) {
        claimed = hasClaimed[user];
        claimTime = lastClaimTime[user];
    }

    /**
     * @notice Check if user is eligible to claim (includes Oddyssey validation)
     * @param user Address to check
     * @return eligible Whether user is eligible
     * @return reason Reason if not eligible
     * @return oddysseySlips Number of Oddyssey slips user has
     */
    function checkEligibility(address user) external view returns (
        bool eligible,
        string memory reason,
        uint256 oddysseySlips
    ) {
        if (hasClaimed[user]) {
            return (false, "Already claimed", 0);
        }

        if (!faucetActive) {
            return (false, "Faucet is not active", 0);
        }

        // Check Oddyssey slips
        try oddyssey.getUserSlipCount(user) returns (uint256 slipCount) {
            oddysseySlips = slipCount;
            if (slipCount < MIN_ODDYSSEY_SLIPS) {
                return (false, "Insufficient Oddyssey slips", slipCount);
            }
        } catch {
            return (false, "Error checking Oddyssey slips", 0);
        }

        // Check faucet balance
        if (prixToken.balanceOf(address(this)) < FAUCET_AMOUNT) {
            return (false, "Insufficient faucet balance", oddysseySlips);
        }

        return (true, "Eligible to claim", oddysseySlips);
    }
    
    /**
     * @notice Get faucet statistics
     * @return balance Current PRIX balance in faucet
     * @return totalDistributed Total PRIX distributed
     * @return userCount Total users who claimed
     * @return active Whether faucet is active
     */
    function getFaucetStats() external view returns (
        uint256 balance,
        uint256 totalDistributed,
        uint256 userCount,
        bool active
    ) {
        balance = prixToken.balanceOf(address(this));
        totalDistributed = totalClaimed;
        userCount = totalUsers;
        active = faucetActive;
    }
    
    /**
     * @notice Refill the faucet with PRIX tokens
     * @param amount Amount of PRIX to add
     */
    function refillFaucet(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000000 * 1e18, "Amount too large"); // Maximum 1M PRIX per refill
        require(prixToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit FaucetRefilled(amount, block.timestamp);
    }
    
    /**
     * @notice Activate/deactivate the faucet
     * @param active New active state
     */
    function setFaucetActive(bool active) external onlyOwner {
        faucetActive = active;
        
        if (active) {
            emit FaucetReactivated(block.timestamp);
        } else {
            emit FaucetDeactivated(block.timestamp);
        }
    }
    
    /**
     * @notice Emergency withdraw all PRIX tokens
     * @dev Only callable by owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = prixToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        require(prixToken.transfer(owner(), balance), "Transfer failed");
        
        emit EmergencyWithdraw(owner(), balance, block.timestamp);
    }
    
    /**
     * @notice Emergency withdraw specific amount of PRIX tokens
     * @param amount Amount to withdraw
     */
    function emergencyWithdrawAmount(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000000 * 1e18, "Amount too large"); // Maximum 1M PRIX per withdrawal
        require(prixToken.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        require(prixToken.transfer(owner(), amount), "Transfer failed");
        
        emit EmergencyWithdraw(owner(), amount, block.timestamp);
    }
    
    /**
     * @notice Check if enough tokens are available for a claim
     * @return bool Whether faucet has sufficient balance
     */
    function hasSufficientBalance() external view returns (bool) {
        return prixToken.balanceOf(address(this)) >= FAUCET_AMOUNT;
    }
    
    /**
     * @notice Calculate how many claims the faucet can support
     * @return uint256 Number of possible claims
     */
    function maxPossibleClaims() external view returns (uint256) {
        uint256 balance = prixToken.balanceOf(address(this));
        return balance / FAUCET_AMOUNT;
    }
} 