
require("chai")
    .use(require("chai-as-promised"))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

const TestSale = artifacts.require("TestSale");
const Token = artifacts.require("PXL");

const initialSupply = web3.toBigNumber(web3.toWei(100000));
const maxcap = web3.toBigNumber(web3.toWei(100));
const exceed = web3.toBigNumber(web3.toWei(10));
const minimum = web3.toBigNumber(web3.toWei(0.1));
const rate = web3.toBigNumber(1000);

contract('TestSale', (accounts) => {
  // 
  const owner = accounts[0];
  const wallet = accounts[accounts.length - 1];
  // 
  let token;
  let testsale;
  
  beforeEach("setup contract for each test", async () => {
    token = await Token.new(initialSupply, {from: owner});
    testsale = await TestSale.new(wallet, token.address, {from: owner});

    // register testsale contract to Token Owner
    await token.addOwner(testsale.address);

    // transfer maxcap * rate amount of tokens to testsale account.
    await token.transfer(testsale.address, maxcap.mul(rate), {from: owner});
  });

  // check parameters
  it("should have designated parameters.", async () => {
    let s_maxcap = await testsale.maxcap.call();
    let s_exceed = await testsale.exceed.call();
    let s_minimum = await testsale.minimum.call();
    let s_rate = await testsale.rate.call();

    s_maxcap.should.be.bignumber.equal(maxcap);
    s_exceed.should.be.bignumber.equal(exceed);
    s_minimum.should.be.bignumber.equal(minimum);
    s_rate.should.be.bignumber.equal(rate);
  });

  // Scenario #1
  // Account: 1 -> Account: TestSale (0.01 ether)
  // Expected result: transaction rejected.
  it("should reject invalid (too small) amount of ethers.", () => {
    let buyer = accounts[1];
    let amount = web3.toBigNumber(web3.toWei(0.01));

    expect(async () => {
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyer});
    }).to.be.rejected;
  });

  // Scenario #2
  // Account: 1 -> Account: TestSale (1 ether)
  // Expected Result: TestSale received 1 ether from Account 1
  it("should receive valid amount of ethers.", async () => {
    let buyer = accounts[1];
    let amount = web3.toBigNumber(web3.toWei(1));
    await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyer});

    let weiRaised = await testsale.weiRaised.call();
    weiRaised.should.be.bignumber.equal(amount);
  });

  // Scenario #3
  // Account: 1 -> Account: TestSale (20 ether)
  // Expected Result: only 10 ether (equal to exceed) transferred to TestSale Account
  it("should refund ethers over maximum limit.", async() => {
    let buyer = accounts[1];

    let amount = web3.toWei(20);
    await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyer});

    // only transferred exceed amount of ethers
    let contribution = await testsale.buyers.call(buyer);
    contribution.should.be.bignumber.equal(exceed);

    // only received exceed amount of ethers
    let weiRaised = await testsale.weiRaised.call();
    weiRaised.should.be.bignumber.equal(exceed);
  });

  describe("multiple transactions test from same accounts", () => {
    let buyer = accounts[1];
    let amount1 = web3.toBigNumber(web3.toWei(1));
    let amount2 = web3.toBigNumber(web3.toWei(3));
    let amount3 = web3.toBigNumber(web3.toWei(7));
    let amount4 = web3.toBigNumber(web3.toWei(3));

    // Scenario #4
    // Account: 1 -> Account: TestSale (1 ether)
    // Account: 1 -> Account: TestSale (3 ether)
    // Expected Result: TestSale received 4 ether from Account 1
    it("should receive multiple transactions from same account.", async() => {
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount1, from: buyer});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount2, from: buyer});

      // check transactions applied successfully
      let contribution = await testsale.buyers.call(buyer);
      contribution.should.be.bignumber.equal(amount1.add(amount2));

      // check total ether TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(amount1.add(amount2));
    });

    // Scenario #5
    // Account: 1 -> Account: TestSale (1 ether)
    // Account: 1 -> Account: TestSale (3 ether)
    // Account: 1 -> Account: TestSale (7 ether)
    // Expected Result: 
    // TestSale received 10 ether from Account 1 and then refund rest of it.
    it("should refund rest of it if totalAmount exceeds limit.", async() => {
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount1, from: buyer});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount2, from: buyer});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount3, from: buyer});

      // check transactions applied successfully
      // totalAmount = 1 + 3 + 7 > exceed. TestSale accept only 10 ether and refund rest of it.
      let contribution = await testsale.buyers.call(buyer);
      contribution.should.be.bignumber.equal(exceed);

      // check total ether TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(exceed);
    });

    // Scenario #6  
    // Account: 1 -> Account: TestSale (1 ether)
    // Account: 1 -> Account: TestSale (3 ether)
    // Account: 1 -> Account: TestSale (7 ether)
    // Account: 1 -> Account: TestSale (3 ether)
    // Expected Result: 
    // TestSale received 10 ether from Account 1 and then refund rest of it.
    // After three transaction (already exceed maximum), subsequent transactions are rejected.
    it("should reject transaction if already exceed limits.", async() => {
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount1, from: buyer});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount2, from: buyer});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount3, from: buyer});

      // check total ether TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(exceed);

      expect(async () => {
          await (web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount4, from: buyer}))
      }).to.be.rejected;
    });
  });

  describe("multiple transactions test from multiple accounts", () => {
    // create 15 buyer accounts
    let buyers = accounts.slice(1, 1 + 15);
    let amount = web3.toBigNumber(web3.toWei(10));

    it("should receive multiple transactions from multiple accounts.", async () => {
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyers[0]});
      await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyers[1]});

      // check total ethers TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(amount.mul(2));
    });

    it("should receive only up to maxcap ether.", async () => {
      buyers.forEach(async (buyer) => {
        try { await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount, from: buyer}); }
        catch(error) {}
      });

      // check total ethers TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(maxcap);
    });
  });

  describe("release token after achieving maxcap.", () => {
    let buyers = accounts.slice(1, 1 + 10);
    let amount1 = web3.toBigNumber(web3.toWei(5));
    let amount2 = web3.toBigNumber(web3.toWei(10));

    it("should refund all ethers when cannot meet maxcap.", async () => {
      buyers.forEach(async (buyer) => {
        try { await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount1, from: buyer}); }
        catch(error) {}
      });

      // check total ethers TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(amount1.mul(buyers.length));
      weiRaised.should.be.bignumber.lessThan(maxcap);

      // token release will be rejected before achieving maxcap
      await testsale.release({from: owner}).should.be.rejected;
      // refund raised ethers to buyer
      await testsale.refund({from: owner}).should.be.fulfilled;

      // check testsale ether balance
      let testsaleBalance = await web3.eth.getBalance(testsale.address);
      testsaleBalance.should.be.bignumber.equal(0);

      // withdraw all tokens
      let walletTokenBalance = await token.balanceOf(wallet);
      walletTokenBalance.should.be.bignumber.equal(maxcap.mul(rate));
    });

    it("should release token after achieving maxcap.", async () => {
      let initialWalletBalance = await web3.eth.getBalance(wallet);
      let initialBuyerBalance = buyers.map(async (buyer) => {
        let balance = await web3.eth.getBalance(buyer);
        return balance;
      });

      buyers.forEach(async (buyer) => {
        try { await web3.eth.sendTransaction({gas: 1000000, to: testsale.address, value: amount2, from: buyer}); }
        catch(error) {}
      });

      // check total ethers TestSale received.
      let weiRaised = await testsale.weiRaised.call();
      weiRaised.should.be.bignumber.equal(amount2.mul(buyers.length));
      weiRaised.should.be.bignumber.equal(maxcap);

      // token will be released after achieving maxcap
      await testsale.release({from: owner}).should.be.fulfilled;

      // check testsale ether balance
      let testsaleBalance = await web3.eth.getBalance(testsale.address);
      testsaleBalance.should.be.bignumber.equal(0);

      // check wallet ether balance
      let currentWalletBalance = await web3.eth.getBalance(wallet);
      currentWalletBalance.sub(initialWalletBalance).should.be.bignumber.equal(maxcap);

      // check buyers' token balance
      buyers.forEach(async (buyer) => {
        let balance = await token.balanceOf(buyer);
        balance.should.be.bignumber.equal(amount2.mul(rate));
      });

      let laterBuyerBalance = buyers.map(async (buyer) => {
        let balance = await web3.eth.getBalance(buyer);
        return balance;
      });
    });
  });
});
