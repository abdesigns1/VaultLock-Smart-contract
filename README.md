# 🔒 VaultLock — Time-Locked ETH Vault

> **A minimal, production-ready Solidity smart contract** built with Hardhat.  
> Deposit ETH with a custom lock duration — funds can only be withdrawn after the timer expires.

Built by **Ayeni (ab)** · MIT License

---

## ✅ Verified Contract (Sepolia Testnet)

| Field                    | Value                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Network**              | Ethereum Sepolia Testnet                                                                                                |
| **Contract Address**     | `0xaA6a0551aFC042a79c07E0270C5150f85B5f3f22`                                                                            |
| **Etherscan (Verified)** | [View & Interact on Etherscan 🔗](https://sepolia.etherscan.io/address/0xaA6a0551aFC042a79c07E0270C5150f85B5f3f22#code) |
| **Tx Hash**              | `0x07c6c0566a0de6cb516a1bec0ebf9735dd5338e85c00a22062686bfd920ebdb9`                                                    |

---

## 📦 Project Structure

```
vaultlock-contract/
├── contracts/
│   └── VaultLock.sol          # ← The smart contract
├── test/
│   └── VaultLock.test.js      # ← Full test suite (17 tests)
├── scripts/
│   └── deploy.js              # ← Deploy + auto-verify script
├── ignition/
│   └── modules/VaultLock.js   # ← Hardhat Ignition module
├── .env.example               # ← Environment variable template
├── hardhat.config.js          # ← Hardhat configuration
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PRIVATE_KEY=0xYOUR_DEPLOYER_WALLET_PRIVATE_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

#### 🔑 Getting your API keys

**Alchemy (RPC URL)**

1. Go to [https://alchemy.com](https://alchemy.com) → Sign up (free)
2. Create a new app → select **Ethereum** → **Sepolia**
3. Copy the **HTTPS** endpoint → paste as `SEPOLIA_RPC_URL`

**Etherscan API Key**

1. Go to [https://etherscan.io/myapikey](https://etherscan.io/myapikey) → Sign up (free)
2. Click **+ Add** → name it anything → copy the key
3. Paste as `ETHERSCAN_API_KEY`

> ✅ Both are completely free for personal/testnet use.

### 3. Compile & Test

```bash
# Compile contracts
npm run compile

# Run all tests (local Hardhat node — no wallet/ETH needed)
npm test

# Optional: run with gas report
npm run test:gas

# Optional: coverage report
npm run coverage
```

Expected output:

```
  VaultLock
    Deployment
      ✔ sets the correct owner
      ✔ stores the initial greeting
      ✔ starts with zero balance
    deposit()
      ✔ accepts ETH and records the deposit
      ✔ emits Deposited event
      ✔ increases the contract balance
      ✔ reverts on zero ETH
      ✔ reverts if user already has a locked deposit
    withdraw()
      ✔ reverts if nothing was deposited
      ✔ reverts if lock period has NOT expired
      ✔ allows withdrawal after lock period expires
      ✔ returns ETH to depositor after withdrawal
      ✔ clears the deposit record after withdrawal
    setGreeting()
      ✔ owner can update the greeting
      ✔ emits GreetingUpdated event
      ✔ non-owner cannot update the greeting
    getDeposit()
      ✔ returns zeros for a user with no deposit
      ✔ returns correct data after deposit

  18 passing
```

### 4. Deploy to Sepolia

Make sure your wallet has **Sepolia ETH** — get some free from [https://sepoliafaucet.com](https://sepoliafaucet.com).

```bash
npm run deploy:sepolia
```

The deploy script will:

1. Print your deployer address + balance
2. Deploy `VaultLock` with a greeting
3. Wait for **5 block confirmations**
4. **Automatically verify** the source code on Etherscan

Sample output:

```
═══════════════════════════════════════════
  VaultLock — Deployment
═══════════════════════════════════════════
  Network  : sepolia
  Deployer : 0xAbc...123
  Balance  : 0.5 ETH
───────────────────────────────────────────

⏳  Deploying VaultLock...

✅  Deployed successfully!
   Contract : 0xDEF...789
   Tx Hash  : 0xabc...def

⏳  Waiting for block confirmations before verification...
⏳  Verifying on Etherscan...
✅  Verified on Etherscan!
   🔗 https://sepolia.etherscan.io/address/0xDEF...789#code
```

> 📝 Copy the contract address and update the [Verified Contract](#-verified-contract-sepolia-testnet) table at the top of this README.

### 5. Verify manually (if needed)

If auto-verify failed, run:

```bash
npx hardhat verify --network sepolia 0xYOUR_CONTRACT_ADDRESS "Hello from VaultLock — built by ab 🚀"
```

---

## 📋 Contract API

### `constructor(string memory _greeting)`

Deploys the contract. Sets the initial greeting and assigns `owner`.

---

### `deposit(uint256 lockSeconds)` — `payable`

Deposit ETH into the vault, locked for `lockSeconds` seconds.

| Param         | Type      | Description              |
| ------------- | --------- | ------------------------ |
| `lockSeconds` | `uint256` | Lock duration in seconds |
| `msg.value`   | `ETH`     | Amount to deposit        |

Reverts:

- `ZeroAmount` — if no ETH sent
- `AlreadyLocked` — if caller already has a deposit

Emits: `Deposited(address user, uint256 amount, uint256 unlocksAt)`

---

### `withdraw()`

Withdraw your ETH after the lock period expires.

Reverts:

- `NothingToWithdraw` — no deposit found
- `StillLocked(uint256 unlocksAt)` — lock has not expired yet

Emits: `Withdrawn(address user, uint256 amount)`

---

### `getDeposit(address user)` → `(uint256 amount, uint256 unlocksAt)` — `view`

Returns the deposit amount and unlock timestamp for any address.

---

### `setGreeting(string calldata _greeting)` — `onlyOwner`

Updates the greeting string. Reverts with `NotOwner` if called by non-owner.

Emits: `GreetingUpdated(string newGreeting)`

---

### `totalBalance()` → `uint256` — `view`

Returns the total ETH held by the contract.

---

## 🛡️ Security Design

| Pattern           | Implementation                                         |
| ----------------- | ------------------------------------------------------ |
| Custom errors     | Gas-efficient reverts (`NotOwner`, `ZeroAmount`, etc.) |
| CEI pattern       | Check → Effect → Interact in `withdraw()`              |
| No reentrancy     | State deleted **before** ETH transfer                  |
| Access control    | `onlyOwner` modifier using custom error                |
| Safe ETH transfer | Low-level `.call{value}("")` with success check        |

---

## 📜 License

MIT © Ayeni (ab)
