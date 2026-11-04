import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    profiles: {
      default: {
        version: "0.8.38",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun",
        },
      },
    },
  },
  test: {
    solidity: {
      fuzz: { runs: 512 },
    },
  },
});
