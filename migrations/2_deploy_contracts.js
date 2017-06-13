var SafeMath = artifacts.require("./SafeMath.sol");
var ProtonToken = artifacts.require("./ProtonToken.sol");
var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, ProtonToken);
  // deployer.deploy(MultiSigWallet);
  // deployer.deploy(ProtonToken);
};
