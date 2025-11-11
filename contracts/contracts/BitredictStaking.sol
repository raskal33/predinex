// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrixedictStaking is Ownable, ReentrancyGuard {
    IERC20 public prixToken;
    // BNB is native coin, not ERC20

    uint256 private constant REWARD_PRECISION = 1e18;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BASIS_POINTS = 10000;

    struct Tier {
        uint256 baseAPY; // in basis points (1000 = 10%)
        uint256 minStake;
        uint256 revenueShareRate; // in basis points (1000 = 10%)
    }

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint8 tierId;
        uint8 durationOption; // 0 = 3d, 1 = 5d, 2 = 7d (testnet)
        uint256 claimedRewardPRIX;
        uint256 rewardDebtPRIX;
        uint256 rewardDebtBNB;
    }

    mapping(address => Stake[]) public userStakes;
    Tier[] public tiers;

    uint256[] public durationBonuses = [0, 200, 400]; // +0%, +2%, +4%
    uint256[] public durations = [3 days, 5 days, 7 days]; // Testnet periods

    uint256 public lastRevenueDistribution;
    uint256 public distributionInterval = 30 days;

    uint256 public revenuePoolPRIX;
    uint256 public revenuePoolBNB;

    mapping(uint8 => uint256) public totalStakedInTier;
    mapping(uint8 => uint256) public accRewardPerSharePRIX;
    mapping(uint8 => uint256) public accRewardPerShareBNB;

    mapping(address => uint256) public pendingRevenuePRIX;
    mapping(address => uint256) public pendingRevenueBNB;

    // Integration with PrixedictPool
    mapping(address => bool) public authorizedPools;
    
    // Total statistics
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    uint256 public totalRevenuePaid;

    event Staked(address indexed user, uint256 amount, uint8 tier, uint8 duration);
    event Claimed(address indexed user, uint256 prixAmount);
    event Unstaked(address indexed user, uint256 amount);
    event RevenueAdded(uint256 prixAmount, uint256 bnbAmount);
    event RevenueDistributed();
    event RevenueClaimed(address indexed user, uint256 prixAmount, uint256 bnbAmount);
    event PoolAuthorized(address indexed pool, bool authorized);

    constructor(address _prix) Ownable(msg.sender) {
        require(_prix != address(0), "Invalid PRIX address");
        prixToken = IERC20(_prix);
        lastRevenueDistribution = block.timestamp;
        tiers.push(Tier({ baseAPY: 600, minStake: 1000 ether, revenueShareRate: 1000 })); // 6% APY, 10% revenue
        tiers.push(Tier({ baseAPY: 1200, minStake: 3000 ether, revenueShareRate: 3000 })); // 12% APY, 30% revenue
        tiers.push(Tier({ baseAPY: 1800, minStake: 10000 ether, revenueShareRate: 6000 })); // 18% APY, 60% revenue
    }

    modifier validStakeIndex(address _user, uint256 _index) {
        require(_index < userStakes[_user].length, "Invalid stake index");
        _;
    }

    modifier validTier(uint8 _tierId) {
        require(_tierId < tiers.length, "Invalid tier");
        _;
    }

    modifier validDuration(uint8 _durationOption) {
        require(_durationOption < durations.length, "Invalid duration");
        _;
    }

    function authorizePool(address _pool, bool _authorized) external onlyOwner {
        require(_pool != address(0), "Invalid pool address");
        authorizedPools[_pool] = _authorized;
        emit PoolAuthorized(_pool, _authorized);
    }

    // Accepts PRIX as ERC20, BNB as native coin
    function addRevenueFromPool(uint256 _prixAmount) external payable {
        require(authorizedPools[msg.sender], "Unauthorized pool");
        _addRevenue(_prixAmount, msg.value);
    }

    function addRevenue(uint256 _prixAmount) external payable onlyOwner {
        _addRevenue(_prixAmount, msg.value);
    }

    function _addRevenue(uint256 _prixAmount, uint256 _bnbAmount) internal {
        if (_prixAmount > 0) {
            prixToken.transferFrom(msg.sender, address(this), _prixAmount);
            revenuePoolPRIX += _prixAmount;
        }
        if (_bnbAmount > 0) {
            revenuePoolBNB += _bnbAmount;
        }
        emit RevenueAdded(_prixAmount, _bnbAmount);
    }

    function fundAPYRewards(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        prixToken.transferFrom(msg.sender, address(this), _amount);
    }

    function distributeRevenue() public {
        require(block.timestamp >= lastRevenueDistribution + distributionInterval, "Distribution too early");
        lastRevenueDistribution = block.timestamp;

        uint256 totalPRIX = revenuePoolPRIX;
        uint256 totalBNB = revenuePoolBNB;

        if (totalPRIX == 0 && totalBNB == 0) {
            return;
        }

        revenuePoolPRIX = 0;
        revenuePoolBNB = 0;

        for (uint8 i = 0; i < tiers.length; i++) {
            uint256 totalStakedTier = totalStakedInTier[i];
            if (totalStakedTier == 0) {
                continue;
            }

            uint256 tierShare = tiers[i].revenueShareRate;
            uint256 tierRevenuePRIX = (totalPRIX * tierShare) / BASIS_POINTS;
            uint256 tierRevenueBNB = (totalBNB * tierShare) / BASIS_POINTS;

            if (tierRevenuePRIX > 0) {
                accRewardPerSharePRIX[i] += (tierRevenuePRIX * REWARD_PRECISION) / totalStakedTier;
            }
            if (tierRevenueBNB > 0) {
                accRewardPerShareBNB[i] += (tierRevenueBNB * REWARD_PRECISION) / totalStakedTier;
            }
        }

        emit RevenueDistributed();
    }

    function _harvestRevenueRewards(address _user) internal {
        for (uint256 i = 0; i < userStakes[_user].length; i++) {
            Stake storage s = userStakes[_user][i];

            uint256 accPRIX = accRewardPerSharePRIX[s.tierId];
            uint256 accBNB = accRewardPerShareBNB[s.tierId];

            uint256 pendingPRIX = (s.amount * accPRIX) / REWARD_PRECISION - s.rewardDebtPRIX;
            uint256 pendingBNB = (s.amount * accBNB) / REWARD_PRECISION - s.rewardDebtBNB;

            if (pendingPRIX > 0) {
                pendingRevenuePRIX[_user] += pendingPRIX;
            }
            if (pendingBNB > 0) {
                pendingRevenueBNB[_user] += pendingBNB;
            }

            s.rewardDebtPRIX = (s.amount * accPRIX) / REWARD_PRECISION;
            s.rewardDebtBNB = (s.amount * accBNB) / REWARD_PRECISION;
        }
    }

    function claimRevenue() external nonReentrant {
        _harvestRevenueRewards(msg.sender);

        uint256 prixAmount = pendingRevenuePRIX[msg.sender];
        uint256 bnbAmount = pendingRevenueBNB[msg.sender];

        require(prixAmount > 0 || bnbAmount > 0, "Nothing to claim");

        pendingRevenuePRIX[msg.sender] = 0;
        pendingRevenueBNB[msg.sender] = 0;

        if (prixAmount > 0) {
            require(prixToken.balanceOf(address(this)) >= prixAmount, "Insufficient PRIX balance");
            prixToken.transfer(msg.sender, prixAmount);
            totalRevenuePaid += prixAmount;
        }
        if (bnbAmount > 0) {
            require(address(this).balance >= bnbAmount, "Insufficient BNB balance");
            (bool success, ) = payable(msg.sender).call{value: bnbAmount}("");
            require(success, "BNB transfer failed");
        }

        emit RevenueClaimed(msg.sender, prixAmount, bnbAmount);
    }

    function stake(uint256 _amount, uint8 _tierId, uint8 _durationOption) 
        external 
        nonReentrant 
        validTier(_tierId) 
        validDuration(_durationOption) 
    {
        require(_amount > 0, "Stake amount must be greater than 0");
        Tier memory tier = tiers[_tierId];
        require(_amount >= tier.minStake, "Below tier minimum stake");
        _harvestRevenueRewards(msg.sender);
        prixToken.transferFrom(msg.sender, address(this), _amount);
        userStakes[msg.sender].push(
            Stake({
                amount: _amount,
                startTime: block.timestamp,
                tierId: _tierId,
                durationOption: _durationOption,
                claimedRewardPRIX: 0,
                rewardDebtPRIX: (_amount * accRewardPerSharePRIX[_tierId]) / REWARD_PRECISION,
                rewardDebtBNB: (_amount * accRewardPerShareBNB[_tierId]) / REWARD_PRECISION
            })
        );
        totalStakedInTier[_tierId] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount, _tierId, _durationOption);
    }

    function calculateRewards(address _user, uint256 _index) 
        public 
        view 
        validStakeIndex(_user, _index) 
        returns (uint256 prixReward) 
    {
        Stake memory s = userStakes[_user][_index];
        Tier memory t = tiers[s.tierId];
        uint256 bonus = durationBonuses[s.durationOption];
        uint256 totalAPY = t.baseAPY + bonus;
        uint256 timeStaked = block.timestamp - s.startTime;
        uint256 yearlyReward = (s.amount * totalAPY) / BASIS_POINTS;
        uint256 earned = (yearlyReward * timeStaked) / SECONDS_PER_YEAR;
        prixReward = earned > s.claimedRewardPRIX ? earned - s.claimedRewardPRIX : 0;
    }

    function claim(uint256 _index) public nonReentrant validStakeIndex(msg.sender, _index) {
        _claim(msg.sender, _index);
    }

    function _claim(address _user, uint256 _index) internal {
        Stake storage s = userStakes[_user][_index];
        uint256 prixAmount = calculateRewards(_user, _index);
        if (prixAmount > 0) {
            s.claimedRewardPRIX += prixAmount;
            require(prixToken.balanceOf(address(this)) >= prixAmount, "Insufficient contract balance");
            prixToken.transfer(_user, prixAmount);
            totalRewardsPaid += prixAmount;
        }
        emit Claimed(_user, prixAmount);
    }

    function unstake(uint256 _index) external nonReentrant validStakeIndex(msg.sender, _index) {
        _harvestRevenueRewards(msg.sender);
        Stake memory s = userStakes[msg.sender][_index];
        require(block.timestamp >= s.startTime + durations[s.durationOption], "Stake is locked");
        _claim(msg.sender, _index); // auto-claim APY rewards
        uint256 unstakeAmount = s.amount;
        totalStakedInTier[s.tierId] -= unstakeAmount;
        totalStaked -= unstakeAmount;
        // Remove stake using swap-and-pop
        Stake[] storage stakes = userStakes[msg.sender];
        stakes[_index] = stakes[stakes.length - 1];
        stakes.pop();
        require(prixToken.balanceOf(address(this)) >= unstakeAmount, "Insufficient contract balance");
        prixToken.transfer(msg.sender, unstakeAmount);
        emit Unstaked(msg.sender, unstakeAmount);
    }

    // View functions for frontend integration
    function getUserStakes(address _user) external view returns (Stake[] memory) {
        return userStakes[_user];
    }

    function getTiers() external view returns (Tier[] memory) {
        return tiers;
    }

    function getDurationOptions() external view returns (uint256[] memory) {
        return durations;
    }

    function getRevenueShareRate(address _user, uint256 _index) 
        external 
        view 
        validStakeIndex(_user, _index) 
        returns (uint256) 
    {
        Stake memory s = userStakes[_user][_index];
        Tier memory t = tiers[s.tierId];
        return t.revenueShareRate;
    }

    function getPendingRewards(address _user, uint256 _index) 
        external 
        view 
        validStakeIndex(_user, _index) 
        returns (uint256 apyReward, uint256 pendingPRIX, uint256 pendingBNB) 
    {
        apyReward = calculateRewards(_user, _index);
        Stake memory s = userStakes[_user][_index];
        uint256 accPRIX = accRewardPerSharePRIX[s.tierId];
        uint256 accBNB = accRewardPerShareBNB[s.tierId];
        pendingPRIX = (s.amount * accPRIX) / REWARD_PRECISION - s.rewardDebtPRIX;
        pendingBNB = (s.amount * accBNB) / REWARD_PRECISION - s.rewardDebtBNB;
    }

    function getUserTotalStaked(address _user) external view returns (uint256 total) {
        Stake[] memory stakes = userStakes[_user];
        for (uint256 i = 0; i < stakes.length; i++) {
            total += stakes[i].amount;
        }
    }

    function getUserStakeCount(address _user) external view returns (uint256) {
        return userStakes[_user].length;
    }

    function getContractStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalRewardsPaid,
        uint256 _totalRevenuePaid,
        uint256 _contractPRIXBalance,
        uint256 _contractBNBBalance
    ) {
        _totalStaked = totalStaked;
        _totalRewardsPaid = totalRewardsPaid;
        _totalRevenuePaid = totalRevenuePaid;
        _contractPRIXBalance = prixToken.balanceOf(address(this));
        _contractBNBBalance = address(this).balance;
    }

    function getTierStats() external view returns (
        uint256[] memory tierStaked,
        uint256[] memory tierAPY,
        uint256[] memory tierMinStake,
        uint256[] memory tierRevenueShare
    ) {
        uint256 tierCount = tiers.length;
        tierStaked = new uint256[](tierCount);
        tierAPY = new uint256[](tierCount);
        tierMinStake = new uint256[](tierCount);
        tierRevenueShare = new uint256[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            tierStaked[i] = totalStakedInTier[uint8(i)];
            tierAPY[i] = tiers[i].baseAPY;
            tierMinStake[i] = tiers[i].minStake;
            tierRevenueShare[i] = tiers[i].revenueShareRate;
        }
    }

    function isStakeUnlocked(address _user, uint256 _index) 
        external 
        view 
        validStakeIndex(_user, _index) 
        returns (bool) 
    {
        Stake memory s = userStakes[_user][_index];
        return block.timestamp >= s.startTime + durations[s.durationOption];
    }

    function getTimeUntilUnlock(address _user, uint256 _index) 
        external 
        view 
        validStakeIndex(_user, _index) 
        returns (uint256) 
    {
        Stake memory s = userStakes[_user][_index];
        uint256 unlockTime = s.startTime + durations[s.durationOption];
        if (block.timestamp >= unlockTime) {
            return 0;
        }
        return unlockTime - block.timestamp;
    }
} 