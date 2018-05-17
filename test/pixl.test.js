var PIXL = artifacts.require("PIXL");

contract('PIXL', function(accounts) {
  const owner = accounts[0];
  const developer = accounts[1];

  const decimals = 18;
  const initialBalance = 10000;

  let pixl;

  beforeEach("setup contract for each test", async function() {
    pixl = await PIXL.new(initialBalance, { from: owner });
  })

  it("Check Initial balance in Owner account.", async() => {
    let balance = await pixl.balanceOf.call(owner);
    console.log("Owner address :", owner);
    assert.equal(balance.valueOf(), initialBalance * (10 ** decimals), "Owner's balance wasn't correct.");
  });

  it("Send 3000 pixel to developer account.", async() => {
    let sendPixl = 3000 * (10 ** decimals);
    let beforeOwnerBalance = await pixl.balanceOf.call(owner);
    pixl.transfer(developer, sendPixl);

    let afterOwnerBalance = await pixl.balanceOf.call(owner);
    let devBalance = await pixl.balanceOf.call(developer);

    console.log("Owner address :", owner);
    console.log("developer address :", developer);

    assert.equal(afterOwnerBalance.valueOf(), beforeOwnerBalance - sendPixl, "Owner's balance wasn't correct.");
    assert.equal(devBalance.valueOf(), sendPixl, "Developer's balance wasn't correct.");
  });
});

