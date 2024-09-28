const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("MyTokenModule", (m) => {

  const token = m.contract("MyToken");

  return { token };
});
