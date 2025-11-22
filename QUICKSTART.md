# Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Smart Contract
```bash
npm run compile
```

### 3. Start Local Blockchain (Terminal 1)
```bash
npm run dev
```
Keep this terminal running. You'll see test accounts with private keys - save these for MetaMask!

### 4. Deploy Contract (Terminal 2)
```bash
npm run deploy
```
This will:
- Deploy the contract
- Register the deployer as an issuer
- Save the contract address to `contract-address.json`

### 5. Start Web Server (Terminal 3)
```bash
npm run serve
```

### 6. Configure MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
4. Import one of the test accounts from Terminal 1 (the one that deployed the contract)

### 7. Open the Application

1. Go to `http://localhost:8080`
2. Click "Connect Wallet" and approve in MetaMask
3. You're ready to use the app!

## Testing the Application

### As an Issuer (Deployer Account)
1. Go to "Issuer Portal"
2. Fill in the form:
   - **Student Address**: Use another test account address from Terminal 1
   - **Credential Type**: e.g., "B.Tech Degree"
   - **Institution Name**: e.g., "Test University"
   - **Expiry Date**: Optional
3. Click "Issue Credential"
4. Approve the transaction in MetaMask

### As a Student
1. Import the student account into MetaMask (switch accounts)
2. Go to "Student Passport"
3. View your credentials!

### As a Verifier
1. Go to "Verifier Tool"
2. Enter a credential ID (from the Student Passport page)
3. Click "Verify Credential"
4. See the verification result!

## Troubleshooting

**"Contract not deployed" error:**
- Make sure you ran `npm run deploy` and the contract-address.json file exists

**"Contract ABI not found" error:**
- Make sure you ran `npm run compile` first
- The artifacts folder should exist

**"Not registered as issuer" error:**
- Use the deployer account (the one that deployed the contract)
- Or register your account: `npm run register-issuer <your-address> <institution-name>`

**MetaMask connection issues:**
- Make sure MetaMask is connected to the Hardhat Local network
- Check that the Chain ID is 1337

## Next Steps

- Issue multiple credentials to test
- Try expirable credentials (set an expiry date)
- Test credential revocation
- Register additional issuers

