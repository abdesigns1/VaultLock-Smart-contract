const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const GREETING = "Hello from VaultLock — built by ab 🚀";

const VaultLockModule = buildModule("VaultLockModule", (m) => {
  const greeting = m.getParameter("greeting", GREETING);

  const vaultLock = m.contract("VaultLock", [greeting]);

  return { vaultLock };
});

module.exports = VaultLockModule;
