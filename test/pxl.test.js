var PXL = artifacts.require("PXL");

contract('PXL', function (accounts) {
    const owner = accounts[0];
    const developer = accounts[1];

    const decimals = Math.pow(10, 18);
    const initialBalance = 10000;

    let token;

    beforeEach("setup contract for each test", async function () {
        token = await PXL.new(initialBalance * decimals, {from: owner});
    })

    it("Check Initial balance in Owner account.", async () => {
        let balance = await token.balanceOf.call(owner);
        console.log("Owner address :", owner);
        assert.equal(balance.valueOf(), initialBalance * decimals, "Owner's balance wasn't correct.");
    });

    it("Send 3000 pixel to developer account.", async () => {
        let sendPXL = 3000 * decimals;
        let beforeOwnerBalance = await token.balanceOf.call(owner);
        token.transfer(developer, sendPXL);

        let afterOwnerBalance = await token.balanceOf.call(owner);
        let devBalance = await token.balanceOf.call(developer);

        console.log("Owner address :", owner);
        console.log("developer address :", developer);

        assert.equal(afterOwnerBalance.valueOf(), beforeOwnerBalance - sendPXL, "Owner's balance wasn't correct.");
        assert.equal(devBalance.valueOf(), sendPXL, "Developer's balance wasn't correct.");
    });
});

