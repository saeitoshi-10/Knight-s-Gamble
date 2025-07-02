const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔧 Generating ABI files...");

  // Compile contracts first
  await hre.run('compile');

  // Read the compiled contract
  const contractPath = path.join(__dirname, '../artifacts/contracts/MyToken.sol/MyToken.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  // Extract ABI
  const abi = contractJson.abi;

  // Save ABI to server directory
  const serverAbiPath = path.join(__dirname, '../../server/contracts/MyToken.json');
  const serverDir = path.dirname(serverAbiPath);
  
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  fs.writeFileSync(serverAbiPath, JSON.stringify({ abi }, null, 2));
  console.log("✅ Server ABI saved to:", serverAbiPath);

  // Save ABI to client directory
  const clientAbiPath = path.join(__dirname, '../../client/src/components/MyToken.json');
  const clientDir = path.dirname(clientAbiPath);
  
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }

  fs.writeFileSync(clientAbiPath, JSON.stringify({ abi }, null, 2));
  console.log("✅ Client ABI saved to:", clientAbiPath);

  console.log("🎉 ABI generation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI generation failed:", error);
    process.exit(1);
  });