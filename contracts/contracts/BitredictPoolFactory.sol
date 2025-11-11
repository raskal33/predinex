// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Import our split contracts
import "./PrixedictPoolCore.sol";
import "./PrixedictComboPools.sol";
import "./PrixedictBoostSystem.sol";


contract PrixedictPoolFactory is Ownable, ReentrancyGuard {
    
    // Contract instances
    PrixedictPoolCore public poolCore;
    PrixedictComboPools public comboPools;
    PrixedictBoostSystem public boostSystem;
    IERC20 public prixToken;
    
    // Factory analytics
    struct FactoryAnalytics {
        uint256 totalPoolsCreated;
        uint256 totalComboPoolsCreated;
        uint256 totalVolumeProcessed;
        uint256 totalBoostedPools;
        uint256 averagePoolSize;
        uint256 factoryFees;
        uint256 lastUpdated;
    }
    
    FactoryAnalytics public factoryAnalytics;
    
    // Events
    event PoolCreatedWithBoost(uint256 indexed poolId, address indexed creator, BoostTier boostTier, uint256 totalCost);
    event ComboPoolCreatedWithBoost(uint256 indexed comboPoolId, address indexed creator, BoostTier boostTier, uint256 totalCost);
    event FactoryAnalyticsUpdated(uint256 totalPools, uint256 totalVolume, uint256 totalBoosted);
    event ContractUpgraded(string contractName, address oldAddress, address newAddress);

    constructor(
        address _poolCore,
        address _comboPools,
        address payable _boostSystem,
        address _prixToken
    ) Ownable(msg.sender) {
        require(_poolCore != address(0), "Invalid pool core address");
        require(_comboPools != address(0), "Invalid combo pools address");
        require(_boostSystem != address(0), "Invalid boost system address");
        require(_prixToken != address(0), "Invalid PRIX token address");
        
        poolCore = PrixedictPoolCore(_poolCore);
        comboPools = PrixedictComboPools(_comboPools);
        boostSystem = PrixedictBoostSystem(_boostSystem);
        prixToken = IERC20(_prixToken);
        
        factoryAnalytics.lastUpdated = block.timestamp;
    }

    // --- Admin Functions ---
    
    function upgradeContracts(
        address _newPoolCore,
        address _newComboPools,
        address payable _newBoostSystem
    ) external onlyOwner {
        if (_newPoolCore != address(0) && _newPoolCore != address(poolCore)) {
            address oldCore = address(poolCore);
            poolCore = PrixedictPoolCore(_newPoolCore);
            emit ContractUpgraded("PoolCore", oldCore, _newPoolCore);
        }
        
        if (_newComboPools != address(0) && _newComboPools != address(comboPools)) {
            address oldCombo = address(comboPools);
            comboPools = PrixedictComboPools(_newComboPools);
            emit ContractUpgraded("ComboPools", oldCombo, _newComboPools);
        }
        
        if (_newBoostSystem != address(0) && _newBoostSystem != address(boostSystem)) {
            address oldBoost = address(boostSystem);
            boostSystem = PrixedictBoostSystem(_newBoostSystem);
            emit ContractUpgraded("BoostSystem", oldBoost, _newBoostSystem);
        }
    }

    // --- Unified Pool Creation Functions ---

    function createPoolWithBoost(
        bytes32 _predictedOutcome,
        uint256 _odds,
        uint256 _creatorStake,
        uint256 _eventStartTime,
        uint256 _eventEndTime,
        bytes32 _leagueHash,
        bytes32 _categoryHash,
        bytes32 /* _regionHash */,
        bytes32 _homeTeamHash,
        bytes32 _awayTeamHash,
        bytes32 _titleHash,
        bool _isPrivate,
        uint256 _maxBetPerUser,
        bool _usePrix,
        OracleType _oracleType,
        bytes32 _marketId,
        MarketType _marketType,
        BoostTier _boostTier
    ) external payable nonReentrant returns (uint256 poolId) {
        
        // Calculate total costs
        uint256 creationFee = _usePrix ? 70e18 : 1e18; // PRIX : BNB
        uint256 boostCost = _boostTier != BoostTier.NONE ? _getBoostCost(_boostTier) : 0;
        uint256 totalCost = creationFee + _creatorStake + boostCost;
        
        if (_usePrix) {
            require(prixToken.transferFrom(msg.sender, address(this), totalCost), "PRIX transfer failed");
            // Approve pool core for its portion only
            prixToken.approve(address(poolCore), creationFee + _creatorStake);
        } else {
            require(msg.value == totalCost, "Incorrect BNB amount");
        }
        
        // 🚀 GAS OPTIMIZATION: Create the pool using lightweight function
        if (_usePrix) {
            poolId = poolCore.createPool(
                _predictedOutcome, _odds, _creatorStake, _eventStartTime, _eventEndTime,
                _leagueHash, _categoryHash, _homeTeamHash, _awayTeamHash, _titleHash, _isPrivate, _maxBetPerUser, _usePrix,
                _oracleType, _marketType, string(abi.encodePacked(_marketId))
            );
        } else {
            poolId = poolCore.createPool{value: creationFee + _creatorStake}(
                _predictedOutcome, _odds, _creatorStake, _eventStartTime, _eventEndTime,
                _leagueHash, _categoryHash, _homeTeamHash, _awayTeamHash, _titleHash, _isPrivate, _maxBetPerUser, _usePrix,
                _oracleType, _marketType, string(abi.encodePacked(_marketId))
            );
        }
        
        // Apply boost if requested
        if (_boostTier != BoostTier.NONE) {
            if (_usePrix) {
                // For PRIX pools, boost is still paid in BNB
                require(msg.value >= boostCost, "Insufficient boost payment");
                boostSystem.boostPool{value: boostCost}(poolId, _boostTier);
            } else {
                boostSystem.boostPool{value: boostCost}(poolId, _boostTier);
            }
        }
        
        // Update analytics
        _updateFactoryAnalytics(_creatorStake, _boostTier != BoostTier.NONE, false);
        
        emit PoolCreatedWithBoost(poolId, msg.sender, _boostTier, totalCost);
        
        return poolId;
    }

    function createComboPoolWithBoost(
        PrixedictComboPools.OutcomeCondition[] memory conditions,
        uint16 combinedOdds,
        uint256 creatorStake,
        uint256 earliestEventStart,
        uint256 latestEventEnd,
        string memory category,
        uint256 maxBetPerUser,
        bool usePrix,
        BoostTier _boostTier
    ) external payable nonReentrant returns (uint256 comboPoolId) {
        
        // Calculate total costs
        uint256 creationFee = usePrix ? 70e18 : 1e18; // PRIX : BNB
        uint256 boostCost = _boostTier != BoostTier.NONE ? _getBoostCost(_boostTier) : 0;
        uint256 totalCost = creationFee + creatorStake + boostCost;
        
        if (usePrix) {
            require(prixToken.transferFrom(msg.sender, address(this), totalCost), "PRIX transfer failed");
            // Approve combo pools for its portion only
            prixToken.approve(address(comboPools), creationFee + creatorStake);
        } else {
            require(msg.value == totalCost, "Incorrect BNB amount");
        }
        
        // Hash category string to bytes32 for gas optimization
        bytes32 categoryHash = keccak256(bytes(category));
        
        // Create the combo pool
        if (usePrix) {
            comboPoolId = comboPools.createComboPool(
                conditions, combinedOdds, creatorStake, earliestEventStart,
                latestEventEnd, categoryHash, maxBetPerUser, usePrix
            );
        } else {
            comboPoolId = comboPools.createComboPool{value: creationFee + creatorStake}(
                conditions, combinedOdds, creatorStake, earliestEventStart,
                latestEventEnd, categoryHash, maxBetPerUser, usePrix
            );
        }
        
        // Apply boost if requested (Note: combo pools use regular pool IDs for boosting)
        if (_boostTier != BoostTier.NONE) {
            if (usePrix) {
                // For PRIX pools, boost is still paid in BNB
                require(msg.value >= boostCost, "Insufficient boost payment");
                boostSystem.boostPool{value: boostCost}(comboPoolId, _boostTier);
            } else {
                boostSystem.boostPool{value: boostCost}(comboPoolId, _boostTier);
            }
        }
        
        // Update analytics
        _updateFactoryAnalytics(creatorStake, _boostTier != BoostTier.NONE, true);
        
        emit ComboPoolCreatedWithBoost(comboPoolId, msg.sender, _boostTier, totalCost);
        
        return comboPoolId;
    }

    // --- Simplified Creation Functions (No Boost) - Moved to end ---

    // --- Batch Operations ---

    function batchCreatePools(
        bytes32[] memory _predictedOutcomes,
        uint256[] memory _odds,
        uint256[] memory _creatorStakes,
        uint256[] memory /* _eventStartTimes */,
        uint256[] memory /* _eventEndTimes */,
        string[] memory /* _leagues */,
        string[] memory /* _categories */,
        bool /* _usePrix */
    ) external payable nonReentrant returns (uint256[] memory /* poolIds */) {
        require(_predictedOutcomes.length == _odds.length, "Array length mismatch");
        require(_odds.length == _creatorStakes.length, "Array length mismatch");
        require(_creatorStakes.length <= 10, "Too many pools in batch");
        
        // Temporarily disabled - will implement direct pool creation
        revert("Batch creation temporarily disabled");
    }

    // --- View Functions for Cross-Contract Queries ---

    function getAllPoolData(uint256 poolId) external view returns (
        PrixedictPoolCore.Pool memory pool,
        bool isBoosted,
        BoostTier boostTier,
        uint256 boostExpiry
    ) {
        pool = poolCore.getPool(poolId);
        (boostTier, boostExpiry) = boostSystem.getPoolBoost(poolId);
        isBoosted = boostSystem.isPoolBoosted(poolId);
        
        return (pool, isBoosted, boostTier, boostExpiry);
    }

    function getAllComboPoolData(uint256 comboPoolId) external view returns (
        PrixedictComboPools.ComboPool memory comboPool,
        bool isBoosted,
        BoostTier boostTier,
        uint256 boostExpiry
    ) {
        comboPool = comboPools.getComboPool(comboPoolId);
        (boostTier, boostExpiry) = boostSystem.getPoolBoost(comboPoolId);
        isBoosted = boostSystem.isPoolBoosted(comboPoolId);
        
        return (comboPool, isBoosted, boostTier, boostExpiry);
    }

    function getActivePoolsWithBoosts() external view returns (
        uint256[] memory poolIds,
        BoostTier[] memory boostTiers
    ) {
        (uint256[] memory activePools,) = poolCore.getActivePoolsPaginated(0, 100);
        boostTiers = new BoostTier[](activePools.length);
        
        for (uint256 i = 0; i < activePools.length; i++) {
            (BoostTier tier,) = boostSystem.getPoolBoost(activePools[i]);
            boostTiers[i] = tier;
        }
        
        return (activePools, boostTiers);
    }

    function getGlobalAnalytics() external view returns (
        uint256 totalPools,
        uint256 totalVolume,
        uint256 averagePoolSize,
        uint256 lastUpdated,
        FactoryAnalytics memory factoryStats,
        uint256 totalBoosted,
        uint256 totalComboVolume
    ) {
        (totalPools, totalVolume, averagePoolSize, lastUpdated) = poolCore.getGlobalStats();
        factoryStats = factoryAnalytics;
        (totalBoosted,,,,,,) = boostSystem.getBoostAnalytics();
        (,totalComboVolume,,,) = comboPools.getComboStats();
        
        return (totalPools, totalVolume, averagePoolSize, lastUpdated, factoryStats, totalBoosted, totalComboVolume);
    }

    function getCreatorAnalytics(address creator) external view returns (
        uint256 totalPoolsCreated,
        uint256 successfulPools,
        uint256 totalVolumeGenerated,
        uint256 averagePoolSize,
        uint256 reputationScore,
        uint256 winRate,
        uint256 totalEarnings,
        uint256 activePoolsCount,
        uint256[] memory creatorPools,
        uint256[] memory creatorComboPools,
        uint256 totalBoostedPools
    ) {
        totalPoolsCreated = successfulPools = totalVolumeGenerated = averagePoolSize = reputationScore = winRate = totalEarnings = activePoolsCount = 0;
        creatorPools = poolCore.getPoolsByCreator(creator, 1000);
        creatorComboPools = comboPools.getComboPoolsByCreator(creator);
        
        // Count boosted pools by this creator
        totalBoostedPools = 0;
        for (uint256 i = 0; i < creatorPools.length; i++) {
            if (boostSystem.isPoolBoosted(creatorPools[i])) {
                totalBoostedPools++;
            }
        }
        
        return (totalPoolsCreated, successfulPools, totalVolumeGenerated, averagePoolSize, reputationScore, winRate, totalEarnings, activePoolsCount, creatorPools, creatorComboPools, totalBoostedPools);
    }

    function getPoolCreationCost(
        uint256 _creatorStake,
        bool _usePrix,
        BoostTier _boostTier
    ) external view returns (uint256 totalCost, uint256 creationFee, uint256 boostCost) {
        creationFee = _usePrix ? 70e18 : 1e18;
        boostCost = _boostTier != BoostTier.NONE ? _getBoostCost(_boostTier) : 0;
        totalCost = creationFee + _creatorStake + boostCost;
        
        return (totalCost, creationFee, boostCost);
    }

    function canCreatePoolWithBoost(
        address creator,
        uint256 poolId,
        BoostTier boostTier,
        bool usePrix
    ) external view returns (bool canCreate, string memory reason) {
        // Check if boost can be applied
        if (boostTier != BoostTier.NONE) {
            (bool canBoost, string memory boostReason) = boostSystem.canBoostPool(poolId, boostTier);
            if (!canBoost) {
                return (false, boostReason);
            }
        }
        
        // Check creator's balance
        if (usePrix) {
            uint256 creationFee = 70e18;
            uint256 balance = prixToken.balanceOf(creator);
            if (balance < creationFee) {
                return (false, "Insufficient PRIX balance");
            }
        }
        
        return (true, "");
    }

    // --- Contract Addresses ---
    
    function getContractAddresses() external view returns (
        address poolCoreAddress,
        address comboPoolsAddress,
        address boostSystemAddress,
        address prixTokenAddress
    ) {
        return (address(poolCore), address(comboPools), address(boostSystem), address(prixToken));
    }

    function getFactoryAnalytics() external view returns (FactoryAnalytics memory) {
        return factoryAnalytics;
    }

    // --- Internal Functions ---

    function _getBoostCost(BoostTier tier) internal pure returns (uint256) {
        if (tier == BoostTier.BRONZE) return 2e18;
        if (tier == BoostTier.SILVER) return 3e18;
        if (tier == BoostTier.GOLD) return 5e18;
        return 0;
    }

    function _updateFactoryAnalytics(uint256 stakeAmount, bool wasBoosted, bool isComboPool) internal {
        if (isComboPool) {
            factoryAnalytics.totalComboPoolsCreated++;
        } else {
            factoryAnalytics.totalPoolsCreated++;
        }
        
        if (wasBoosted) {
            factoryAnalytics.totalBoostedPools++;
        }
        
        factoryAnalytics.totalVolumeProcessed += stakeAmount;
        factoryAnalytics.lastUpdated = block.timestamp;
        
        uint256 totalPools = factoryAnalytics.totalPoolsCreated + factoryAnalytics.totalComboPoolsCreated;
        if (totalPools > 0) {
            factoryAnalytics.averagePoolSize = factoryAnalytics.totalVolumeProcessed / totalPools;
        }
        
        emit FactoryAnalyticsUpdated(totalPools, factoryAnalytics.totalVolumeProcessed, factoryAnalytics.totalBoostedPools);
    }

    // --- Emergency Functions ---

    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause
        // Could add paused state and modifier to all functions
    }

    function emergencyWithdraw() external onlyOwner {
        // Withdraw any stuck tokens/ETH
        uint256 bnbBalance = address(this).balance;
        uint256 prixBalance = prixToken.balanceOf(address(this));
        
        if (bnbBalance > 0) {
            (bool success, ) = payable(owner()).call{value: bnbBalance}("");
            require(success, "BNB withdrawal failed");
        }
        
        if (prixBalance > 0) {
            prixToken.transfer(owner(), prixBalance);
        }
    }


    // --- Receive Function ---
    
    receive() external payable {
        // Allow contract to receive BNB for boost payments
    }
}
