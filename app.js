// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    contractAddress: null,
    contractABI: null,
    network: {
        chainId: 1337,
        name: "localhost"
    }
};

// Load contract address and ABI
async function loadConfig() {
    try {
        const response = await fetch('./contract-address.json');
        if (response.ok) {
            const data = await response.json();
            CONFIG.contractAddress = data.address;
            CONFIG.network.chainId = data.chainId || 1337;
        }
    } catch (error) {
        console.warn('Could not load contract address. Make sure to deploy the contract first.');
    }
    
    try {
        const response = await fetch('./artifacts/contracts/CredentialsPassport.sol/CredentialsPassport.json');
        if (response.ok) {
            const data = await response.json();
            CONFIG.contractABI = data.abi;
        }
    } catch (error) {
        console.warn('Could not load contract ABI. Make sure to compile the contract first.');
    }
}

loadConfig();

// ============================================================================
// WEB3 CONNECTION
// ============================================================================
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let userRole = null; // 'user', 'issuer', 'verifier'

async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Wait for config to load
        let attempts = 0;
        while (!CONFIG.contractABI && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        if (CONFIG.contractAddress && CONFIG.contractABI) {
            contract = new ethers.Contract(
                CONFIG.contractAddress,
                CONFIG.contractABI,
                signer
            );
        }
        
        return true;
    } else {
        alert('Please install MetaMask or another Web3 wallet!');
        return false;
    }
}

async function loginWithRole(role) {
    const loginStatus = document.getElementById('loginStatus');
    loginStatus.style.display = 'block';
    loginStatus.className = 'login-status';
    loginStatus.textContent = 'Loading portal...';
    
    try {
        userRole = role;
        
        // Hide login page and show main portal
        showMainPortal();
        
        updateWalletUI();
        updateNavigationBasedOnRole();
        updatePageVisibility();
        
        // Navigate to appropriate page based on role
        if (role === 'user') {
            switchToPage('student');
            // Show wallet connection prompt for users
            showWalletConnectionPrompt();
        } else if (role === 'issuer') {
            switchToPage('issuer');
            // Show wallet connection prompt for issuers
            showWalletConnectionPrompt();
        } else if (role === 'verifier') {
            switchToPage('verifier');
            // Verifiers don't need wallet
        } else if (role === 'dao') {
            switchToPage('dao');
            // Show wallet connection prompt for DAO
            showWalletConnectionPrompt();
        }
    } catch (error) {
        console.error('Error during login:', error);
        loginStatus.className = 'login-status error';
        loginStatus.textContent = 'Failed to login: ' + error.message;
    }
}

function showWalletConnectionPrompt() {
    const walletPrompt = document.getElementById('walletConnectionPrompt');
    if (walletPrompt) {
        walletPrompt.style.display = 'flex';
    }
}

function hideWalletConnectionPrompt() {
    const walletPrompt = document.getElementById('walletConnectionPrompt');
    if (walletPrompt) {
        walletPrompt.style.display = 'none';
    }
}

async function connectWalletFromPortal() {
    try {
        const connected = await initWeb3();
        if (connected) {
            hideWalletConnectionPrompt();
            updateWalletUI();
            
            // Load data based on role
            if (userRole === 'user') {
                if (document.getElementById('student-page').classList.contains('active')) {
                    loadStudentCredentials();
                }
            } else if (userRole === 'issuer') {
                if (isWalletConnected()) {
                    loadIssuerReputation();
                }
            } else if (userRole === 'dao') {
                if (isWalletConnected()) {
                    loadRegisteredIssuers();
                }
            }
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

function showMainPortal() {
    const loginPage = document.getElementById('login-page');
    const mainPortal = document.getElementById('main-portal');
    
    if (loginPage) loginPage.style.display = 'none';
    if (mainPortal) mainPortal.style.display = 'block';
}

function showLoginPage() {
    const loginPage = document.getElementById('login-page');
    const mainPortal = document.getElementById('main-portal');
    
    if (loginPage) loginPage.style.display = 'flex';
    if (mainPortal) mainPortal.style.display = 'none';
}

function logout() {
    userAddress = null;
    userRole = null;
    provider = null;
    signer = null;
    contract = null;
    
    // Show login page and hide main portal
    showLoginPage();
    
    // Reset login status
    const loginStatus = document.getElementById('loginStatus');
    if (loginStatus) {
        loginStatus.style.display = 'none';
        loginStatus.textContent = '';
    }
}

function switchToPage(pageName) {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-page') === pageName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    pages.forEach(p => {
        if (p.id === `${pageName}-page`) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
    
    updateWalletUI();
}

function updateNavigationBasedOnRole() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        const pageType = btn.getAttribute('data-page');
        
        if (userRole === 'user') {
            // Hide issuer, verifier, and DAO buttons for users
            if (pageType === 'issuer' || pageType === 'verifier' || pageType === 'dao') {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'block';
            }
        } else if (userRole === 'issuer') {
            // Only show issuer button for issuers (hide student, verifier, DAO)
            if (pageType === 'issuer') {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        } else if (userRole === 'verifier') {
            // Only show verifier button for verifiers
            if (pageType === 'verifier') {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        } else if (userRole === 'dao') {
            // Only show DAO button for DAO members
            if (pageType === 'dao') {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        } else {
            // Not logged in - show all buttons
            btn.style.display = 'block';
        }
    });
}

function updatePageVisibility() {
    const studentPage = document.getElementById('student-page');
    const issuerPage = document.getElementById('issuer-page');
    const verifierPage = document.getElementById('verifier-page');
    const daoPage = document.getElementById('dao-page');
    
    if (userRole === 'user') {
        // If user is on issuer, verifier, or DAO page, switch to student page
        if (issuerPage.classList.contains('active') || verifierPage.classList.contains('active') || daoPage.classList.contains('active')) {
            switchToPage('student');
        }
    } else if (userRole === 'issuer') {
        // If issuer is on any other page, switch to issuer page
        if (studentPage.classList.contains('active') || verifierPage.classList.contains('active') || daoPage.classList.contains('active')) {
            switchToPage('issuer');
        }
    } else if (userRole === 'verifier') {
        // If verifier is on any other page, switch to verifier page
        if (studentPage.classList.contains('active') || issuerPage.classList.contains('active') || daoPage.classList.contains('active')) {
            switchToPage('verifier');
        }
    } else if (userRole === 'dao') {
        // If DAO is on any other page, switch to DAO page
        if (studentPage.classList.contains('active') || issuerPage.classList.contains('active') || verifierPage.classList.contains('active')) {
            switchToPage('dao');
        }
    }
}

function updateWalletUI() {
    const walletInfo = document.getElementById('walletInfo');
    const walletAddress = document.getElementById('walletAddress');
    const logoutBtn = document.getElementById('logoutBtn');
    const userRoleBadge = document.getElementById('userRoleBadge');
    
    // Verifiers don't need wallet, just show logout
    if (userRole === 'verifier') {
        walletInfo.style.display = 'flex';
        walletInfo.style.alignItems = 'center';
        walletInfo.style.gap = '0.75rem';
        
        // Hide wallet address for verifiers
        if (walletAddress) {
            walletAddress.style.display = 'none';
        }
        
        // Update role badge
        if (userRoleBadge) {
            userRoleBadge.textContent = '🔍 Verifier';
            userRoleBadge.style.display = 'block';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } else if (userAddress && userRole) {
        // Show wallet info for users and issuers
        walletInfo.style.display = 'flex';
        walletInfo.style.alignItems = 'center';
        walletInfo.style.gap = '0.75rem';
        walletAddress.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        
        if (walletAddress) {
            walletAddress.style.display = 'block';
        }
        
        // Update role badge
        if (userRoleBadge) {
            const roleLabels = {
                'user': '👤 User',
                'issuer': '✍️ Issuer',
                'dao': '🏛️ DAO'
            };
            userRoleBadge.textContent = roleLabels[userRole] || userRole;
            userRoleBadge.style.display = 'block';
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } else {
        walletInfo.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        if (userRoleBadge) {
            userRoleBadge.style.display = 'none';
        }
    }
}

function isWalletConnected() {
    return userAddress !== null && contract !== null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
}

function formatDate(timestamp) {
    if (!timestamp || timestamp == 0) return 'Permanent';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
}

function isExpired(expiryDate) {
    if (!expiryDate || expiryDate == 0) return false;
    return Number(expiryDate) * 1000 < Date.now();
}

function getCredentialStatus(credential) {
    if (credential.revoked) return 'revoked';
    if (isExpired(credential.expiryDate)) return 'expired';
    return 'valid';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// STUDENT PASSPORT FUNCTIONALITY
// ============================================================================
// Store credentials globally for ZKG proof generation
let storedCredentials = {};

async function loadStudentCredentials() {
    const container = document.getElementById('studentCredentials');
    
    if (!isWalletConnected()) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.6;">🔐</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">Connect Your Wallet</h3>
                <p>Please connect your wallet to view your credentials.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="loading"><span>Loading credentials</span></div>';
    
    try {
        const credentialIds = await contract.getStudentCredentialIds(userAddress);
        
        if (credentialIds.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.6;">📜</div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-primary);">No Credentials Yet</h3>
                    <p>You don't have any credentials yet. Ask an issuer to issue you a credential!</p>
                </div>
            `;
            return;
        }
        
        const credentials = await Promise.all(
            credentialIds.map(async (id) => {
                const cred = await contract.getCredential(id);
                const isValid = await contract.verifyCredential(id);
                return {
                    id: cred.id.toString(),
                    issuer: cred.issuer,
                    student: cred.student,
                    credentialType: cred.credentialType,
                    institutionName: cred.institutionName,
                    issueDate: cred.issueDate.toString(),
                    expiryDate: cred.expiryDate.toString(),
                    revoked: cred.revoked,
                    metadataURI: cred.metadataURI,
                    commitment: cred.commitment || ethers.constants.HashZero,
                    isValid: isValid
                };
            })
        );
        
        // Store credentials for ZKG proof generation
        credentials.forEach(cred => {
            storedCredentials[cred.id] = cred;
        });
        
        container.innerHTML = credentials.map(cred => createCredentialCard(cred)).join('');
        
    } catch (error) {
        console.error('Error loading credentials:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.6;">⚠️</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--danger-color);">Error Loading Credentials</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function createCredentialCard(credential) {
    const status = getCredentialStatus(credential);
    const statusText = {
        'valid': 'Valid',
        'expired': 'Expired',
        'revoked': 'Revoked'
    };
    const badgeClass = {
        'valid': 'badge-valid',
        'expired': 'badge-expired',
        'revoked': 'badge-revoked'
    };
    
    return `
        <div class="credential-card">
            <div class="credential-header">
                <div class="credential-type">${escapeHtml(credential.credentialType)}</div>
                <div class="credential-badge ${badgeClass[status]}">${statusText[status]}</div>
            </div>
            <div class="credential-info">
                <div class="credential-info-item">
                    <strong>Institution:</strong>
                    <span>${escapeHtml(credential.institutionName)}</span>
                </div>
                <div class="credential-info-item">
                    <strong>Issued:</strong>
                    <span>${formatDate(credential.issueDate)}</span>
                </div>
                <div class="credential-info-item">
                    <strong>Expires:</strong>
                    <span>${formatDate(credential.expiryDate)}</span>
                </div>
                ${credential.metadataURI ? `
                <div class="credential-info-item">
                    <strong>Metadata:</strong>
                    <a href="${escapeHtml(credential.metadataURI)}" target="_blank" style="color: var(--primary-color);">View</a>
                </div>
                ` : ''}
            </div>
            <div class="credential-id">
                Credential ID: ${credential.id}
            </div>
            ${credential.commitment && credential.commitment !== ethers.constants.HashZero ? `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <button onclick="generateZKGProof(${credential.id})" class="btn-primary" style="width: 100%; padding: 0.75rem; font-size: 0.9rem; margin: 0;">
                    🔐 Generate ZKG Proof
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// ============================================================================
// ISSUER PORTAL FUNCTIONALITY
// ============================================================================
document.getElementById('issueCredentialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isWalletConnected()) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const statusDiv = document.getElementById('issuerStatus');
    statusDiv.className = 'status-message';
    statusDiv.textContent = 'Processing...';
    statusDiv.style.display = 'block';
    
    try {
        const isIssuer = await contract.registeredIssuers(userAddress);
        if (!isIssuer) {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = 'Error: Your address is not registered as an issuer. Contact the contract owner to register your institution.';
            return;
        }
        
        const studentAddress = document.getElementById('studentAddress').value.trim();
        const credentialType = document.getElementById('credentialType').value.trim();
        const institutionName = document.getElementById('institutionName').value.trim();
        const expiryDateInput = document.getElementById('expiryDate').value;
        const metadataURI = document.getElementById('metadataURI').value.trim();
        
        if (!ethers.utils.isAddress(studentAddress)) {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = 'Error: Invalid student wallet address.';
            return;
        }
        
        let expiryDate = 0;
        if (expiryDateInput) {
            expiryDate = Math.floor(new Date(expiryDateInput).getTime() / 1000);
        }
        
        // Generate ZKG commitment
        const commitmentData = {
            credentialType: credentialType,
            institutionName: institutionName,
            issueDate: Math.floor(Date.now() / 1000),
            studentAddress: studentAddress,
            issuerAddress: userAddress
        };
        const commitment = generateCommitment(commitmentData);
        
        // Multi-Sig Credential Issuance - Yeh karna baki h
        const enableMultiSig = document.getElementById('enableMultiSig').checked;
        if (enableMultiSig) {
            const requiredSignatures = parseInt(document.getElementById('requiredSignatures').value) || 2;
            const signerAddresses = document.getElementById('signerAddresses').value.split(',').map(addr => addr.trim());
            
            // Yeh karna baki h - Implement multi-sig issuance logic
            console.log('Multi-sig issuance requested:', { requiredSignatures, signerAddresses });
        }
        
        // Expirable/Revocable Credentials - Yeh karna baki h
        const enableRevocation = document.getElementById('enableRevocation').checked;
        const enableAutoExpiry = document.getElementById('enableAutoExpiry').checked;
        
        if (enableRevocation || enableAutoExpiry) {
            // Yeh karna baki h - Add revocation and expiry flags to credential issuance
            console.log('Revocation/Expiry settings:', { enableRevocation, enableAutoExpiry });
        }
        
        const tx = await contract.issueCredential(
            studentAddress,
            credentialType,
            institutionName,
            expiryDate,
            metadataURI || '',
            commitment
        );
        
        statusDiv.className = 'status-message';
        statusDiv.textContent = `Transaction sent! Waiting for confirmation... (Tx: ${tx.hash})`;
        
        await tx.wait();
        
        statusDiv.className = 'status-message success';
        statusDiv.textContent = `✅ Credential issued successfully! Transaction confirmed.`;
        
        document.getElementById('issueCredentialForm').reset();
        
    } catch (error) {
        console.error('Error issuing credential:', error);
        statusDiv.className = 'status-message error';
        statusDiv.textContent = `Error: ${error.message}`;
    }
});

// ============================================================================
// ZKG PROOF GENERATION
// ============================================================================
async function generateZKGProof(credentialId) {
    if (!isWalletConnected()) {
        alert('Please connect your wallet first!');
        return;
    }
    
    try {
        // Get credential from stored credentials or fetch from contract
        let credential = storedCredentials[credentialId];
        
        if (!credential) {
            const cred = await contract.getCredential(credentialId);
            credential = {
                id: cred.id.toString(),
                issuer: cred.issuer,
                student: cred.student,
                credentialType: cred.credentialType,
                institutionName: cred.institutionName,
                issueDate: cred.issueDate.toString(),
                expiryDate: cred.expiryDate.toString(),
                revoked: cred.revoked,
                metadataURI: cred.metadataURI,
                commitment: cred.commitment || ethers.constants.HashZero
            };
        }
        
        if (!credential.commitment || credential.commitment === ethers.constants.HashZero) {
            alert('This credential does not have a ZKG commitment.');
            return;
        }
        
        // Show disclosure options dialog
        const options = {
            showType: true,
            showInstitution: confirm('Include institution name in proof?'),
            showIssueDate: confirm('Include issue date in proof?'),
            showExpiryDate: confirm('Include expiry date in proof?')
        };
        
        const proof = createSelectiveDisclosureProof({
            credentialId: credential.id,
            credentialType: credential.credentialType,
            institutionName: credential.institutionName,
            issueDate: credential.issueDate,
            expiryDate: credential.expiryDate,
            student: credential.student,
            issuer: credential.issuer,
            commitment: credential.commitment
        }, options);
        
        // Display proof details
        const proofDetails = `
            <div style="background: rgba(6, 182, 212, 0.1); padding: 1.5rem; border-radius: 0.75rem; margin-top: 1rem; border: 1px solid rgba(6, 182, 212, 0.3);">
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">🔐 ZKG Proof Generated</h3>
                <div style="display: grid; gap: 0.75rem; font-family: monospace; font-size: 0.85rem;">
                    <div><strong>Commitment:</strong><br><span style="word-break: break-all;">${proof.commitment}</span></div>
                    <div><strong>Proof Hash:</strong><br><span style="word-break: break-all;">${proof.proofHash}</span></div>
                    <div><strong>Nonce:</strong><br>${proof.nonce.toString()}</div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <strong>Disclosed Fields:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            ${proof.disclosedFields.showType ? '<li>Credential Type</li>' : ''}
                            ${proof.disclosedFields.showInstitution ? '<li>Institution Name</li>' : ''}
                            ${proof.disclosedFields.showIssueDate ? '<li>Issue Date</li>' : ''}
                            ${proof.disclosedFields.showExpiryDate ? '<li>Expiry Date</li>' : ''}
                        </ul>
                    </div>
                    <button onclick="copyZKGProof('${proof.commitment}', '${proof.proofHash}', '${proof.nonce.toString()}')" class="btn-primary" style="margin-top: 1rem; width: 100%;">
                        Copy Proof Details
                    </button>
                </div>
            </div>
        `;
        
        // Find the credential card and append proof
        const cards = document.querySelectorAll('.credential-card');
        cards.forEach(card => {
            const idElement = card.querySelector('.credential-id');
            if (idElement && idElement.textContent.includes(credentialId)) {
                const existingProof = card.querySelector('.zkg-proof');
                if (existingProof) {
                    existingProof.remove();
                }
                const proofDiv = document.createElement('div');
                proofDiv.className = 'zkg-proof';
                proofDiv.innerHTML = proofDetails;
                card.appendChild(proofDiv);
            }
        });
        
    } catch (error) {
        console.error('Error generating ZKG proof:', error);
        alert('Error generating ZKG proof: ' + error.message);
    }
}

function copyZKGProof(commitment, proofHash, nonce) {
    const proofText = `Commitment: ${commitment}\nProof Hash: ${proofHash}\nNonce: ${nonce}`;
    navigator.clipboard.writeText(proofText).then(() => {
        alert('ZKG Proof details copied to clipboard!');
    });
}

// ============================================================================
// VERIFIER TOOL FUNCTIONALITY
// ============================================================================
document.getElementById('verifyCredentialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resultDiv = document.getElementById('verificationResult');
    resultDiv.className = 'verification-result';
    resultDiv.innerHTML = '<div class="loading">Verifying credential...</div>';
    resultDiv.classList.add('show');
    
    try {
        const credentialId = document.getElementById('credentialId').value;
        
        if (!CONFIG.contractAddress || !CONFIG.contractABI) {
            throw new Error('Contract not deployed. Please deploy the contract first.');
        }
        
        const readOnlyProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const readOnlyContract = new ethers.Contract(
            CONFIG.contractAddress,
            CONFIG.contractABI,
            readOnlyProvider
        );
        
        const credential = await readOnlyContract.getCredential(credentialId);
        const isValid = await readOnlyContract.verifyCredential(credentialId);
        const isIssuerRegistered = await readOnlyContract.registeredIssuers(credential.issuer);
        
        if (isValid && isIssuerRegistered) {
            resultDiv.className = 'verification-result valid show';
            resultDiv.innerHTML = `
                <div class="verification-header">
                    <div class="verification-icon">✅</div>
                    <div class="verification-title">Credential Verified</div>
                </div>
                <p style="color: var(--success-color); font-size: 1.1rem; margin-bottom: 1rem;">
                    This credential is valid and authentic.
                </p>
                <div class="verification-details">
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential ID</div>
                        <div class="verification-detail-value">${credential.id.toString()}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential Type</div>
                        <div class="verification-detail-value">${escapeHtml(credential.credentialType)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Institution</div>
                        <div class="verification-detail-value">${escapeHtml(credential.institutionName)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Student Address</div>
                        <div class="verification-detail-value">${formatAddress(credential.student)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Issuer Address</div>
                        <div class="verification-detail-value">${formatAddress(credential.issuer)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Issue Date</div>
                        <div class="verification-detail-value">${formatDate(credential.issueDate)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Expiry Date</div>
                        <div class="verification-detail-value">${formatDate(credential.expiryDate)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Status</div>
                        <div class="verification-detail-value">${credential.revoked ? 'Revoked' : 'Active'}</div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.className = 'verification-result invalid show';
            let reason = '';
            if (credential.revoked) reason = 'This credential has been revoked by the issuer.';
            else if (isExpired(credential.expiryDate)) reason = 'This credential has expired.';
            else if (!isIssuerRegistered) reason = 'The issuer is not registered in the system.';
            else reason = 'This credential is not valid.';
            
            resultDiv.innerHTML = `
                <div class="verification-header">
                    <div class="verification-icon">❌</div>
                    <div class="verification-title">Credential Not Verified</div>
                </div>
                <p style="color: var(--danger-color); font-size: 1.1rem; margin-bottom: 1rem;">
                    ${reason}
                </p>
                <div class="verification-details">
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential ID</div>
                        <div class="verification-detail-value">${credential.id.toString()}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential Type</div>
                        <div class="verification-detail-value">${escapeHtml(credential.credentialType)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Institution</div>
                        <div class="verification-detail-value">${escapeHtml(credential.institutionName)}</div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error verifying credential:', error);
        resultDiv.className = 'verification-result invalid show';
        resultDiv.innerHTML = `
            <div class="verification-header">
                <div class="verification-icon">❌</div>
                <div class="verification-title">Verification Failed</div>
            </div>
            <p style="color: var(--danger-color);">
                Error: ${error.message}
            </p>
        `;
    }
});

// ZKG Proof Verification Form
document.getElementById('verifyZKGForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resultDiv = document.getElementById('verificationResult');
    resultDiv.className = 'verification-result';
    resultDiv.innerHTML = '<div class="loading">Verifying ZKG proof...</div>';
    resultDiv.classList.add('show');
    
    try {
        const commitment = document.getElementById('zkCommitment').value.trim();
        const proofHash = document.getElementById('zkProofHash').value.trim();
        const nonce = document.getElementById('zkNonce').value.trim();
        
        if (!CONFIG.contractAddress || !CONFIG.contractABI) {
            throw new Error('Contract not deployed. Please deploy the contract first.');
        }
        
        const readOnlyProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const readOnlyContract = new ethers.Contract(
            CONFIG.contractAddress,
            CONFIG.contractABI,
            readOnlyProvider
        );
        
        const result = await readOnlyContract.verifyZKProof(
            commitment,
            proofHash,
            nonce
        );
        
        if (result.valid) {
            const credential = await readOnlyContract.getCredential(result.credentialId);
            
            resultDiv.className = 'verification-result valid show';
            resultDiv.innerHTML = `
                <div class="verification-header">
                    <div class="verification-icon">✅</div>
                    <div class="verification-title">ZKG Proof Verified</div>
                </div>
                <p style="color: var(--success-color); font-size: 1.1rem; margin-bottom: 1rem;">
                    The zero-knowledge proof is valid. The credential exists and is authentic without revealing all details.
                </p>
                <div class="verification-details">
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential ID</div>
                        <div class="verification-detail-value">${result.credentialId.toString()}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Commitment</div>
                        <div class="verification-detail-value" style="font-family: monospace; font-size: 0.85rem;">${commitment}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Credential Type</div>
                        <div class="verification-detail-value">${escapeHtml(credential.credentialType)}</div>
                    </div>
                    <div class="verification-detail-item">
                        <div class="verification-detail-label">Status</div>
                        <div class="verification-detail-value">Valid (Selective Disclosure)</div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.className = 'verification-result invalid show';
            resultDiv.innerHTML = `
                <div class="verification-header">
                    <div class="verification-icon">❌</div>
                    <div class="verification-title">ZKG Proof Invalid</div>
                </div>
                <p style="color: var(--danger-color);">
                    The zero-knowledge proof could not be verified. The proof may be invalid or the credential may not exist.
                </p>
            `;
        }
        
    } catch (error) {
        console.error('Error verifying ZKG proof:', error);
        resultDiv.className = 'verification-result invalid show';
        resultDiv.innerHTML = `
            <div class="verification-header">
                <div class="verification-icon">❌</div>
                <div class="verification-title">Verification Failed</div>
            </div>
            <p style="color: var(--danger-color);">
                Error: ${error.message}
            </p>
        `;
    }
});

// ============================================================================
// QR CODE OFFLINE VERIFICATION
// Yeh karna baki h
// ============================================================================
document.getElementById('generateQRForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const credentialId = document.getElementById('qrCredentialId').value;
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrDisplay = document.getElementById('qrCodeDisplay');
    
    try {
        if (!CONFIG.contractAddress || !CONFIG.contractABI) {
            throw new Error('Contract not deployed.');
        }
        
        const readOnlyProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        const readOnlyContract = new ethers.Contract(
            CONFIG.contractAddress,
            CONFIG.contractABI,
            readOnlyProvider
        );
        
        const credential = await readOnlyContract.getCredential(credentialId);
        
        // Generate QR code data (simplified - in production use proper QR library)
        const qrData = JSON.stringify({
            credentialId: credential.id.toString(),
            commitment: credential.commitment,
            verificationUrl: `${window.location.origin}/verify?credentialId=${credential.id}`,
            timestamp: Date.now()
        });
        
        // Display QR code (using placeholder - integrate QR code library)
        qrDisplay.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 0.5rem; display: inline-block;">
                <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc;">
                    <div style="text-align: center; color: #666;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">📱</div>
                        <div style="font-size: 0.85rem;">QR Code</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem;">(Library Integration Needed)</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; font-family: monospace; font-size: 0.75rem; word-break: break-all; color: var(--text-secondary);">
                    ${qrData.substring(0, 50)}...
                </div>
            </div>
        `;
        qrContainer.style.display = 'block';
        
    } catch (error) {
        alert('Error generating QR code: ' + error.message);
    }
});

function downloadQRCode() {
    // Yeh karna baki h - Implement QR code download functionality
    // alert('QR code download functionality - Yeh karna baki h');
}

// ============================================================================
// DAO-GOVERNED USER REGISTRY PORTAL
// Yeh karna baki h
// ============================================================================
document.getElementById('proposeIssuerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const issuerAddress = document.getElementById('proposedIssuerAddress').value.trim();
    const institutionName = document.getElementById('proposedInstitutionName').value.trim();
    const description = document.getElementById('proposalDescription').value.trim();
    
    // Yeh karna baki h - Implement DAO proposal creation
    alert(`DAO Proposal Creation - Yeh karna baki h\n\nIssuer: ${issuerAddress}\nInstitution: ${institutionName}\nDescription: ${description}`);
    
    // Placeholder: Store proposal locally (in production, submit to DAO contract)
    const proposal = {
        id: Date.now(),
        issuerAddress: issuerAddress,
        institutionName: institutionName,
        description: description,
        proposer: userAddress || '0x...',
        votesFor: 0,
        votesAgainst: 0,
        status: 'active',
        createdAt: Date.now()
    };
    
    displayProposal(proposal);
    document.getElementById('proposeIssuerForm').reset();
});

function displayProposal(proposal) {
    const proposalsContainer = document.getElementById('activeProposals');
    
    if (proposalsContainer.querySelector('.empty-state')) {
        proposalsContainer.innerHTML = '';
    }
    
    const proposalCard = document.createElement('div');
    proposalCard.className = 'proposal-card';
    proposalCard.style.cssText = 'background: rgba(15, 23, 42, 0.6); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid var(--border-color); margin-bottom: 1rem;';
    proposalCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
                <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">${escapeHtml(proposal.institutionName)}</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">${escapeHtml(proposal.description)}</p>
            </div>
            <div style="padding: 0.5rem 1rem; background: rgba(6, 182, 212, 0.2); border-radius: 0.5rem; color: var(--primary-color); font-size: 0.85rem; font-weight: 600;">
                ${proposal.status}
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem;">
            <div>
                <div style="color: var(--text-secondary);">Votes For</div>
                <div style="color: var(--success-color); font-weight: 600;">${proposal.votesFor}</div>
            </div>
            <div>
                <div style="color: var(--text-secondary);">Votes Against</div>
                <div style="color: var(--danger-color); font-weight: 600;">${proposal.votesAgainst}</div>
            </div>
            <div>
                <div style="color: var(--text-secondary);">Issuer Address</div>
                <div style="font-family: monospace; font-size: 0.85rem;">${formatAddress(proposal.issuerAddress)}</div>
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
            <button onclick="voteProposal(${proposal.id}, true)" class="btn-primary" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;">Vote For</button>
            <button onclick="voteProposal(${proposal.id}, false)" class="btn-primary" style="flex: 1; padding: 0.5rem; font-size: 0.9rem; background: var(--danger-color);">Vote Against</button>
        </div>
    `;
    
    proposalsContainer.appendChild(proposalCard);
}

function voteProposal(proposalId, vote) {
    // Yeh karna baki h - Implement DAO voting functionality
    alert(`Voting on proposal ${proposalId} - ${vote ? 'For' : 'Against'} - Yeh karna baki h`);
}

async function loadRegisteredIssuers() {
    // Yeh karna baki h - Load registered issuers from contract
    const issuersContainer = document.getElementById('registeredIssuers');
    issuersContainer.innerHTML = `
        <div class="empty-state">
            
        </div>
    `;
}

// ============================================================================
// MULTI-SIG CREDENTIAL ISSUANCE
// Yeh karna baki h
// ============================================================================
document.getElementById('enableMultiSig').addEventListener('change', function(e) {
    const multiSigFields = document.getElementById('multiSigFields');
    multiSigFields.style.display = e.target.checked ? 'block' : 'none';
});

// ============================================================================
// ANONYMOUS SKILL PROOFS
// Yeh karna baki h
// ============================================================================
async function generateAnonymousProof() {
    if (!isWalletConnected()) {
        alert('Please connect your wallet first!');
        return;
    }
    
    // Yeh karna baki h - Implement anonymous proof generation
    const container = document.getElementById('anonymousProofContainer');
    const display = document.getElementById('anonymousProofDisplay');
    
    container.style.display = 'block';
    display.innerHTML = `
        <div style="background: rgba(139, 92, 246, 0.1); padding: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(139, 92, 246, 0.3);">
            <h4 style="color: var(--secondary-color); margin-bottom: 1rem;">🎭 Anonymous Skill Proof</h4>
            <div style="font-family: monospace; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                <div><strong>Proof Hash:</strong> 0x${Math.random().toString(16).substring(2, 66)}</div>
                <div style="margin-top: 0.5rem;"><strong>Status:</strong> Generated (Yeh karna baki h - Full implementation needed)</div>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary);">
                This proof verifies your skills without revealing your identity. Share this proof with verifiers.
            </p>
            <button onclick="copyAnonymousProof()" class="btn-primary" style="margin-top: 1rem; width: 100%;">
                Copy Anonymous Proof
            </button>
        </div>
    `;
}

function copyAnonymousProof() {
    // Yeh karna baki h - Copy anonymous proof to clipboard
    // alert('Anonymous proof copied - Yeh karna baki h');
}

// ============================================================================
// EDTECH PLATFORM INTEROPERABILITY
// Yeh karna baki h
// ============================================================================
async function connectEdTech(platform) {
    // Yeh karna baki h - Implement edTech platform integration
    const statusDiv = document.getElementById('edTechStatus');
    
    statusDiv.innerHTML = `
        <div style="padding: 1rem; background: rgba(20, 184, 166, 0.1); border-radius: 0.5rem; border: 1px solid rgba(20, 184, 166, 0.3);">
            <div style="color: var(--secondary-color); font-weight: 600; margin-bottom: 0.5rem;">
                Connecting to ${platform.charAt(0).toUpperCase() + platform.slice(1)}...
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                Integration with ${platform} - Yeh karna baki h (API integration needed)
            </div>
        </div>
    `;
    
    // Simulate connection delay
    setTimeout(() => {
        statusDiv.innerHTML = `
            <div style="padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 0.5rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                <div style="color: var(--success-color); font-weight: 600;">
                    ✅ Connected to ${platform.charAt(0).toUpperCase() + platform.slice(1)}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Credentials will be synced
                </div>
            </div>
        `;
    }, 2000);
}

// ============================================================================
// ISSUER REPUTATION SCORE
// Yeh karna baki h
// ============================================================================
async function loadIssuerReputation() {
    if (!isWalletConnected()) {
        return;
    }
    
    // Yeh karna baki h - Load reputation from contract/backend
    const reputationDiv = document.getElementById('issuerReputation');
    
    // Placeholder reputation calculation
    const reputation = {
        score: 85,
        totalCredentials: 0,
        verifiedRate: 0,
        revocationRate: 0
    };
    
    try {
        if (contract) {
            const credentialIds = await contract.getIssuerCredentialIds(userAddress);
            reputation.totalCredentials = credentialIds.length;
            
            // Calculate reputation (simplified)
            if (credentialIds.length > 0) {
                reputation.score = Math.min(100, 70 + (credentialIds.length * 2));
            }
        }
    } catch (error) {
        console.error('Error loading reputation:', error);
    }
    
    reputationDiv.innerHTML = `
        <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">${reputation.score}</div>
        <div>
            <div style="font-weight: 600;">Issuer Rating</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${reputation.totalCredentials} credentials issued
                <br>
                (Yeh karna baki h - Full reputation algorithm needed)
            </div>
        </div>
    `;
}

// ============================================================================
// EXPIRABLE/REVOCABLE CREDENTIALS UI
// Yeh karna baki h
// ============================================================================
// Enhanced credential card display with expiry and revocation status
function enhanceCredentialCardWithExpiry(credential) {
    // This is already handled in createCredentialCard, but adding comment for clarity
    // Yeh karna baki h - Add expiry countdown timer and revocation status display
    return '';
}

// ============================================================================
// MAIN APPLICATION INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.getAttribute('data-page');
            
            // Check role-based access
            if (userRole === 'user' && (targetPage === 'issuer' || targetPage === 'verifier' || targetPage === 'dao')) {
                alert('Access denied. You are logged in as a user. Please logout and login with the appropriate role to access this page.');
                return;
            }
            
            if (userRole === 'issuer' && (targetPage !== 'issuer')) {
                alert('Access denied. Issuers can only access the Issuer Portal. Please logout and login with the appropriate role to access this page.');
                return;
            }
            
            if (userRole === 'verifier' && (targetPage !== 'verifier')) {
                alert('Access denied. Verifiers can only access the Verifier Tool. Please logout and login with the appropriate role to access this page.');
                return;
            }
            
            if (userRole === 'dao' && (targetPage !== 'dao')) {
                alert('Access denied. DAO members can only access the DAO Registry. Please logout and login with the appropriate role to access this page.');
                return;
            }
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(`${targetPage}-page`).classList.add('active');
            
            // Update wallet UI based on active page
            updateWalletUI();
            
            if (targetPage === 'student' && isWalletConnected()) {
                loadStudentCredentials();
            } else if (targetPage === 'issuer' && isWalletConnected()) {
                loadIssuerReputation(); // Yeh karna baki h
            } else if (targetPage === 'dao') {
                loadRegisteredIssuers(); // Yeh karna baki h
            }
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Login page role selection
    const roleButtons = document.querySelectorAll('.role-btn');
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.getAttribute('data-role');
            loginWithRole(role);
        });
    });
    
    // Show login page initially (hide main portal)
    showLoginPage();
    
    // Reset user state on page load
    userRole = null;
    userAddress = null;
    
    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
                logout();
            } else {
                // If account changes, logout and require re-login
                logout();
            }
        });
    }
});
