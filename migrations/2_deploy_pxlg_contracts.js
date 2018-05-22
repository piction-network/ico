const colors = require('colors');
const PXLG = artifacts.require("PXLG");
const decimals = Math.pow(10, 18);

module.exports = async (deployer, network) => {
    var contract = await PXLG.new(process.env.TOTAL_SUPPLY_PXLG * decimals);
    console.log(colors.red('Deployed PXLG contract'));
    console.log(colors.red('InitialSupply : %sPXLG'), process.env.TOTAL_SUPPLY_PXLG);
    console.log(colors.red('PXLG address : %s'), contract.address);
};