require("@nomiclabs/hardhat-waffle");
const dotenv = require("dotenv");
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API}`,
      accounts: [`${process.env.MAIN_ACCOUNT}`],
      chainId: 5,
    },
  },
  paths: {
    artifacts: "./artifacts",
  },
};
