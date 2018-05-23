const { ether } = require("./helpers/ether");
var PXLG = artifacts.require("PXLG");

const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

contract('PXLG', function (accounts) {
  const owner = accounts[0];

  const decimals = Math.pow(10, 18);
  const initialBalance = 10000 * decimals;
  const sendPXLG = 3000 * decimals;
  const mintPXLG = 5000 * decimals;
  const burnPXLG = 4000 * decimals;

  let token;

  beforeEach("Setup contract for each test", async () => {
    token = await PXLG.new(initialBalance, { from: owner });
  });

  it("Check Initial balance in Owner account.", async () => {
    const balance = await token.balanceOf.call(owner);
    console.log("Owner address :", owner);
    balance.should.be.bignumber.equal(initialBalance);
  });

  it("Shouldn't be receive Ether in contract.", async () => {
    const amount = ether(1);

    expect(async () => {
      await web3.eth.sendTransaction({ gas: 1000000, to: token.address, value: amount, from: accounts[1] })
    }).to.be.rejected;
  });

  describe('Transfer', () => {
    it("Shouldn't be transferable when contract was locked.", async () => {
      const senderAccount = accounts[1];
      const receiverAccount = accounts[2];

      await token.transfer(senderAccount, sendPXLG, { from: owner });
      await token.transfer(receiverAccount, sendPXLG, { from: senderAccount }).should.be.rejectedWith(Error);
    });

    it("Should be transferable if sender has ownership when contract was locked.", async () => {
        const senderAccount = owner;
        const receiverAccount = accounts[2];

        const beforeSenderBalance = await token.balanceOf.call(senderAccount);
        const beforeReceiverBalance = await token.balanceOf.call(receiverAccount);
        await token.transfer(receiverAccount, sendPXLG, { from: senderAccount }).should.be.fulfilled;
        const afterSenderBalance = await token.balanceOf.call(senderAccount);
        const afterReceiverBalance = await token.balanceOf.call(receiverAccount);

        afterReceiverBalance.minus(beforeReceiverBalance).should.be.bignumber.equal(sendPXLG);
        beforeSenderBalance.minus(afterSenderBalance).should.be.bignumber.equal(sendPXLG);
    });

    it("Should be transferable when contract was unlocked.", async () => {
      const senderAccount = accounts[1];
      const receiverAccount = accounts[2];

      await token.transfer(senderAccount, sendPXLG, { from: owner }).should.be.fulfilled;
      await token.unlock({ from: owner }).should.be.fulfilled;

      const beforeSenderBalance = await token.balanceOf.call(senderAccount);
      const beforeReceiverBalance = await token.balanceOf.call(receiverAccount);
      await token.transfer(receiverAccount, sendPXLG, { from: senderAccount }).should.be.fulfilled;
      const afterSenderBalance = await token.balanceOf.call(senderAccount);
      const afterReceiverBalance = await token.balanceOf.call(receiverAccount);

      afterReceiverBalance.minus(beforeReceiverBalance).should.be.bignumber.equal(sendPXLG);
      beforeSenderBalance.minus(afterSenderBalance).should.be.bignumber.equal(sendPXLG);
    });
  });

  describe('Mint', () => {
    it("Shouldn't be minted who isn't not the owner.", async () => {
        const sendAccount = accounts[1];

        await token.mint(owner, mintPXLG, { from: sendAccount }).should.be.rejected;
    });

    it("Should be able to minted by owner.", async () => {
        const beforeBalance = await token.balanceOf.call(owner);
        await token.mint(owner, mintPXLG, { from: owner });
        const afterBalance = await token.balanceOf.call(owner);

        afterBalance.minus(beforeBalance).should.be.bignumber.equal(mintPXLG);
    });
  });

  describe('Burn', () => {
    it("Shouldn't be burnt by another account who isn't not the owner.", async () => {
      const senderAccount = accounts[1];

      await token.burn(burnPXLG, { from: senderAccount }).should.be.rejectedWith(Error);
    });

    it("Shouldn't burnt more than the owner has.", async () => {
      const ownerAmount = await token.balanceOf.call(owner);
      const burnAmount = ownerAmount.add(initialBalance);
      await token.burn(burnAmount, { from: owner }).should.be.rejectedWith(Error);
    });

    it("Should be able to burn by owner.", async () => {
      const beforeBalance = await token.balanceOf.call(owner);
      await token.burn(initialBalance, { from: owner }).should.be.fulfilled;
      const afterBalance = await token.balanceOf.call(owner);

      beforeBalance.minus(afterBalance).should.be.bignumber.equal(initialBalance);
    });
  });
});
