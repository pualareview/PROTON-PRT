import utils from "./helpers/utils";
import assertThrows from "./helpers/assertThrows";

let MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
let ProtonToken = artifacts.require("./ProtonToken.sol");
let SafeMath = artifacts.require("./SafeMath.sol");

contract('ProtonToken', function(accounts) {
  let wallet;
  let token;
  let owner;
  let startBlock;
  let endBlock;

  beforeEach(async function() {
    let safeMath = await SafeMath.new();
    wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);

    owner = accounts[0];
    startBlock = web3.eth.blockNumber + 1;
    endBlock = startBlock + 10;

    // link safemath
    ProtonToken.link('SafeMath', safeMath.address);

    // token creation
    token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);
  });

  // Before crowdsale
  it('Before crowdsale - create token not allowed before time', async function(){
    startBlock = web3.eth.blockNumber + 10;
    endBlock = startBlock + 20;
    token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);

    assertThrows(token.sendTransaction({from: accounts[5], value: web3.toWei(1, 'ether')}), "Create token not allowed");
  });

  it('Before crowdsale - refund not allowed', async function(){
    startBlock = web3.eth.blockNumber + 10;
    endBlock = startBlock + 20;
    token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);

    assertThrows(token.refund({from: accounts[5]}), "Refund not allowed");
  });

  it('Before crowdsale - finalize not allowed', async function(){
    startBlock = web3.eth.blockNumber + 10;
    endBlock = startBlock + 20;
    token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);

    assertThrows(token.finalize({from: accounts[5]}), "Finalize not allowed");
  });

  it('Before crowdsale - totalsupply, balanceOf', async function(){
    startBlock = web3.eth.blockNumber + 10;
    endBlock = startBlock + 20;
    token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);

    let supply = await token.totalSupply();
    assert.equal(supply.toNumber(), 5500 * 45000 * (10 ** 18));

    let balance = await token.balanceOf(owner);
    assert.equal(balance.toNumber(), 5500 * 45000 * (10 ** 18));

    for (let i = 1; i < accounts.length; i++){
      balance = await token.balanceOf(accounts[i]);
      assert.equal(balance.toNumber(), 0);
    }
  });
});
