const colors = require('colors');
const PXL = artifacts.require("PXL");
const decimals = Math.pow(10, 18);

module.exports = async (deployer, network) => {
    var contract = await PXL.new(process.env.TOTAL_SUPPLY_PXL * decimals);
    await contract.transfer(process.env.DEVELOPERS_ADDRESS, process.env.DEVELOPERS_PXL * decimals);
    console.log(colors.red('Deployed PXL contract'));
    console.log(colors.red('InitialSupply : %sPXL'), process.env.TOTAL_SUPPLY_PXL);
    console.log(colors.red('PXL transfer : 0x00000 -> %s (%sPXL)'), process.env.DEVELOPERS_ADDRESS, process.env.DEVELOPERS_PXL);
    console.log(colors.red('PXL address : %s'), contract.address);
};