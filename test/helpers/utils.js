module.exports = {
  getFunctionSelector: function(functionSignature) {
    // no spaces
    functionSignature = functionSignature.replace(/ /g, '');
    return web3.sha3(functionSignature).slice(0, 10);
  },

  getFunctionEncoding: function(functionSignature, args) {
    let selector = this.getFunctionSelector(functionSignature);
    let argString = '';
    for (let i = 0; i < args.length; i++) {
      let paddedArg = web3.toHex(args[i]).slice(2);
      while (paddedArg.length % 64 != 0) {
        paddedArg = '0' + paddedArg;
      }
      argString = argString + paddedArg;
    }
    return selector + argString;
  },
}
