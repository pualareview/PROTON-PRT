pragma solidity ^0.4.11;

/* Taking ideas from FirstBlood token */
library SafeMath {
  function mul(uint256 a, uint256 b) constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) constant returns (uint256) {
    // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    return c;
  }

  function sub(uint256 a, uint256 b) constant returns (uint256) {
    assert(a >= b);
    return a - b;
  }

  function add(uint256 a, uint256 b) constant returns (uint256) {
    uint256 c = a + b;
    assert((c >= a) && (c >= b));
    return c;
  }

  function max256(uint256 a, uint256 b)  constant returns (uint256) {
    return a >= b ? a : b;
  }

  function min256(uint256 a, uint256 b)  constant returns (uint256) {
    return a < b ? a : b;
  }
}
