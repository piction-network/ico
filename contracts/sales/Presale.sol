pragma solidity 0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Whitelist.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../utils/Stateable.sol";


contract Presale is Stateable {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    uint256 public maxcap;
    uint256 public weiRaised;
    uint256 public exceed;
    uint256 public minimum;
    uint256 public rate;

    address public wallet;
    Whitelist public whiteList;
    ERC20 public token;

    mapping(address => uint256) public buyers;

    modifier validAddress(address _account) {
        require(_account != address(0));
        require(_account != address(this));
        _;
    }

    modifier limit(address[] _addrs) {
        require(_addrs.length <= 30);
        _;
    }

    modifier completed() {
        require(getState() == State.Completed);
        _;
    }

    constructor (
        uint256 _maxcap,
        uint256 _exceed,
        uint256 _minimum,
        uint256 _rate,
        address _wallet,
        address _whitelist,
        address _token
    ) public {
        require(_wallet != address(0));
        require(_whitelist != address(0));
        require(_token != address(0));
        require(_maxcap > _minimum);

        maxcap = _maxcap;
        exceed = _exceed;
        minimum = _minimum;
        rate = _rate;
        wallet = _wallet;
        token = ERC20(_token);
        whiteList = Whitelist(_whitelist);

        setState(State.Preparing);
    }

    function() external payable {
        collect();
    }

    function setWhitelist(address _whitelist) external onlyOwner validAddress(_whitelist) {
        whiteList = Whitelist(_whitelist);
        emit EventChangeExternalAddress(_whitelist, "whitelist");
    }

    function setWallet(address _wallet) external onlyOwner validAddress(_wallet) {
        wallet = _wallet;
        emit EventChangeExternalAddress(_wallet, "wallet");
    }

    function pause() external onlyOwner {
        setState(State.Pausing);
    }

    function start() external onlyOwner {
        setState(State.Starting);
    }

    function complete() external onlyOwner {
        setState(State.Completed);
    }

    function buyerAddressTransfer(address _from, address _to) external onlyOwner validAddress(_from) validAddress(_to) {
        require(whiteList.whitelist(_from));
        require(whiteList.whitelist(_to));
        require(buyers[_from] > 0);
        require(buyers[_to] == 0);

        buyers[_to] = buyers[_from];
        buyers[_from] = 0;

        emit EventBuyerAddressTransfer(_from, _to);
    }

    function refund(address[] _addrs) external onlyOwner completed limit(_addrs) {
        for (uint256 i = 0; i < _addrs.length; i++) {
            refund(_addrs[i]);
        }
    }

    function release(address[] _addrs) external onlyOwner completed limit(_addrs) {
        for (uint256 i = 0; i < _addrs.length; i++) {
            release(_addrs[i]);
        }
    }

    function finalize() external onlyOwner completed {
        withdrawEther();
        withdrawToken();
        setState(State.Finalized);
    }

    function collect() public payable {
        address buyer = msg.sender;
        uint256 amount = msg.value;

        require(getState() == State.Starting);
        require(whiteList.whitelist(buyer));
        require(buyer != address(0));
        require(weiRaised < maxcap);
        require(buyers[buyer] < exceed);
        require(buyers[buyer].add(amount) >= minimum);

        uint256 purchase;
        uint256 refund;
        (purchase, refund) = getPurchaseAmount(buyer, amount);

        weiRaised = weiRaised.add(purchase);

        buyers[buyer] = buyers[buyer].add(purchase);
        emit EventPurchase(buyer, purchase, refund, purchase.mul(rate));

        if (refund > 0) {
            buyer.transfer(refund);
        }
    }

    function withdrawToken() public onlyOwner completed {
        token.safeTransfer(msg.sender, token.balanceOf(address(this)));
        emit EventWithdrawToken(msg.sender, token.balanceOf(address(this)));
    }

    function withdrawEther() public onlyOwner completed {
        wallet.transfer(address(this).balance);
        emit EventWithdrawEther(wallet, address(this).balance);
    }

    function getPurchaseAmount(address _buyer, uint256 _amount) private view returns (uint256, uint256) {
        uint256 d1 = maxcap.sub(weiRaised);
        uint256 d2 = exceed.sub(buyers[_buyer]);
        uint256 possibleAmount = min(min(d1, d2), _amount);

        return (possibleAmount, _amount.sub(possibleAmount));
    }

    function min(uint256 val1, uint256 val2) private pure returns (uint256) {
        return (val1 > val2) ? val2 : val1;
    }

    function release(address _addr) private validAddress(_addr) {
        if (buyers[_addr] > 0) {
            uint256 releaseAmount = buyers[_addr].mul(rate);
            buyers[_addr] = 0;
            token.safeTransfer(_addr, releaseAmount);
            emit EventRelease(_addr, releaseAmount);
        } else {
            emit EventFail(_addr, "release");
        }
    }

    function refund(address _addr) private validAddress(_addr) {
        if (buyers[_addr] > 0) {
            uint256 refundAmount = buyers[_addr];
            buyers[_addr] = 0;
            _addr.transfer(refundAmount);
            emit EventRefund(_addr, refundAmount);
        } else {
            emit EventFail(_addr, "refund");
        }
    }

    event EventPurchase(address indexed _buyer, uint256 _purchased, uint256 _refund, uint256 _tokens);

    event EventChangeExternalAddress(address _addr, string _name);
    event EventBuyerAddressTransfer(address indexed _from, address indexed _to);

    event EventRelease(address indexed _to, uint256 _amount);
    event EventRefund(address indexed _to, uint256 _amount);
    event EventFail(address indexed _addr, string _reason);

    event EventWithdrawToken(address indexed _from, uint256 _amount);
    event EventWithdrawEther(address indexed _from, uint256 _amount);
}
