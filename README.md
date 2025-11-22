# Skills Passport - Decentralized Credentials Platform

A Web3 platform for verifiable, unforgeable, and privacy-preserving academic credentials built on blockchain.

## Features

- **Student Passport**: View all your academic credentials in one place
- **Issuer Portal**: Universities and institutions can issue credentials to students
- **Verifier Tool**: Employers can verify the authenticity of credentials
- **Decentralized Issuer Registry**: Only registered issuers can issue credentials
- **Expirable Credentials**: Support for credentials with expiration dates
- **Revocable Credentials**: Issuers can revoke credentials if needed

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or another Web3 wallet
- Hardhat local blockchain (included)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Compile the smart contract:
```bash
npm run compile
```

3. Start a local Hardhat node (in a separate terminal):
```bash
npm run dev
```

4. Deploy the contract (in another terminal):
```bash
npm run deploy
```

5. Start a local web server (in another terminal):
```bash
npm run serve
```

6. Open `http://localhost:8080` in a browser with MetaMask installed.

## Setup Instructions

### 1. Configure MetaMask

- Add a custom network:
  - Network Name: `Hardhat Local`
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `1337`
  - Currency Symbol: `ETH`

### 2. Import Test Accounts

When you run `npm run dev`, Hardhat will display test accounts with private keys. Import one of these into MetaMask for testing.

### 3. Register an Issuer

After deploying the contract, the deployer address is automatically registered as an issuer. To register additional issuers:

```bash
npm run register-issuer <issuer-address> <institution-name>
```

Or you can use the contract owner account in MetaMask and call the `registerIssuer` function directly.

## Usage

### For Students

1. Connect your wallet
2. Navigate to "Student Passport"
3. View all your credentials

### For Issuers

1. Connect your wallet (must be a registered issuer)
2. Navigate to "Issuer Portal"
3. Fill in the form to issue a credential to a student
4. Submit the transaction

### For Verifiers

1. Navigate to "Verifier Tool"
2. Enter a credential ID
3. Click "Verify Credential"
4. View the verification result and credential details

## Project Structure

```
nitshack/
├── contracts/
│   └── CredentialsPassport.sol    # Smart contract
├── scripts/
│   ├── deploy.js                  # Deployment script
│   └── registerIssuer.js          # Helper script to register issuers
├── index.html                     # Main HTML file
├── styles.css                     # All styling
├── app.js                         # All JavaScript (config, Web3, UI logic)
├── hardhat.config.js              # Hardhat configuration
└── package.json                   # Dependencies
```

**Frontend Files:**
- `index.html` - Main HTML structure with all three interfaces
- `styles.css` - All CSS styling
- `app.js` - Complete application logic (Web3, Student, Issuer, Verifier)

## Smart Contract Functions

### For Students
- `getStudentCredentialIds(address)`: Get all credential IDs for a student
- `getCredential(uint256)`: Get credential details

### For Issuers
- `issueCredential(...)`: Issue a new credential
- `revokeCredential(uint256)`: Revoke a credential

### For Verifiers
- `verifyCredential(uint256)`: Verify if a credential is valid
- `registeredIssuers(address)`: Check if an address is a registered issuer

### For Owner
- `registerIssuer(address, string)`: Register a new issuer
- `removeIssuer(address)`: Remove an issuer

## Future Enhancements

- Zero-Knowledge Proofs (ZKPs) for selective disclosure
- IPFS integration for metadata storage
- Mobile app version
- DAO governance for issuer registry
- Batch credential operations

## License

MIT

