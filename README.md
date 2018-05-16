
# PIXEL

Official PIXL implementation based on OpenZepplin StandardToken ERC-20 contract.

Please visit [Piction Network](https://piction.network) to get more PIXEL information.

## Requirement
- [truffle](https://github.com/trufflesuite/truffle) (global dependency)
- [zeppelin-solidity](https://github.com/OpenZeppelin/openzeppelin-solidity)
- [truffle-hdwallet-provider-privkey](https://github.com/rhlsthrm/truffle-hdwallet-provider-privkey)

## Setting

`truffle-hdwallet-provider-privkey` uses wallet's private key to authenticate accounts in ethereum network.
Register developer's wallet address and private key in `env.js` like this.

```javascript
module.exports = Object.freeze({
  testnet: {
    privateKey: '4224a7...',
    developersAddress: '0xE6b7...'
  },
  mainnet: {
   privateKey: '4224a...',
   developersAddress: '0xE6b7...'
  }
});
```

## Install 

```
$ npm install -g truffle
$ npm install // install node_modules in package.json
```

## Compile

```
$ truffle compile
```

## Deploy
- Deploy on local envirnoment 
```
$ truffle migrate --network development --reset
```
- Deploy on ropsten testnet
```
$ truffle migrate --network testnet_token --reset
```
- Deploy on mainnet
```
$ truffle migrate --network mainnet_token
```

## Test

## License

PIXEL is available under the MIT license. See the LICENSE file for more info.
