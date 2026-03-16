const { ethers, network, run } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════");
  console.log("  VaultLock — Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Deployer : ${deployer.address}`);
  console.log(
    `  Balance  : ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );
  console.log("───────────────────────────────────────────");

  const GREETING = "Hello from VaultLock — built by ab 🚀";

  console.log("\n⏳  Deploying VaultLock...");
  const VaultLock = await ethers.getContractFactory("VaultLock");
  const vaultLock = await VaultLock.deploy(GREETING);
  await vaultLock.waitForDeployment();

  const address = await vaultLock.getAddress();
  const txHash  = vaultLock.deploymentTransaction().hash;

  console.log("\n✅  Deployed successfully!");
  console.log(`   Contract : ${address}`);
  console.log(`   Tx Hash  : ${txHash}`);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n⏳  Waiting for block confirmations before verification...");
    await vaultLock.deploymentTransaction().wait(5);

    console.log("⏳  Verifying on Etherscan...");
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [GREETING],
      });
      console.log("✅  Verified on Etherscan!");
      console.log(`   🔗 https://sepolia.etherscan.io/address/${address}#code`);
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("ℹ️   Already verified.");
        console.log(`   🔗 https://sepolia.etherscan.io/address/${address}#code`);
      } else {
        console.error("⚠️   Verification failed:", err.message);
      }
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Done.");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
