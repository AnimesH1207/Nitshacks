const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Load contract address
  const contractInfo = JSON.parse(fs.readFileSync("./contract-address.json", "utf8"));
  const contractAddress = contractInfo.address;
  
  // Get the contract
  const CredentialsPassport = await hre.ethers.getContractFactory("CredentialsPassport");
  const passport = CredentialsPassport.attach(contractAddress);
  
  // Get signers
  const [owner, issuer] = await hre.ethers.getSigners();
  
  // Get issuer address from command line or use second account
  const issuerAddress = process.argv[2] || issuer.address;
  const institutionName = process.argv[3] || "Test Institution";
  
  console.log(`Registering issuer: ${issuerAddress}`);
  console.log(`Institution name: ${institutionName}`);
  console.log(`Using owner account: ${owner.address}`);
  
  // Register issuer
  const tx = await passport.connect(owner).registerIssuer(issuerAddress, institutionName);
  await tx.wait();
  
  console.log(`✅ Issuer registered successfully!`);
  console.log(`Transaction hash: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

