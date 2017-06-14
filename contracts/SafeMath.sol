pragma solidity ^0.4.11;

/* Taking ideas from FirstBlood token */
contract SafeMath {
  function safeMul(uint256 a, uint256 b) constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeDiv(uint256 a, uint256 b) constant returns (uint256) {
    // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    return c;
  }

  function safeSub(uint256 a, uint256 b) constant returns (uint256) {
    assert(a >= b);
    return a - b;
  }

  function safeAdd(uint256 a, uint256 b) constant returns (uint256) {
    uint256 c = a + b;
    assert((c >= a) && (c >= b));
    return c;
  }

  function safeMax256(uint256 a, uint256 b)  constant returns (uint256) {
    return a >= b ? a : b;
  }

  function safeMin256(uint256 a, uint256 b)  constant returns (uint256) {
    return a < b ? a : b;
  }
}
