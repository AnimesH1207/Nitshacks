const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const CredentialsPassport = await hre.ethers.getContractFactory("CredentialsPassport");
  const passport = await CredentialsPassport.deploy();

  await passport.waitForDeployment();
  const address = await passport.getAddress();

  console.log("CredentialsPassport deployed to:", address);
  
  // Save the address to a file for frontend use
  const fs = require("fs");
  const contractInfo = {
    address: address,
    network: "localhost",
    chainId: 1337
  };
  
  fs.writeFileSync(
    "./contract-address.json",
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("Contract address saved to contract-address.json");
  
  // Register the deployer as an issuer for testing
  console.log("\nRegistering deployer as issuer...");
  const tx = await passport.registerIssuer(deployer.address, "Test University");
  await tx.wait();
  console.log("Deployer registered as issuer!");
  console.log("\nYou can now use the deployer address to issue credentials.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

