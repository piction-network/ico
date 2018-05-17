const env = require("./env");
var HDWalletProvider = require("truffle-hdwallet-provider-privkey");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    testnet_token: {
      provider: new HDWalletProvider(env.testnet.privateKey, "https://ropsten.infura.io/"),
      network_id: 3,
      gas: 3000000
    },
    mainnet_token: {
      provider: new HDWalletProvider(env.mainnet.privateKey, "https://ropsten.infura.io/"),
      network_id: 3,
      gas: 3000000
    },
  }
};