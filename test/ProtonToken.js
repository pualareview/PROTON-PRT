import utils from "./helpers/utils";
import assertThrows from "./helpers/assertThrows";

let MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
let ProtonToken = artifacts.require("./ProtonToken.sol");

contract('ProtonToken', function(accounts) {
  const PRT_RATIO = 5500;

  describe('Before crowdsale', async function() {
    let wallet;
    let token;
    let owner;
    let startBlock;
    let endBlock;

    beforeEach(async function() {
      wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);

      owner = accounts[0];
      startBlock = web3.eth.blockNumber + 10;
      endBlock = startBlock + 20;

      // token creation
      token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);
    });

    // Before crowdsale
    it('Create token not allowed before time', async function(){
      assertThrows(token.sendTransaction({from: accounts[5], value: web3.toWei(1, 'ether')}), "Create token not allowed");
    });

    it('Refund not allowed', async function(){
      assertThrows(token.refund({from: accounts[5]}), "Refund not allowed");
    });

    it('Finalize not allowed from any account', async function(){
      assertThrows(token.finalize({from: accounts[5]}), "Finalize not allowed from any account");
    });

    it('Check totalsupply, balanceOf', async function(){
      let supply = await token.totalSupply();
      assert.equal(supply.toNumber(), PRT_RATIO * 5 * (10 ** 18));

      let balance = await token.balanceOf(owner);
      assert.equal(balance.toNumber(), PRT_RATIO * 5 * (10 ** 18));

      for (let i = 1; i < accounts.length; i++){
        balance = await token.balanceOf(accounts[i]);
        assert.equal(balance.toNumber(), 0);
      }
    });
  });

  describe('Finalize crowdsale', async function() {
    let wallet;
    let token;
    let owner;
    let startBlock;
    let endBlock;

    beforeEach(async function(){
      wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);

      owner = accounts[0];
      startBlock = web3.eth.blockNumber + 1;
      endBlock = startBlock + 10;

      // token creation
      token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);
    });

    it('Finalize - successful', async function() {
      // Get some token
      let tokenReceipt = await token.sendTransaction({from: accounts[5], value: web3.toWei(1, 'ether')});
      assert.equal(tokenReceipt.logs[0].args._to, accounts[5]);
      assert.equal(tokenReceipt.logs[0].args._value.toNumber(), PRT_RATIO * (10 ** 18));

      let prtBalance = await token.balanceOf(accounts[5]);
      assert.equal(prtBalance.toNumber(), PRT_RATIO * (10 ** 18));

      let supply = await token.totalSupply();
      assert.equal(supply.toNumber(), 6 * PRT_RATIO * (10 ** 18));

      // check token balance
      let tokenEtherBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether')
      assert.equal(tokenEtherBalance.toNumber(), 1, "Token contract should have 1 ether");

      // mine
      utils.mineToBlockHeight(endBlock + 1);

      let functionData = utils.getFunctionEncoding('finalize()', []);
      let receipt = await wallet.submitTransaction(token.address, 0, functionData, { from: accounts[0] });

      let txid = receipt.logs[0].args.transactionId.toNumber();
      assert.equal(receipt.logs.length, 2);
      assert.equal(receipt.logs[0].event,'Submission');
      assert.equal(receipt.logs[1].event,'Confirmation');

      receipt = await wallet.confirmTransaction(txid, { from: accounts[2] });
      assert.equal(receipt.logs.length, 3);
      assert.equal(receipt.logs[0].event,'Confirmation');
      assert.equal(receipt.logs[1].event,'Deposit');
      assert.equal(receipt.logs[2].event,'Execution');

      // check token balance
      let fundBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether');
      assert.equal(fundBalance.toNumber(), 0, "Token should have 0 ether");

      // check wallet balance
      fundBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(fundBalance.toNumber(), 1, "Wallet should have 1 ether");
    });

    it('Finalize - failed', async function() {
      // Get some token
      let tokenReceipt = await token.sendTransaction({from: accounts[5], value: web3.toWei(0.5, 'ether')});
      assert.equal(tokenReceipt.logs[0].args._to, accounts[5]);
      assert.equal(tokenReceipt.logs[0].args._value.toNumber(), 0.5 * PRT_RATIO * (10 ** 18));

      let balance = await token.balanceOf(accounts[5]);
      assert.equal(balance.toNumber(), 0.5 * PRT_RATIO * (10 ** 18));

      // check token balance
      let fundBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether');
      assert.equal(fundBalance.toNumber(), 0.5, "Token contract should have 0.5 ether");

      let supply = await token.totalSupply();
      assert.equal(supply.toNumber(), 5.5 * PRT_RATIO * (10 ** 18));

      // mine
      utils.mineToBlockHeight(endBlock + 1);

      let functionData = utils.getFunctionEncoding('finalize()', []);
      let receipt = await wallet.submitTransaction(token.address, 0, functionData, { from: accounts[0] });

      let txid = receipt.logs[0].args.transactionId.toNumber();
      assert.equal(receipt.logs.length, 2);
      assert.equal(receipt.logs[0].event,'Submission');
      assert.equal(receipt.logs[1].event,'Confirmation');

      receipt = await wallet.confirmTransaction(txid, { from: accounts[2] });
      assert.equal(receipt.logs.length, 2);
      assert.equal(receipt.logs[0].event,'Confirmation');
      assert.equal(receipt.logs[1].event,'ExecutionFailure');

      // check token balance
      fundBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether');
      assert.equal(fundBalance.toNumber(), 0.5, "Token should have 0.5 ether");

      // check wallet balance
      fundBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(fundBalance.toNumber(), 0, "Wallet should have 0 ether");
    });
  });

  describe('After failed crowdsale', async function() {
    let wallet;
    let token;
    let owner;
    let startBlock;
    let endBlock;

    before(async function() {
      wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);

      owner = accounts[0];
      startBlock = web3.eth.blockNumber + 1;
      endBlock = startBlock + 10;

      // token creation
      token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);
      // Get some token
      await token.sendTransaction({from: accounts[5], value: web3.toWei(0.5, 'ether')});
      // mine
      utils.mineToBlockHeight(endBlock + 1);
      // finalize
      let functionData = utils.getFunctionEncoding('finalize()', []);
      let receipt = await wallet.submitTransaction(token.address, 0, functionData, { from: accounts[0] });
      let txid = receipt.logs[0].args.transactionId.toNumber();
      await wallet.confirmTransaction(txid, { from: accounts[2] });
    });

    it('Check totalsupply, balanceOf', async function(){
      let supply = await token.totalSupply();
      assert.equal(supply.toNumber(), PRT_RATIO * 5.5 * (10 ** 18));

      let balance = await token.balanceOf(owner);
      assert.equal(balance.toNumber(), PRT_RATIO * 5 * (10 ** 18));

      balance = await token.balanceOf(accounts[5]);
      assert.equal(balance.toNumber(), PRT_RATIO * 0.5 * (10 ** 18));

      accounts.slice(6).forEach(async (account)=>{
        balance = await token.balanceOf(account);
        assert.equal(balance.toNumber(), 0);
      });
    });

    it('Create token not allowed', async function(){
      assertThrows(token.sendTransaction({from: accounts[7], value: web3.toWei(1, 'ether')}), "Create token not allowed");
    });

    it('Refund', async function(){
      let accountEtherBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');

      let tokenEtherBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether');
      assert.equal(tokenEtherBalance.toNumber(), 0.5, "Token should have 0.5 ether");

      let walletEtherBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(walletEtherBalance.toNumber(), 0, "Wallet should have 0 ether");

      let prtBalance = await token.balanceOf(accounts[5]);
      assert.equal(prtBalance.toNumber(), PRT_RATIO * 0.5 * (10 ** 18), "Account will have some PRT balance");

      // Get refund
      let receipt = await token.refund({from: accounts[5]});
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'LogRefund');

      tokenEtherBalance = web3.fromWei(web3.eth.getBalance(token.address), 'ether');
      assert.equal(tokenEtherBalance.toNumber(), 0, "Token should have 0 ether");

      walletEtherBalance = web3.fromWei(web3.eth.getBalance(wallet.address), 'ether');
      assert.equal(walletEtherBalance.toNumber(), 0, "Wallet should have 0 ether");

      let accountNewEtherBalance = web3.fromWei(web3.eth.getBalance(accounts[5]), 'ether');
      assert.equal(accountNewEtherBalance.toNumber() > accountEtherBalance.toNumber(), true, "Account will have its 0.5 (minus gas) ether back");

      prtBalance = await token.balanceOf(accounts[5]);
      assert.equal(prtBalance.toNumber(), 0, "Account will have some 0 PRT balance");
    });

    it('Refund not allowed again', async function(){
      assertThrows(token.refund({from: accounts[5]}), "Refund should not allowed again");
    });

    it('Refund from non-investor not allowed', async function(){
      assertThrows(token.refund({from: accounts[6]}), "Refund from non-investor should fail");
    });

    it('Finalize from other account not allowed', async function(){
      assertThrows(token.finalize({from: accounts[5]}), "Finalize not allowed from any account");
    });
  });

  describe('After successful crowdsale', async function() {
    let wallet;
    let token;
    let owner;
    let startBlock;
    let endBlock;

    before(async function() {
      wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);

      owner = accounts[0];
      startBlock = web3.eth.blockNumber + 1;
      endBlock = startBlock + 10;

      // token creation
      token = await ProtonToken.new(wallet.address, owner, startBlock, endBlock);
      // Get some token
      await token.sendTransaction({from: accounts[5], value: web3.toWei(1, 'ether')});
      // Get some token
      await token.sendTransaction({from: accounts[6], value: web3.toWei(2, 'ether')});
      // mine
      utils.mineToBlockHeight(endBlock + 1);
      // finalize
      let functionData = utils.getFunctionEncoding('finalize()', []);
      let receipt = await wallet.submitTransaction(token.address, 0, functionData, { from: accounts[0] });
      let txid = receipt.logs[0].args.transactionId.toNumber();
      await wallet.confirmTransaction(txid, { from: accounts[2] });
    });

    it('Check totalsupply, balanceOf', async function(){
      let supply = await token.totalSupply();
      assert.equal(supply.toNumber(), PRT_RATIO * 8 * (10 ** 18));

      let balance = await token.balanceOf(owner);
      assert.equal(balance.toNumber(), PRT_RATIO * 5 * (10 ** 18));

      balance = await token.balanceOf(accounts[5]);
      assert.equal(balance.toNumber(), PRT_RATIO * 1 * (10 ** 18));

      balance = await token.balanceOf(accounts[6]);
      assert.equal(balance.toNumber(), PRT_RATIO * 2 * (10 ** 18));

      accounts.slice(7).forEach(async (account)=>{
        balance = await token.balanceOf(account);
        assert.equal(balance.toNumber(), 0);
      });
    });

    it('Create token not allowed', async function(){
      assertThrows(token.sendTransaction({from: accounts[7], value: web3.toWei(1, 'ether')}), "Create token not allowed");
    });

    it('Refund not allowed', async function(){
      assertThrows(token.refund({from: accounts[5]}), "Refund not allowed");
    });

    it('Finalize from other account not allowed', async function(){
      assertThrows(token.finalize({from: accounts[5]}), "Finalize not allowed from any account");
    });
  });
});
