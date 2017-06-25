var ProtonToken = artifacts.require("./ProtonToken.sol");
var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");

module.exports = function(deployer, network) {
  let accounts = web3.eth.accounts;

  // deploy multisig wallet
  deployer.deploy(MultiSigWallet, accounts.slice(0, 2), 2).then(()=>{
      const startBlock = web3.eth.blockNumber + 10;
      const endBlock = startBlock + (10 * 4); // 1 day = 5760 blocks, 1 minute = 4 blocks

      // deploy proton token contract
      deployer.deploy(ProtonToken, MultiSigWallet.address, accounts[0], startBlock, endBlock);
  });
};
