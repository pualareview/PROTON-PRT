import utils from "./helpers/utils";
import assertThrows from "./helpers/assertThrows";

let MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
let ProtonToken = artifacts.require("./ProtonToken.sol");
let SafeMath = artifacts.require("./SafeMath.sol");

contract('MultiSigWallet', function(accounts){
  it('allows ownership changes', async function(){
    let originalOwners = accounts.slice(0, 4);
    let wallet = await MultiSigWallet.new(originalOwners, 1);
    let owners = await wallet.getOwners();

    assert.deepEqual(owners, originalOwners);

    let functionData = utils.getFunctionEncoding('addOwner(address)',[accounts[4]]);
    let addOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, functionData);
    assert.equal(addOwnerReceipt.logs.length, 4);
    assert.equal(addOwnerReceipt.logs[0].event,'Submission');
    assert.equal(addOwnerReceipt.logs[1].event,'Confirmation');
    assert.equal(addOwnerReceipt.logs[2].event,'OwnerAddition');
    assert.equal(addOwnerReceipt.logs[3].event,'Execution');

    owners = await wallet.getOwners();
    assert.deepEqual(owners, accounts.slice(0,5));

    functionData = utils.getFunctionEncoding('removeOwner(address)',[accounts[4]]);
    let removeOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, functionData);
    assert.equal(removeOwnerReceipt.logs.length, 4);
    assert.equal(removeOwnerReceipt.logs[0].event,'Submission');
    assert.equal(removeOwnerReceipt.logs[1].event,'Confirmation');
    assert.equal(removeOwnerReceipt.logs[2].event,'OwnerRemoval');
    assert.equal(removeOwnerReceipt.logs[3].event,'Execution');

    owners = await wallet.getOwners();
    assert.deepEqual(owners, accounts.slice(0,4));
  });

  it('requires multiple confirmations', async function(){
    let originalOwners = accounts.slice(0, 4);

    let wallet = await MultiSigWallet.new(originalOwners, 2);

    let functionData = utils.getFunctionEncoding('addOwner(address)',[accounts[4]]);
    let addOwnerReceipt = await wallet.submitTransaction(wallet.address, 0, functionData);

    assert.equal(addOwnerReceipt.logs.length, 2);
    assert.equal(addOwnerReceipt.logs[0].event, 'Submission');
    assert.equal(addOwnerReceipt.logs[1].event, 'Confirmation');
    assert.equal(addOwnerReceipt.logs[1].args.sender, accounts[0]);

    let txid = addOwnerReceipt.logs[1].args.transactionId.toNumber();
    let confs = await wallet.getConfirmations(txid);
    let numConfs = await wallet.getConfirmationCount(txid);

    assert.equal(confs.length, 1);
    assert.equal(confs.length, numConfs);

    let revokeReceipt = await wallet.revokeConfirmation(txid);
    assert.equal(revokeReceipt.logs.length, 1);
    assert.equal(revokeReceipt.logs[0].event,'Revocation');

    confs = await wallet.getConfirmations(txid);
    assert.equal(confs.length, 0, "Confirmation count should be 0");

    let transactionCount = await wallet.getTransactionCount(true, false);
    assert.equal(transactionCount, 1, "Transaction count should be 1");

    let transactionIds = await wallet.getTransactionIds(0, 1, true, false);
    assert.equal(transactionIds.length, 1, "Pending transaction length should be 1");
    assert.equal(transactionIds[0].toNumber(), txid, "Pending transaction id should be txid");

    let confirmReceipt = await wallet.confirmTransaction(txid, {from: accounts[1]});
    assert.equal(confirmReceipt.logs.length, 1, "Confirm transaction function result should have total 1 log");
    assert.equal(confirmReceipt.logs[0].event, 'Confirmation', "Confirm transaction function result should have confirmation log");

    confs = await wallet.getConfirmations(txid);
    assert.equal(confs.length, 1, "Confirmation count should be 1 after one confirmation");

    let confirmed = await wallet.isConfirmed(txid);
    assert.equal(confirmed, false, "Transaction should be confirmed yet - need 2 confirmation");

    numConfs = await wallet.getConfirmationCount(txid);
    assert.equal(numConfs, 1);

    confirmReceipt = await wallet.confirmTransaction(txid, {from: accounts[2]});
    assert.equal(confirmReceipt.logs.length, 3);
    assert.equal(confirmReceipt.logs[0].event,'Confirmation');
    assert.equal(confirmReceipt.logs[1].event,'OwnerAddition');
    assert.equal(confirmReceipt.logs[2].event,'Execution');

    numConfs = await wallet.getConfirmationCount(txid);
    assert.equal(numConfs, 2);

    transactionCount = await wallet.getTransactionCount(false, true);
    assert.equal(transactionCount, 1);

    confirmed = await wallet.isConfirmed(txid);
    assert.equal(confirmed, true);

    assertThrows(wallet.revokeConfirmation(txid), 'expected revokeConfirmation to fail');
  });

  it('allows change of requirements', async function(){
    let originalOwners = accounts.slice(0,4);
    let wallet = await MultiSigWallet.new(originalOwners, 2);

    let functionData = utils.getFunctionEncoding('changeRequirement(uint256)', [3]);
    let receipt = await wallet.submitTransaction(wallet.address, 0, functionData, { from: accounts[0] });
    let txid = receipt.logs[0].args.transactionId.toNumber();

    assert.equal(receipt.logs.length, 2);
    assert.equal(receipt.logs[0].event,'Submission');
    assert.equal(receipt.logs[1].event,'Confirmation');

    receipt = await wallet.confirmTransaction(txid, { from: accounts[1] });
    assert.equal(receipt.logs.length, 3);
    assert.equal(receipt.logs[0].event,'Confirmation');
    assert.equal(receipt.logs[1].event,'RequirementChange');
    assert.equal(receipt.logs[2].event,'Execution');

    functionData = utils.getFunctionEncoding('addOwner(address)', [accounts[4]]);
    receipt = await wallet.submitTransaction(wallet.address, 0, functionData, { from: accounts[0]});
    txid = receipt.logs[0].args.transactionId.toNumber();
    assert.equal(receipt.logs.length, 2);
    assert.equal(receipt.logs[0].event,'Submission');
    assert.equal(receipt.logs[1].event,'Confirmation');

    receipt = await wallet.confirmTransaction(txid, { from: accounts[1] });
    assert.equal(receipt.logs.length, 1);
    assert.equal(receipt.logs[0].event,'Confirmation');

    receipt = await wallet.confirmTransaction(txid, { from: accounts[2] });
    assert.equal(receipt.logs.length, 3);
    assert.equal(receipt.logs[0].event,'Confirmation');
    assert.equal(receipt.logs[1].event,'OwnerAddition');
    assert.equal(receipt.logs[2].event,'Execution');

    let numConfs = await wallet.getConfirmationCount(txid);
    assert.equal(numConfs, 3);
    let owners = await wallet.getOwners();
  });

  it('interact with crowdfund using token contract', async function(){
    let safeMath = await SafeMath.new();
    let wallet = await MultiSigWallet.new(accounts.slice(0, 5), 2);
    const upgradeMaster = accounts[0];
    const startBlock = web3.eth.blockNumber + 1;
    const endBlock = startBlock + 10;

    // link safemath
    ProtonToken.link('SafeMath', safeMath.address);
    let token = await ProtonToken.new(wallet.address, upgradeMaster, startBlock, endBlock);
    let tokenAddress = token.address;

    // Get some token
    let tokenReceipt = await token.sendTransaction({from: accounts[5], value: web3.toWei(1, 'ether')});
    assert.equal(tokenReceipt.logs[0].args._to, accounts[5]);
    assert.equal(tokenReceipt.logs[0].args._value, 5500 * (10 ** 18));

    let balance = await token.balanceOf(accounts[5]);
    assert.equal(balance.toNumber(), 5500 * (10 ** 18));

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
  });
});
