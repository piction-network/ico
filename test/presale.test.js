const { ether } = require("./helpers/ether");

const Whitelist = artifacts.require("Whitelist");
var PXLG = artifacts.require("PXLG");
var SALE = artifacts.require("Presale");

const BigNumber = web3.BigNumber;

require("chai")
    .use(require("chai-as-promised"))
    .use(require("chai-bignumber")(BigNumber))
    .should();

contract("PRESALE", function (accounts) {
    const owner = accounts[0];
    const wallet = accounts[1];
    const unregistedBuyer = accounts[2];
    const buyers = accounts.slice(3, 8);
    const testAccount = accounts[7];

    const maxcap = 50;
    const minimum = 1;
    const exceed = 20;
    const rate = 1000;

    const decimals = Math.pow(10, 18);
    const initialBalance = new BigNumber(50000 * decimals);

    let whitelist;
    let token;
    let sale;

    beforeEach("Setup contract for each test", async () => {
        whitelist = await Whitelist.new({ from: owner });
        await whitelist.addAddressesToWhitelist(
            buyers,
            { from: owner }
        ).should.be.fulfilled;

        token = await PXLG.new(initialBalance, { from: owner });
        sale = await SALE.new(
          ether(maxcap),
          ether(exceed),
          ether(minimum),
          rate,
          wallet,
          whitelist.address,
          token.address,
          { from: owner }
        );

        await token.addOwner(sale.address, { from: owner });
        await token.transfer(sale.address, initialBalance, { from: owner });
    });

    describe("initialized", () => {
        it("Check Initial balance in Owner account.", async () => {
            const balance = await token.balanceOf.call(sale.address);
            console.log("Owner address :", owner);
            balance.should.be.bignumber.equal(initialBalance);
        });
    });

    describe("collect", () => {
        const gas = 100000;
        const txFee = gas * web3.eth.gasPrice;

        beforeEach(async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
        });

        it("Unregisted buyer in whitelist can't buy tokens.", async () => {
            try { await web3.eth.sendTransaction({ gas: gas, to: sale.address, value: ether(1), from: unregistedBuyer }); }
            catch(error) {}

            let balance = await sale.buyers.call(unregistedBuyer);
            balance.should.be.bignumber.equal(0);
        });

        it("Buyer can get refund when over maxcap.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(9), from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(7), from: testAccount, gas: gas, gasPrice: web3.eth.gasPrice }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            console.log("before: ", before.toNumber());
            console.log("after: ", after.toNumber());
            before.minus(after).should.be.bignumber.above(ether(2));
        });

        it("Buyer can't buy tokens when under minimum.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(0.5), from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                catch(error) {}
            });

            buyers.forEach(async (buyer) => {
                let balance = await sale.buyers.call(buyer);
                balance.should.be.bignumber.equal(0);
            });
        });

        it("Buyer can't buy tokens when over exceed.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(6), from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(15), from: testAccount, gas: gas, gasPrice: web3.eth.gasPrice }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            const testBalance = await sale.buyers.call(testAccount);

            console.log("before: ", before.toNumber());
            console.log("after: ", after.toNumber());
            console.log("testBalance: ", testBalance.toNumber());

            testBalance.should.be.bignumber.equal(ether(20));
            before.sub(ether(7)).should.be.bignumber.below(ether(1) + txFee);
        });

        it("Buyer can buy tokens when over minimum and under maxcap.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: testAccount, gas: gas, gasPrice: web3.eth.gasPrice }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            const testBalance = await sale.buyers.call(testAccount);

            console.log("before: ", before.toNumber());
            console.log("after: ", after.toNumber());
            console.log("testBalance: ", testBalance.toNumber());

            testBalance.should.be.bignumber.equal(ether(10));
            before.sub(after).should.be.bignumber.below(ether(5) + txFee);
        });
    });

    describe("wallet", () => {
        it("Shouldn't be changed the wallet by nonownership user.", async () => {
            await sale.setWallet(testAccount, { from: unregistedBuyer }).should.be.rejected;
        });

        it("Should be changed the wallet by owner.", async () => {
            const before = await sale.wallet.call();
            await sale.setWallet(testAccount, { from: owner }).should.be.fulfilled;
            const after = await sale.wallet.call();
            console.log("before: ", before);
            console.log("after: ", after);
            after.should.not.be.equal(before);
            after.should.be.equal(testAccount);
        });
    });

    describe("change address", () => {
        const gas = 100000;

        beforeEach(async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
        });

        it("Shouldn't be changed the whitelist by nonownership user.", async () => {
            const list = await Whitelist.new({ from: unregistedBuyer });
            await sale.setWhitelist(list.address, { from: unregistedBuyer }).should.be.rejected;
        });

        it("Shouldn't be changed the address in whitelist by nonownership user.", async () => {
            await sale.buyerAddressTransfer(testAccount, unregistedBuyer, { from: unregistedBuyer }).should.be.rejected;
        });

        it("Should be changed the whitelist by owner.", async () => {
            const before = await sale.whiteList.call();
            const list = await Whitelist.new({ from: owner });
            await list.addAddressToWhitelist(unregistedBuyer, { from: owner });
            await sale.setWhitelist(list.address, { from: owner }).should.be.fulfilled;
            const after = await sale.whiteList.call();
            console.log("before: ", before);
            console.log("after: ", after);
            after.should.not.be.equal(before);
            after.should.be.equal(list.address);
        });

        it("Should be changed the address in whitelist by owner.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                catch(error) {}
            });

            const list = await Whitelist.new({ from: owner });
            await list.addAddressesToWhitelist(buyers, { from: owner });
            await list.addAddressToWhitelist(unregistedBuyer, { from: owner });
            await sale.setWhitelist(list.address, { from: owner }).should.be.fulfilled;

            const beforeOldBalance = await sale.buyers.call(testAccount);
            const beforeNewBalance = await sale.buyers.call(unregistedBuyer);
            console.log("beforeOldBalance: ", beforeOldBalance.toNumber());
            console.log("beforeNewBalance: ", beforeNewBalance.toNumber());
            await sale.buyerAddressTransfer(testAccount, unregistedBuyer, { from: owner }).should.be.fulfilled;

            const afterOldBalance = await sale.buyers.call(testAccount);
            const afterNewBalance = await sale.buyers.call(unregistedBuyer);
            console.log("afterOldBalance: ", afterOldBalance.toNumber());
            console.log("afterNewBalance: ", afterNewBalance.toNumber());

            beforeOldBalance.should.be.bignumber.equal(afterNewBalance);
        });
    });

    describe("change state", () => {
        it("Shouldn't be changed state by nonownership user.", async () => {
            await sale.complete({ from: unregistedBuyer }).should.be.rejected;
        });

        it("Owner must be able to pause/start.", async () => {
            let state;
            let stateValue;

            await sale.pause({ from: owner }).should.be.fulfilled;
            state = await sale.getState().should.be.fulfilled;
            stateValue = await sale.getKeyByValue(state).should.be.fulfilled;
            console.log("state: ", stateValue);
            stateValue.should.be.equal("Pausing");

            await sale.start({ from: owner }).should.be.fulfilled;
            state = await sale.getState().should.be.fulfilled;
            stateValue = await sale.getKeyByValue(state).should.be.fulfilled;
            console.log("state: ", stateValue);
            stateValue.should.be.equal("Starting");
        });

        it("Owner must be able to start/complete.", async () => {
            let state;
            let stateValue;

            await sale.start({ from: owner }).should.be.fulfilled;
            state = await sale.getState().should.be.fulfilled;
            stateValue = await sale.getKeyByValue(state).should.be.fulfilled;
            console.log("state: ", stateValue);
            stateValue.should.be.equal("Starting");

            await sale.complete({ from: owner }).should.be.fulfilled;
            state = await sale.getState().should.be.fulfilled;
            stateValue = await sale.getKeyByValue(state).should.be.fulfilled;
            console.log("state: ", stateValue);
            stateValue.should.be.equal("Completed");
        });
    });

    describe("ownership", () => {
        describe("whitelist", () => {
            let newWhitelist;
            beforeEach(async () => { newWhitelist = await Whitelist.new({ from: owner }); });

            it("Should be changed by owner.", async () => {
                await sale
                    .setWhitelist(newWhitelist.address, { from: owner })
                    .should.be.fulfilled;
            });

            it("Should not be changed by nonownership user.", async () => {
                await sale
                    .setWhitelist(newWhitelist.address, { from: testAccount })
                    .should.be.rejected;
            });
        });

        describe("wallet", () => {
            let newWallet = accounts[8];

            it("Should be changed by owner.", async () => {
                await sale
                    .setWallet(newWallet, { from: owner })
                    .should.be.fulfilled;
            });

            it("Should not be changed by nonownership user.", async () => {
                await sale
                    .setWallet(newWallet, { from: testAccount })
                    .should.be.rejected;
            });
        });

        describe("finalize", () => {
            beforeEach(async () => {
                await sale.complete({ from: owner });
            });

            it("Could be finalized by owner.", async () => {
                await sale
                    .finalize({ from: owner })
                    .should.be.fulfilled;
            });

            it("Could not be finalized by nonownership user.", async () => {
                await sale
                    .finalize({ from: testAccount })
                    .should.be.rejected;
            });
        });
    });

    describe("finalize", () => {
        it("Could not be finalized when contract state is starting.", async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
            await sale.finalize({ from: owner }).should.be.rejected;
        });

        it("Could be finalized when contract state is completed.", async () => {
            const amount = ether(5);
            const beforeBalance = await web3.eth.getBalance(wallet);
            await sale.start({ from: owner }).should.be.fulfilled;
            await web3.eth.sendTransaction({ gas: 100000, to: sale.address, value: amount, from: testAccount });
            await sale.complete({ from: owner }).should.be.fulfilled;
            await sale.release(buyers, { from: owner }).should.be.fulfilled;

            await sale.finalize({ from: owner }).should.be.fulfilled;

            // check wallet's token balance
            let tokenBalance = await token.balanceOf(owner);
            tokenBalance.should.be.bignumber.equal(initialBalance.sub(amount.mul(rate)));

            // check wallet's ether balance
            let afterBalance = await web3.eth.getBalance(wallet);
            afterBalance.sub(beforeBalance).should.be.bignumber.equal(amount);
        });
    });

    describe("release", () => {
        it("Could not be released when contract state is starting.", async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
            await sale.release([], { from: owner }).should.be.rejected;
        });

        describe("Could be released when contract state is completed.", () => {
            const amount1 = ether(10);
            const amount2 = ether(5);
            const gas = 100000;

            it("raised up to maxcap", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;
                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ gas: gas, to: sale.address, value: amount1, from: buyer }); }
                    catch(error) {}
                });

                await sale.release(buyers, { from: owner }).should.be.rejected;

                await sale.complete({ from: owner }).should.be.fulfilled;
                await sale.release(buyers, { from: owner }).should.be.fulfilled;

                // check buyers' token balance
                buyers.forEach(async (buyer) => {
                    let balance = await token.balanceOf(buyer);
                    balance.should.be.bignumber.equal(amount1.mul(rate));
                });
            });

            it("raised less than maxcap", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;
                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ gas: gas, to: sale.address, value: amount2, from: buyer }); }
                    catch(error) {}
                });

                await sale.release(buyers, { from: owner }).should.be.rejected;

                await sale.complete({ from: owner }).should.be.fulfilled;
                await sale.release(buyers, { from: owner }).should.be.fulfilled;

                // check buyers' token balance
                buyers.forEach(async (buyer) => {
                    let balance = await token.balanceOf(buyer);
                    balance.should.be.bignumber.equal(amount2.mul(rate));
                });
            });
        });
    });

    describe("refund", () => {
        it("Could not be refunded when contract state is starting.", async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
            await sale.refund([], { from: owner }).should.be.rejected;
        });

         describe("Could be refuneded when contract state is completed.", () => {
            const gas = 100000;
            const txFee = gas * web3.eth.gasPrice;
            const amount1 = ether(10);
            const amount2 = ether(5);
            let initialBuyerBalance;

            beforeEach(() => {
                initialBuyerBalance = buyers.map(async (buyer) => {
                     return await web3.eth.getBalance(buyer);
                });
            });

            it("raised up to maxcap", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;
                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount1, from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                    catch(error) {}
                });

                // contract not yet completed. Refund rejected!
                await sale.refund(buyers, { from: owner }).should.be.rejected;

                // contract will be completed automatically (raised maxcap ether)
                await sale.complete({ from: owner }).should.be.fulfilled;
                await sale.refund(buyers, { from: owner }).should.be.fulfilled;

                // check buyers' ether balance
                buyers.forEach(async (buyer, index) => {
                    let initialBalance = await initialBuyerBalance[index];
                    let currentBalance = await web3.eth.getBalance(buyer);

                    // used gas amount should be below expected txFee
                    initialBalance.sub(currentBalance).should.be.bignumber.below(txFee);
                });

                // check buyers' token balance
                buyers.forEach(async (buyer) => {
                    let balance = await token.balanceOf(buyer);
                    balance.should.be.bignumber.equal(0);
                });
            });

            it("raised less than maxcap", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;
                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount2, from: buyer, gas: gas, gasPrice: web3.eth.gasPrice }); }
                    catch(error) {}
                });

                // contract not yet completed. Refund rejected!
                await sale.refund(buyers, { from: owner }).should.be.rejected;

                // extinguish explicitly
                await sale.complete({ from: owner }).should.be.fulfilled;
                await sale.refund(buyers, { from: owner }).should.be.fulfilled;

                // check buyers' ether balance
                buyers.forEach(async (buyer, index) => {
                    let initialBalance = await initialBuyerBalance[index];
                    let currentBalance = await web3.eth.getBalance(buyer);

                    // used gas amount should be below expected txFee
                    initialBalance.sub(currentBalance).should.be.bignumber.below(txFee);
                });

                // check buyers' token balance
                buyers.forEach(async (buyer) => {
                    let balance = await token.balanceOf(buyer);
                    balance.should.be.bignumber.equal(0);
                });
            });
        });
    });
});
