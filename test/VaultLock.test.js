const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultLock", function () {
  let vaultLock;
  let owner, alice, bob;

  const INITIAL_GREETING = "Hello from VaultLock!";

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const VaultLock = await ethers.getContractFactory("VaultLock");
    vaultLock = await VaultLock.deploy(INITIAL_GREETING);
    await vaultLock.waitForDeployment();
  });

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

  describe("deposit()", function () {
    it("accepts ETH and records the deposit", async function () {
      const amount = ethers.parseEther("1.0");
      await vaultLock.connect(alice).deposit(3600, { value: amount });
      const [depAmount, unlocksAt] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(amount);
      expect(unlocksAt).to.be.gt(0n);
    });
    it("emits Deposited event", async function () {
      await expect(
        vaultLock
          .connect(alice)
          .deposit(3600, { value: ethers.parseEther("0.5") }),
      ).to.emit(vaultLock, "Deposited");
    });
    it("increases the contract balance", async function () {
      const amount = ethers.parseEther("2.0");
      await vaultLock.connect(alice).deposit(60, { value: amount });
      expect(await vaultLock.totalBalance()).to.equal(amount);
    });
    it("reverts on zero ETH", async function () {
      await expect(
        vaultLock.connect(alice).deposit(60, { value: 0 }),
      ).to.be.revertedWithCustomError(vaultLock, "ZeroAmount");
    });
    it("reverts if user already has a locked deposit", async function () {
      const amount = ethers.parseEther("1.0");
      await vaultLock.connect(alice).deposit(3600, { value: amount });
      await expect(
        vaultLock.connect(alice).deposit(60, { value: amount }),
      ).to.be.revertedWithCustomError(vaultLock, "AlreadyLocked");
    });
  });

  describe("withdraw()", function () {
    it("reverts if nothing was deposited", async function () {
      await expect(
        vaultLock.connect(bob).withdraw(),
      ).to.be.revertedWithCustomError(vaultLock, "NothingToWithdraw");
    });
    it("reverts if lock period has NOT expired", async function () {
      await vaultLock
        .connect(alice)
        .deposit(3600, { value: ethers.parseEther("1.0") });
      await expect(
        vaultLock.connect(alice).withdraw(),
      ).to.be.revertedWithCustomError(vaultLock, "StillLocked");
    });
    it("allows withdrawal after lock period expires", async function () {
      await vaultLock
        .connect(alice)
        .deposit(3600, { value: ethers.parseEther("1.0") });
      await time.increase(3601);
      await expect(vaultLock.connect(alice).withdraw()).to.emit(
        vaultLock,
        "Withdrawn",
      );
    });
    it("returns ETH to depositor after withdrawal", async function () {
      const amount = ethers.parseEther("1.0");
      await vaultLock.connect(alice).deposit(60, { value: amount });
      await time.increase(61);
      const balBefore = await ethers.provider.getBalance(alice.address);
      const tx = await vaultLock.connect(alice).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(alice.address);
      expect(balAfter + gasUsed).to.be.closeTo(
        balBefore + amount,
        ethers.parseEther("0.001"),
      );
    });
    it("clears the deposit record after withdrawal", async function () {
      await vaultLock
        .connect(alice)
        .deposit(60, { value: ethers.parseEther("1.0") });
      await time.increase(61);
      await vaultLock.connect(alice).withdraw();
      const [depAmount] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(0n);
    });
  });

  describe("setGreeting()", function () {
    it("owner can update the greeting", async function () {
      await vaultLock.connect(owner).setGreeting("Updated!");
      expect(await vaultLock.greeting()).to.equal("Updated!");
    });
    it("emits GreetingUpdated event", async function () {
      await expect(vaultLock.connect(owner).setGreeting("New greeting"))
        .to.emit(vaultLock, "GreetingUpdated")
        .withArgs("New greeting");
    });
    it("non-owner cannot update the greeting", async function () {
      await expect(
        vaultLock.connect(alice).setGreeting("Hack!"),
      ).to.be.revertedWithCustomError(vaultLock, "NotOwner");
    });
  });

  describe("getDeposit()", function () {
    it("returns zeros for a user with no deposit", async function () {
      const [amount, unlocksAt] = await vaultLock.getDeposit(bob.address);
      expect(amount).to.equal(0n);
      expect(unlocksAt).to.equal(0n);
    });
    it("returns correct data after deposit", async function () {
      const amount = ethers.parseEther("0.25");
      const txTime = (await ethers.provider.getBlock("latest")).timestamp;
      await vaultLock.connect(alice).deposit(1800, { value: amount });
      const [depAmount, unlocksAt] = await vaultLock.getDeposit(alice.address);
      expect(depAmount).to.equal(amount);
      expect(Number(unlocksAt)).to.be.closeTo(txTime + 1800, 2);
    });
  });
});
