pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./OwnableToken.sol";

contract PXL is StandardToken, OwnableToken {
    using SafeMath for uint256;

    // Token Information
    string public constant name = "Pixel";
    string public constant symbol = "PXL";
    uint256 public constant decimals = 18;
    uint256 public totalSupply;

    // token is non-transferable until owner calls unlock()
    // (to prevent OTC before the token to be listed on exchanges)
    bool isTransferable = false;

    constructor(uint256 initialSupply) public {
        require(initialSupply > 0);

        totalSupply = initialSupply;
        balances[msg.sender] = totalSupply;
    }

    function unlock() external onlyOwner {
        isTransferable = true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(isTransferable || owners[msg.sender]);
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(isTransferable || owners[msg.sender]);
        return super.transfer(_to, _value);
    }

    //////////////////////
    //  mint and burn   //
    //////////////////////
    function mint(address _to, uint256 _amount) onlyOwner public returns (bool) {
        require(_to != address(0));
        require(_amount >= 0);

        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);

        Mint(_to, _amount);
        Transfer(address(0), _to, _amount);

        return true;
    }

    function burn(uint256 _amount) onlyOwner public {
        require(_amount >= 0);
        require(_amount <= balances[msg.sender]);

        totalSupply = totalSupply.sub(_amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);

        Burn(msg.sender, _amount);
        Transfer(msg.sender, address(0), _amount);
    }

    event Mint(address indexed _to, uint256 _amount);
    event Burn(address indexed _from, uint256 _amount);
}