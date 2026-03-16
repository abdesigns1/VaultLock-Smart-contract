const { expect }         = require("chai");
const { ethers }         = require("hardhat");
const { time }           = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultLock", function () {
  let vaultLock;
  let owner, alice, bob;

  const INITIAL_GREETING = "Hello from VaultLock!";

  // ─── Deploy fresh contract before each test ───────────────────────────
  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const VaultLock = await ethers.getContractFactory("VaultLock");
    vaultLock = await VaultLock.deploy(INITIAL_GREETING);
    await vaultLock.waitForDeployment();
  });

  // ──────────────────────────────────────────────────────────────────────
  //  Deployment
  // ──────────────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets the correct owner", async function () {
      expect(await vaultLock.owner()).to.equal(owner.address);
    });

    it("stores the initial greeting", async function () {
      expect(await vaultLock.greeting()).to.equal(INITIAL_GREETING);
    });

    it("starts with zero balance", async function () {
      expect(await vaultLock.totalBalance()).to.equal(0n);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //  deposit()
  // ──────────────────────────────────────────────────────────────────────
  describe("deposit()", function () {
    it("accepts ETH and records the deposit", async function () {
      const amount      = ethers.parseEther("1.0");
      const lockSeconds = 3600; // 1 hour

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });

      const [depAmount, unlocksAt] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(amount);
      expect(unlocksAt).to.be.gt(0n);
    });

    it("emits Deposited event", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(
        vaultLock.connect(alice).deposit(3600, { value: amount })
      ).to.emit(vaultLock, "Deposited");
    });

    it("increases the contract balance", async function () {
      const amount = ethers.parseEther("2.0");
      await vaultLock.connect(alice).deposit(60, { value: amount });
      expect(await vaultLock.totalBalance()).to.equal(amount);
    });

    it("reverts on zero ETH", async function () {
      await expect(
        vaultLock.connect(alice).deposit(60, { value: 0 })
      ).to.be.revertedWithCustomError(vaultLock, "ZeroAmount");
    });

    it("reverts if user already has a locked deposit", async function () {
      const amount = ethers.parseEther("1.0");
      await vaultLock.connect(alice).deposit(3600, { value: amount });

      await expect(
        vaultLock.connect(alice).deposit(60, { value: amount })
      ).to.be.revertedWithCustomError(vaultLock, "AlreadyLocked");
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //  withdraw()
  // ──────────────────────────────────────────────────────────────────────
  describe("withdraw()", function () {
    it("reverts if nothing was deposited", async function () {
      await expect(
        vaultLock.connect(bob).withdraw()
      ).to.be.revertedWithCustomError(vaultLock, "NothingToWithdraw");
    });

    it("reverts if lock period has NOT expired", async function () {
      const amount      = ethers.parseEther("1.0");
      const lockSeconds = 3600;

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });

      await expect(
        vaultLock.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(vaultLock, "StillLocked");
    });

    it("allows withdrawal after lock period expires", async function () {
      const amount      = ethers.parseEther("1.0");
      const lockSeconds = 3600;

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });

      // Fast-forward time past the lock
      await time.increase(lockSeconds + 1);

      await expect(
        vaultLock.connect(alice).withdraw()
      ).to.emit(vaultLock, "Withdrawn");
    });

    it("returns ETH to depositor after withdrawal", async function () {
      const amount      = ethers.parseEther("1.0");
      const lockSeconds = 60;

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });
      await time.increase(lockSeconds + 1);

      const balBefore = await ethers.provider.getBalance(alice.address);
      const tx        = await vaultLock.connect(alice).withdraw();
      const receipt   = await tx.wait();
      const gasUsed   = receipt.gasUsed * receipt.gasPrice;
      const balAfter  = await ethers.provider.getBalance(alice.address);

      // Allow ±0.001 ETH tolerance for gas
      expect(balAfter + gasUsed).to.be.closeTo(
        balBefore + amount,
        ethers.parseEther("0.001")
      );
    });

    it("clears the deposit record after withdrawal", async function () {
      const amount      = ethers.parseEther("1.0");
      const lockSeconds = 60;

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });
      await time.increase(lockSeconds + 1);
      await vaultLock.connect(alice).withdraw();

      const [depAmount] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(0n);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //  setGreeting()
  // ──────────────────────────────────────────────────────────────────────
  describe("setGreeting()", function () {
    it("owner can update the greeting", async function () {
      await vaultLock.connect(owner).setGreeting("Updated!");
      expect(await vaultLock.greeting()).to.equal("Updated!");
    });

    it("emits GreetingUpdated event", async function () {
      await expect(
        vaultLock.connect(owner).setGreeting("New greeting")
      ).to.emit(vaultLock, "GreetingUpdated").withArgs("New greeting");
    });

    it("non-owner cannot update the greeting", async function () {
      await expect(
        vaultLock.connect(alice).setGreeting("Hack!")
      ).to.be.revertedWithCustomError(vaultLock, "NotOwner");
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  //  getDeposit()
  // ──────────────────────────────────────────────────────────────────────
  describe("getDeposit()", function () {
    it("returns zeros for a user with no deposit", async function () {
      const [amount, unlocksAt] = await vaultLock.getDeposit(bob.address);
      expect(amount).to.equal(0n);
      expect(unlocksAt).to.equal(0n);
    });

    it("returns correct data after deposit", async function () {
      const amount      = ethers.parseEther("0.25");
      const lockSeconds = 1800;

      const txTime = (await ethers.provider.getBlock("latest")).timestamp;

      await vaultLock.connect(alice).deposit(lockSeconds, { value: amount });

      const [depAmount, unlocksAt] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(amount);
      // unlocksAt should be roughly txTime + lockSeconds (±2 seconds)
      expect(Number(unlocksAt)).to.be.closeTo(txTime + lockSeconds, 2);
    });
  });
});
