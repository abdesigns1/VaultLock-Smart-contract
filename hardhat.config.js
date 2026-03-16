require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY   = process.env.PRIVATE_KEY   || "0x" + "0".repeat(64);
const SEPOLIA_RPC   = process.env.SEPOLIA_RPC_URL || "";
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: PRIVATE_KEY !== "0x" + "0".repeat(64) ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },

  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },

  sourcify: {
    enabled: true,
  },
};
