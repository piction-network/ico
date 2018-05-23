require('dotenv-flow').config({ default_node_env: 'ropsten' });
var HDWalletProvider = require("truffle-hdwallet-provider-privkey");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(process.env.PRIVATE_KEY, "https://ropsten.infura.io/"),
      network_id: 3,
      gas: 3000000
    }    
  }
};