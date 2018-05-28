pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./OwnableToken.sol";

/**
 * @title PXL implementation based on StandardToken ERC-20 contract.
 *
 * @author Charls Kim - <cs.kim@battleent.com>
 * @dev see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
 */
contract PXL is StandardToken, OwnableToken {
    using SafeMath for uint256;

    // Token basic information
    string public constant name = "Pixel";
    string public constant symbol = "PXL";
    uint256 public constant decimals = 18;
    uint256 public totalSupply;

    // Token is non-transferable until owner calls unlock()
    // (to prevent OTC before the token to be listed on exchanges)
    bool isTransferable = false;

    /**
     * @dev PXL constrcutor
     *
     * @param initialSupply Initial PXL token supply to issue.
     */
    constructor(uint256 initialSupply) public {
        require(initialSupply > 0);

        totalSupply = initialSupply;
        balances[msg.sender] = totalSupply;

        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function() public payable {
        revert();
    }

    /**
     * @dev unlock PXL transfer
     *
     * @notice token contract is initially locked.
     * @notice contract owner should unlock to enable transaction.
     */
    function unlock() external onlyOwner {
        isTransferable = true;
    }

    /**
     * @dev Transfer tokens from one address to another
     *
     * @notice override transferFrom to block transaction when contract was locked.
     * @param _from address The address which you want to send tokens from
     * @param _to address The address which you want to transfer to
     * @param _value uint256 the amount of tokens to be transferred
     * @return A boolean that indicates if transfer was successful.
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(isTransferable || owners[msg.sender]);
        return super.transferFrom(_from, _to, _value);
    }

    /**
     * @dev Transfer token for a specified address
     *
     * @notice override transfer to block transaction when contract was locked.
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     * @return A boolean that indicates if transfer was successful.
     */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(isTransferable || owners[msg.sender]);
        return super.transfer(_to, _value);
    }

    /**
     * @dev Function to mint tokens
     * @param _amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(uint256 _amount) onlyOwner public returns (bool) {
        totalSupply = totalSupply.add(_amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);

        emit Mint(msg.sender, _amount);
        emit Transfer(address(0), msg.sender, _amount);
        return true;
    }

    /**
     * @dev Burns a specific amount of tokens.
     * @param _amount The amount of token to be burned.
     */
    function burn(uint256 _amount) onlyOwner public {
        require(_amount <= balances[msg.sender]);

        totalSupply = totalSupply.sub(_amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);

        emit Burn(msg.sender, _amount);
    }

    event Mint(address indexed _to, uint256 _amount);
    event Burn(address indexed _from, uint256 _amount);
}