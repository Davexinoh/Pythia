require('dotenv').config()
const { ethers } = require('ethers')
const fs = require('fs')

// Arc testnet RPC
const ARC_TESTNET_RPC = 'https://rpc.testnet.arc.network'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY

async function deploy() {
  if (!PRIVATE_KEY) {
    console.error('DEPLOYER_PRIVATE_KEY not set in .env')
    process.exit(1)
  }

  console.log('[deploy] Connecting to Arc testnet...')
  const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('[deploy] Deployer address:', wallet.address)

  const balance = await provider.getBalance(wallet.address)
console.log('[deploy] USDC Balance:', ethers.formatUnits(balance, 6), 'USDC')

  if (balance === 0n) {
    console.error('[deploy] No balance — fund this address on Arc testnet faucet first')
    console.log('[deploy] Faucet: https://faucet.circle.com')
    process.exit(1)
  }

  // Contract bytecode and ABI — compile with solc
  console.log('[deploy] Loading compiled contract...')

  const artifact = JSON.parse(fs.readFileSync('./PythiaRegistry.json', 'utf8'))
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet)

  console.log('[deploy] Deploying PythiaRegistry...')
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log('[deploy] ✓ PythiaRegistry deployed at:', address)

  // Save deployment info
  const deployment = {
    address,
    deployer: wallet.address,
    network: 'arc-testnet',
    deployedAt: new Date().toISOString(),
    abi: artifact.abi
  }

  fs.writeFileSync('./deployment.json', JSON.stringify(deployment, null, 2))
  console.log('[deploy] Saved to deployment.json')

  // Also save address for frontend
  fs.writeFileSync('./contract-address.txt', address)
  console.log('[deploy] Contract address:', address)
}

deploy().catch(console.error)