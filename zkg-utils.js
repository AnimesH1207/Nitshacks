// ============================================================================
// ZERO-KNOWLEDGE PROOF UTILITIES
// ============================================================================

/**
 * Generate a commitment hash for a credential
 * This creates a hash that can be used for zero-knowledge proofs
 */
function generateCommitment(credentialData) {
    const { credentialType, institutionName, issueDate, studentAddress, issuerAddress } = credentialData;
    
    // Create a commitment by hashing the credential data
    // In production, use proper cryptographic commitments
    const data = `${credentialType}|${institutionName}|${issueDate}|${studentAddress}|${issuerAddress}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
}

/**
 * Generate a ZKG proof for selective disclosure
 * This allows proving a fact about a credential without revealing the full credential
 */
function generateZKProof(credential, disclosureOptions) {
    const {
        credentialId,
        credentialType,
        institutionName,
        issueDate,
        expiryDate,
        student,
        issuer,
        commitment
    } = credential;
    
    // Generate a random nonce for the proof
    const nonce = ethers.BigNumber.from(ethers.utils.randomBytes(32));
    
    // Build proof data based on what's being disclosed
    let proofData = '';
    
    if (disclosureOptions.showType) {
        proofData += credentialType;
    }
    if (disclosureOptions.showInstitution) {
        proofData += institutionName;
    }
    if (disclosureOptions.showIssueDate) {
        proofData += issueDate.toString();
    }
    if (disclosureOptions.showExpiryDate) {
        proofData += expiryDate.toString();
    }
    
    // Always include commitment and nonce for verification
    proofData += commitment;
    proofData += nonce.toString();
    proofData += issuer;
    proofData += student;
    
    // Generate proof hash
    const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proofData));
    
    return {
        commitment: commitment,
        nonce: nonce,
        proofHash: proofHash,
        disclosedFields: disclosureOptions
    };
}

/**
 * Verify a ZKG proof
 */
async function verifyZKProof(proof, contract) {
    try {
        const result = await contract.verifyZKProof(
            proof.commitment,
            proof.proofHash,
            proof.nonce
        );
        return {
            valid: result.valid,
            credentialId: result.credentialId.toString()
        };
    } catch (error) {
        console.error('Error verifying ZKG proof:', error);
        return {
            valid: false,
            credentialId: null,
            error: error.message
        };
    }
}

/**
 * Create a selective disclosure proof
 * Example: Prove you have a degree from a top-100 university without revealing which one
 */
function createSelectiveDisclosureProof(credential, options) {
    const defaultOptions = {
        showType: true,           // Always show credential type
        showInstitution: false,   // Hide institution name
        showIssueDate: false,     // Hide issue date
        showExpiryDate: false,    // Hide expiry date
        showStudent: false,       // Hide student address
        showIssuer: false         // Hide issuer address
    };
    
    const disclosureOptions = { ...defaultOptions, ...options };
    
    return generateZKProof(credential, disclosureOptions);
}

/**
 * Generate commitment when issuing a credential
 */
async function generateCredentialCommitment(credentialData) {
    return generateCommitment(credentialData);
}

// Export functions for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateCommitment,
        generateZKProof,
        verifyZKProof,
        createSelectiveDisclosureProof,
        generateCredentialCommitment
    };
}

