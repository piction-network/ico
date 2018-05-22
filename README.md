# PIXEL Token Contract

Official PIXEL implementation based on OpenZepplin StandardToken ERC-20 contract.

Please visit [Piction Network](https://piction.network) to get more PIXEL information.

## Requirement
- [truffle](https://github.com/trufflesuite/truffle) (global dependency)
- [zeppelin-solidity](https://github.com/OpenZeppelin/openzeppelin-solidity)
- [truffle-hdwallet-provider-privkey](https://github.com/rhlsthrm/truffle-hdwallet-provider-privkey)
- [dotenv-flow](https://github.com/kerimdzhanov/dotenv-flow)

## Setting

`truffle-hdwallet-provider-privkey` uses wallet's private key to authenticate accounts in ethereum network.
Register developer's wallet address and private key in `.env.<network>` like this.

```javascript
$ cp .env .env.<network>

--- .env.<network> ---
PRIVATE_KEY=<PRIVATE_KEY>
DEVELOPERS_ADDRESS=<DEVELOPERS_ADDRESS>
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
