const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  console.log("📦 Deploying MyToken contract...");
  const MyToken = await ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy();
  
  await myToken.waitForDeployment();
  const contractAddress = await myToken.getAddress();
  
  console.log("✅ MyToken deployed to:", contractAddress);
  console.log("👑 Contract owner:", await myToken.owner());
  
  // Verify contract info
  const name = await myToken.name();
  const symbol = await myToken.symbol();
  const decimals = await myToken.decimals();
  
  console.log("🪙 Token details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    blockNumber: await ethers.provider.getBlockNumber()
  };
  
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🔧 Next steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Update the frontend contract address");
  console.log("3. Copy the ABI to your frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });