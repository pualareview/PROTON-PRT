pragma solidity ^0.4.11;

import "./StandardToken.sol";
import "./SafeMath.sol";

contract ProtonToken is StandardToken, SafeMath {
  // metadata
  string public constant name = "Proton Token";
  string public constant symbol = "PRT";
  uint256 public constant decimals = 18;
  string public version = "1.0";

  // contracts
  address public ethFundDeposit;      // deposit address for ETH
  address public prtFundDeposit;      // deposit address for PRT User Fund


  // crowdsale parameters
  bool public isFinalized;              // switched to true in operational state
  uint256 public fundingStartBlock;
  uint256 public fundingEndBlock;

  // confirm crowdsale
  bool public confirmCrowdsale;

  uint256 public constant tokenExchangeRate = 4500; // 4500 PRT tokens per 1 ETH
  uint256 public constant tokenBonus = 500; // 500 PRT bonus per 1 ETH
  uint256 public tokenCreationCap = 115000 * tokenExchangeRate * (10**decimals);
  uint256 public prtFund = 57500 * tokenExchangeRate * (10**decimals);   // PRT reserved
  uint256 public tokenCreationMin = 72500 * tokenExchangeRate * (10**decimals);
  uint256 public tokenBonusCap = 77500 * tokenExchangeRate * (10**decimals); // Bonus given till 77500 eth

  // For testnet
  // uint256 public tokenCreationCap = 10 * tokenExchangeRate * (10**decimals);
  // uint256 public prtFund = 5 * tokenExchangeRate * (10**decimals);   // PRT reserved for internal use
  // uint256 public tokenCreationMin = 6 * tokenExchangeRate * (10**decimals);
  // uint256 public tokenBonusCap = 7 * tokenExchangeRate * (10**decimals); // Bonus given till 77500 eth


  // events
  event LogRefund(address indexed _to, uint256 _value);
  event CreatePRT(address indexed _to, uint256 _value);
  event GiveBonus(address indexed _to, uint256 _value);

  // constructor
  function ProtonToken(address _ethFundDeposit, address _prtFundDeposit, uint256 _fundingStartBlock, uint256 _fundingEndBlock) {
    isFinalized = false; //controls pre through crowdsale state

    ethFundDeposit = _ethFundDeposit;
    prtFundDeposit = _prtFundDeposit;
    fundingStartBlock = _fundingStartBlock;
    fundingEndBlock = _fundingEndBlock;

    totalSupply = prtFund;
    balances[prtFundDeposit] = prtFund; // Deposit internal tokens
    CreatePRT(prtFundDeposit, prtFund);
  }

  // @dev setup crowdsale after pre launch
  function setupCrowdsale (uint256 _fundingStartBlock, uint256 _fundingEndBlock) {
    if (confirmCrowdsale) throw;
    if (msg.sender != ethFundDeposit) throw;
    if (block.number <= fundingEndBlock) throw;
    if (fundingEndBlock >= _fundingStartBlock || _fundingStartBlock >= _fundingEndBlock) throw;
    fundingStartBlock = _fundingStartBlock;
    fundingEndBlock = _fundingEndBlock;
    confirmCrowdsale = true;
  }

  /// @dev Accepts ether and creates new PRT tokens.
  function () payable external {
    if (isFinalized) throw;
    if (block.number < fundingStartBlock) throw;
    if (block.number > fundingEndBlock) throw;
    if (msg.value == 0) throw;

    uint256 tokens = safeMul(msg.value, tokenExchangeRate); // check that we're not over totals
    uint256 checkedSupply = safeAdd(totalSupply, tokens);

    // return money if something goes wrong
    if (tokenCreationCap < checkedSupply) throw;  // odd fractions won't be found

    totalSupply = checkedSupply;
    balances[msg.sender] += tokens;  // safeAdd not needed; bad semantics to use here

    if (totalSupply <= tokenBonusCap) {
      uint256 bonusTokens = safeMul(msg.value, tokenBonus); // calculate bonus
      balances[prtFundDeposit] -= bonusTokens; // give away bonus from reserved fund
      balances[msg.sender] += bonusTokens; // send bonus to sender
      GiveBonus(msg.sender, bonusTokens); // log bonus
    }

    CreatePRT(msg.sender, tokens);  // logs token creation
  }

  /// @dev Ends the funding period and sends the ETH home
  function finalize() external {
    if (isFinalized) throw;
    if (!confirmCrowdsale) throw; // cannot finalize before crowdsale
    if (msg.sender != ethFundDeposit) throw; // locks finalize to the ultimate ETH owner
    if (totalSupply < tokenCreationMin) throw;      // have to sell minimum to move to operational
    if (block.number <= fundingEndBlock && totalSupply != tokenCreationCap) throw;
    // move to operational
    isFinalized = true;
    if (!ethFundDeposit.send(this.balance)) throw;  // send the eth
  }

  /// @dev Allows contributors to recover their ether in the case of a failed funding campaign.
  function refund() external {
    if (isFinalized) throw; // prevents refund if operational
    if (!confirmCrowdsale) throw; // no refund till crowdsale
    if (block.number <= fundingEndBlock) throw; // prevents refund until sale period is over
    if (totalSupply >= tokenCreationMin) throw; // no refunds if we sold enough
    if (msg.sender == prtFundDeposit) throw; // No refund for internal fund

    uint256 prtVal = balances[msg.sender];
    if (prtVal == 0) throw;
    balances[msg.sender] = 0;
    totalSupply = safeSub(totalSupply, prtVal); // reduce total supply by prtVal
    uint256 ethVal = prtVal / (tokenExchangeRate + tokenBonus); // should be safe; previous throws covers edges
    LogRefund(msg.sender, ethVal); // Log refund
    if (!msg.sender.send(ethVal)) {
      throw;  // if you're using a contract; make sure it works with .send gas limits
    }
  }
}
