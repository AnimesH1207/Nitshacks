# Zero-Knowledge Proof (ZKG) Integration Guide

## Overview

The Skills Passport platform now includes Zero-Knowledge Proof (ZKG) support for **selective disclosure**. This allows students to prove facts about their credentials without revealing all the details.

## How It Works

### 1. **Commitment Generation** (During Issuance)
When an issuer creates a credential, a cryptographic commitment is generated and stored on-chain. This commitment is a hash of the credential data.

### 2. **Proof Generation** (Student Side)
Students can generate ZKG proofs that:
- Prove a credential exists and is valid
- Selectively disclose only certain fields (e.g., "I have a degree" without revealing which university)
- Keep other information private

### 3. **Proof Verification** (Verifier Side)
Verifiers can verify ZKG proofs without seeing the full credential details, ensuring privacy while maintaining trust.

## Features

### For Students
- **Generate ZKG Proofs**: Click "Generate ZKG Proof" on any credential card
- **Selective Disclosure**: Choose which fields to include in the proof
- **Privacy-Preserving**: Share proofs without revealing sensitive information

### For Issuers
- **Automatic Commitment**: Commitments are automatically generated when issuing credentials
- **On-Chain Storage**: Commitments are stored on the blockchain for verification

### For Verifiers
- **Two Verification Methods**:
  1. **Standard Verification**: Verify by credential ID (reveals all details)
  2. **ZKG Verification**: Verify using commitment, proof hash, and nonce (privacy-preserving)

## Usage Examples

### Example 1: Proving You Have a Degree (Without Revealing University)
1. Student generates a ZKG proof with:
   - ✅ Credential Type: "B.Tech Degree"
   - ❌ Institution Name: Hidden
   - ❌ Issue Date: Hidden
   - ❌ Expiry Date: Hidden

2. Student shares the proof (commitment, proof hash, nonce) with verifier

3. Verifier verifies the proof and confirms:
   - The credential exists
   - The credential is valid
   - The student has a B.Tech Degree
   - **Without knowing which university issued it**

### Example 2: Proving Credential Validity (Without Revealing Details)
1. Student generates a minimal proof showing only that a valid credential exists
2. Verifier confirms the credential is valid without seeing any details
3. Useful for age verification, eligibility checks, etc.

## Technical Details

### Commitment Generation
```javascript
commitment = keccak256(credentialType | institutionName | issueDate | studentAddress | issuerAddress)
```

### Proof Generation
```javascript
proofHash = keccak256(disclosedFields | commitment | nonce | issuer | student)
```

### On-Chain Verification
The contract verifies:
1. Commitment exists and matches a credential
2. Credential is valid (not revoked, not expired, issuer registered)
3. Proof hash matches the computed hash

## Smart Contract Functions

### `issueCredential`
Issues a credential with a ZKG commitment:
```solidity
function issueCredential(
    address student,
    string memory credentialType,
    string memory institutionName,
    uint256 expiryDate,
    string memory metadataURI,
    bytes32 commitment
) external onlyIssuer returns (uint256)
```

### `verifyZKProof`
Verifies a ZKG proof:
```solidity
function verifyZKProof(
    bytes32 commitment,
    bytes32 proofHash,
    uint256 nonce
) external view returns (bool valid, uint256 credentialId)
```

## Security Considerations

1. **Commitment Uniqueness**: Each commitment must be unique
2. **Nonce Randomness**: Nonces must be cryptographically random
3. **Proof Integrity**: Proofs cannot be forged without the original credential data
4. **Revocation**: Revoked credentials cannot generate valid proofs

## Future Enhancements

- **Advanced ZK Circuits**: Integration with Circom/SnarkJS for more complex proofs
- **Range Proofs**: Prove values are within certain ranges (e.g., "age > 18")
- **Multi-Credential Proofs**: Prove facts across multiple credentials
- **Privacy-Preserving Aggregation**: Aggregate statistics without revealing individual data

## Testing

1. **Issue a Credential**: Use the Issuer Portal to create a credential (commitment is auto-generated)
2. **Generate a Proof**: Go to Student Passport, click "Generate ZKG Proof"
3. **Select Disclosure Options**: Choose which fields to include
4. **Verify the Proof**: Use the Verifier Tool's ZKG verification form

## Notes

- The current implementation uses a simplified ZK proof system suitable for prototyping
- For production use, consider integrating with established ZK libraries (Circom, SnarkJS, etc.)
- Commitments are one-way hashes - original data cannot be recovered from commitments alone

