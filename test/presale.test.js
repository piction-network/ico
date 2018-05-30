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
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(1), from: unregistedBuyer, gas: gas }); }
            catch(error) {}

            let balance = await sale.buyers.call(unregistedBuyer);
            balance.should.be.bignumber.equal(0);
        });

        it("Buyer can get refund when over maxcap.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(9), from: buyer, gas: gas }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(7), from: testAccount, gas: gas }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            before.minus(after).should.be.bignumber.above(ether(2));
        });

        it("Buyer can't buy tokens when under minimum.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(0.5), from: buyer, gas: gas }); }
                catch(error) {}
            });

            buyers.forEach(async (buyer) => {
                let balance = await sale.buyers.call(buyer);
                balance.should.be.bignumber.equal(0);
            });
        });

        it("Buyer can't buy tokens when over exceed.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(6), from: buyer, gas: gas }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(15), from: testAccount, gas: gas }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            const testBalance = await sale.buyers.call(testAccount);

            testBalance.should.be.bignumber.equal(ether(20));
            before.sub(ether(7)).should.be.bignumber.below(ether(1) + txFee);
        });

        it("Buyer can buy tokens when over minimum and under maxcap.", async () => {
            buyers.forEach(async (buyer) => {
                try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: buyer, gas: gas }); }
                catch(error) {}
            });

            const before = await web3.eth.getBalance(testAccount);
            try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: testAccount, gas: gas }); }
            catch(error) {}
            const after = await web3.eth.getBalance(testAccount);
            const testBalance = await sale.buyers.call(testAccount);

            testBalance.should.be.bignumber.equal(ether(10));
            before.sub(after).should.be.bignumber.below(ether(5) + txFee);
        });
    });

    describe("ownership", () => {
        const gas = 100000;

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

            it("Shouldn't be changed the address in whitelist by nonownership user.", async () => {
                await sale.buyerAddressTransfer(testAccount, unregistedBuyer, { from: unregistedBuyer }).should.be.rejected;
            });

            it("Should be changed the address in whitelist by owner.", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;

                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ to: sale.address, value: ether(5), from: buyer, gas: gas }); }
                    catch(error) {}
                });

                await whitelist.addAddressToWhitelist(unregistedBuyer, { from: owner }).should.be.fulfilled
                await sale.setWhitelist(whitelist.address, { from: owner }).should.be.fulfilled;

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
    });

    describe("finalize", () => {
        const gas = 100000;
        it("Could not be finalized when contract state is starting.", async () => {
            await sale.start({ from: owner }).should.be.fulfilled;
            await sale.finalize({ from: owner }).should.be.rejected;
        });

        it("Could be finalized when contract state is completed.", async () => {
            const amount = ether(5);
            const beforeBalance = await web3.eth.getBalance(wallet);
            await sale.start({ from: owner }).should.be.fulfilled;
            await web3.eth.sendTransaction({ to: sale.address, value: amount, from: testAccount, gas: gas });
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
            const amount2 = ether(1);
            const gas = 100000;

            it("raised up to maxcap", async () => {
                await sale.start({ from: owner }).should.be.fulfilled;
                buyers.forEach(async (buyer) => {
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount1, from: buyer, gas: gas }); }
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
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount2, from: buyer, gas: gas }); }
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
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount1, from: buyer, gas: gas }); }
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
                    try { await web3.eth.sendTransaction({ to: sale.address, value: amount2, from: buyer, gas: gas }); }
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
