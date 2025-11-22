// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZKGCredentials
 * @dev Enhanced credentials contract with Zero-Knowledge Proof support for selective disclosure
 */
contract ZKGCredentials {
    // Struct to represent a credential
    struct Credential {
        uint256 id;
        address issuer;
        address student;
        string credentialType;
        string institutionName;
        uint256 issueDate;
        uint256 expiryDate;
        bool revoked;
        string metadataURI;
        bytes32 commitment; // ZKG commitment hash
    }

    // Struct for ZKG proof
    struct ZKProof {
        bytes32 commitment;
        uint256 nonce;
        bytes32 proofHash;
    }

    // Mapping from credential ID to Credential
    mapping(uint256 => Credential) public credentials;
    
    // Mapping from student address to array of credential IDs
    mapping(address => uint256[]) public studentCredentials;
    
    // Mapping from issuer address to array of credential IDs they issued
    mapping(address => uint256[]) public issuerCredentials;
    
    // Mapping to check if an address is a registered issuer
    mapping(address => bool) public registeredIssuers;
    
    // Array of all registered issuers
    address[] public issuerRegistry;
    
    // Mapping for ZKG commitments (commitment => credentialId)
    mapping(bytes32 => uint256) public commitmentToCredential;
    
    // Counter for credential IDs
    uint256 private credentialCounter;
    
    // Owner of the contract
    address public owner;
    
    // Events
    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed issuer,
        address indexed student,
        string credentialType,
        string institutionName,
        bytes32 commitment
    );
    
    event CredentialRevoked(uint256 indexed credentialId, address indexed issuer);
    event IssuerRegistered(address indexed issuer, string institutionName);
    event IssuerRemoved(address indexed issuer);
    event ZKProofVerified(uint256 indexed credentialId, bytes32 commitment, bool valid);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyIssuer() {
        require(registeredIssuers[msg.sender], "Only registered issuers can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        credentialCounter = 1;
    }
    
    /**
     * @dev Register a new issuer
     */
    function registerIssuer(address issuer, string memory institutionName) external onlyOwner {
        require(!registeredIssuers[issuer], "Issuer already registered");
        registeredIssuers[issuer] = true;
        issuerRegistry.push(issuer);
        emit IssuerRegistered(issuer, institutionName);
    }
    
    /**
     * @dev Remove an issuer from the registry
     */
    function removeIssuer(address issuer) external onlyOwner {
        require(registeredIssuers[issuer], "Issuer not registered");
        registeredIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }
    
    /**
     * @dev Issue a new credential with ZKG commitment
     */
    function issueCredential(
        address student,
        string memory credentialType,
        string memory institutionName,
        uint256 expiryDate,
        string memory metadataURI,
        bytes32 commitment
    ) external onlyIssuer returns (uint256) {
        require(student != address(0), "Invalid student address");
        require(commitment != bytes32(0), "Invalid commitment");
        
        uint256 credentialId = credentialCounter++;
        
        Credential memory newCredential = Credential({
            id: credentialId,
            issuer: msg.sender,
            student: student,
            credentialType: credentialType,
            institutionName: institutionName,
            issueDate: block.timestamp,
            expiryDate: expiryDate,
            revoked: false,
            metadataURI: metadataURI,
            commitment: commitment
        });
        
        credentials[credentialId] = newCredential;
        studentCredentials[student].push(credentialId);
        issuerCredentials[msg.sender].push(credentialId);
        commitmentToCredential[commitment] = credentialId;
        
        emit CredentialIssued(
            credentialId,
            msg.sender,
            student,
            credentialType,
            institutionName,
            commitment
        );
        
        return credentialId;
    }
    
    /**
     * @dev Revoke a credential
     */
    function revokeCredential(uint256 credentialId) external {
        Credential storage cred = credentials[credentialId];
        require(cred.issuer == msg.sender, "Only issuer can revoke this credential");
        require(!cred.revoked, "Credential already revoked");
        
        cred.revoked = true;
        emit CredentialRevoked(credentialId, msg.sender);
    }
    
    /**
     * @dev Get credential details
     */
    function getCredential(uint256 credentialId) external view returns (
        uint256 id,
        address issuer,
        address student,
        string memory credentialType,
        string memory institutionName,
        uint256 issueDate,
        uint256 expiryDate,
        bool revoked,
        string memory metadataURI,
        bytes32 commitment
    ) {
        Credential memory cred = credentials[credentialId];
        return (
            cred.id,
            cred.issuer,
            cred.student,
            cred.credentialType,
            cred.institutionName,
            cred.issueDate,
            cred.expiryDate,
            cred.revoked,
            cred.metadataURI,
            cred.commitment
        );
    }
    
    /**
     * @dev Verify if a credential is valid
     */
    function verifyCredential(uint256 credentialId) external view returns (bool) {
        Credential memory cred = credentials[credentialId];
        
        if (cred.id == 0) return false;
        if (cred.revoked) return false;
        if (cred.expiryDate > 0 && cred.expiryDate < block.timestamp) return false;
        if (!registeredIssuers[cred.issuer]) return false;
        
        return true;
    }
    
    /**
     * @dev Verify ZKG proof for selective disclosure
     * @param commitment The commitment hash
     * @param proofHash The proof hash (computed off-chain)
     * @param nonce The nonce used in the proof
     * @return valid Whether the proof is valid
     * @return credentialId The associated credential ID if valid
     */
    function verifyZKProof(
        bytes32 commitment,
        bytes32 proofHash,
        uint256 nonce
    ) external view returns (bool valid, uint256 credentialId) {
        uint256 credId = commitmentToCredential[commitment];
        
        if (credId == 0) {
            return (false, 0);
        }
        
        Credential memory cred = credentials[credId];
        
        // Verify commitment matches
        if (cred.commitment != commitment) {
            return (false, 0);
        }
        
        // Verify credential is valid
        if (cred.revoked) return (false, 0);
        if (cred.expiryDate > 0 && cred.expiryDate < block.timestamp) return (false, 0);
        if (!registeredIssuers[cred.issuer]) return (false, 0);
        
        // Verify proof hash (simplified - in production, use proper ZK circuit)
        bytes32 computedProof = keccak256(abi.encodePacked(commitment, nonce, cred.issuer, cred.student));
        if (computedProof != proofHash) {
            return (false, 0);
        }
        
        return (true, credId);
    }
    
    /**
     * @dev Get credential ID from commitment
     */
    function getCredentialFromCommitment(bytes32 commitment) external view returns (uint256) {
        return commitmentToCredential[commitment];
    }
    
    /**
     * @dev Get all credential IDs for a student
     */
    function getStudentCredentialIds(address student) external view returns (uint256[] memory) {
        return studentCredentials[student];
    }
    
    /**
     * @dev Get all credential IDs issued by an issuer
     */
    function getIssuerCredentialIds(address issuer) external view returns (uint256[] memory) {
        return issuerCredentials[issuer];
    }
    
    /**
     * @dev Get all registered issuers
     */
    function getAllIssuers() external view returns (address[] memory) {
        return issuerRegistry;
    }
}

