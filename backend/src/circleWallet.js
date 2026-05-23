const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets')
const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET
})

const ARC_RPC = process.env.ARC_RPC || 'https://rpc.testnet.arc.network'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY
const STARTING_BALANCE = 1000 * 1e6 // $1000 in USDC 6 decimals

// Load contract ABI
function getContractABI() {
  try {
    const deploymentPath = path.join(__dirname, '../../contract/deployment.json')
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.abi
  } catch {
    console.error('[circleWallet] Could not load ABI from deployment.json')
    return null
  }
}

// Get contract instance
function getContract() {
  const provider = new ethers.JsonRpcProvider(ARC_RPC)
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
  const abi = getContractABI()
  if (!abi) throw new Error('Contract ABI not found')
  return new ethers.Contract(CONTRACT_ADDRESS, abi, wallet)
}

// Get or create wallet set
let walletSetId = process.env.CIRCLE_WALLET_SET_ID || null

async function getOrCreateWalletSet() {
  if (walletSetId) return walletSetId

  try {
    const response = await client.createWalletSet({
      name: 'Pythia Users'
    })
    walletSetId = response.data?.walletSet?.id
    console.log('[circleWallet] Created wallet set:', walletSetId)
    return walletSetId
  } catch (err) {
    console.error('[circleWallet] Failed to create wallet set:', err.message)
    throw err
  }
}

// Simple in-memory email → wallet mapping
// In production this would be a database
const emailWalletMap = {}

async function getWalletByEmail(email) {
  return emailWalletMap[email.toLowerCase()] || null
}

async function createWalletForEmail(email) {
  const setId = await getOrCreateWalletSet()

  const response = await client.createWallets({
    accountType: 'SCA',
    blockchains: ['ARC-TESTNET'],
    count: 1,
    walletSetId: setId,
    metadata: [{ name: email, refId: email.toLowerCase() }]
  })

  const wallet = response.data?.wallets?.[0]
  if (!wallet) throw new Error('Wallet creation failed')

  emailWalletMap[email.toLowerCase()] = {
    walletId: wallet.id,
    address: wallet.address,
    email: email.toLowerCase(),
    createdAt: new Date().toISOString()
  }

  return emailWalletMap[email.toLowerCase()]
}

async function registerOnContract(address) {
  const contract = getContract()

  // Check if already registered
  const isRegistered = await contract.isRegistered(address)
  if (isRegistered) {
    console.log('[circleWallet] Already registered onchain:', address)
    return false
  }

  // Register wallet
  const tx = await contract.registerWallet({ gasLimit: 200000 })
  await tx.wait()
  console.log('[circleWallet] Registered onchain:', address, 'tx:', tx.hash)
  return true
}

async function getOnchainData(address) {
  try {
    const contract = getContract()
    const data = await contract.getWallet(address)
    return {
      registered: data[0],
      virtualBalance: Number(data[1]) / 1e6,
      totalExecutions: Number(data[2]),
      totalSkips: Number(data[3]),
      registeredAt: Number(data[4]),
      lastActiveAt: Number(data[5])
    }
  } catch (err) {
    console.error('[circleWallet] Failed to get onchain data:', err.message)
    return null
  }
}

// Main function — check email, return wallet info
async function connectWallet(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address')
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Check if we have a wallet for this email
  let walletData = await getWalletByEmail(normalizedEmail)
  let isNew = false

  if (!walletData) {
    // New user — create wallet
    console.log('[circleWallet] New user, creating wallet for:', normalizedEmail)
    walletData = await createWalletForEmail(normalizedEmail)
    isNew = true
  } else {
    console.log('[circleWallet] Returning user:', normalizedEmail)
  }

  // Get onchain data
  let onchain = await getOnchainData(walletData.address)

  // If new or not registered onchain, register
  if (!onchain || !onchain.registered) {
    await registerOnContract(walletData.address)
    onchain = await getOnchainData(walletData.address)
  }

  return {
    isNew,
    email: normalizedEmail,
    walletId: walletData.walletId,
    address: walletData.address,
    virtualBalance: onchain?.virtualBalance || 1000,
    totalExecutions: onchain?.totalExecutions || 0,
    totalSkips: onchain?.totalSkips || 0,
    registeredAt: onchain?.registeredAt || Date.now() / 1000,
    createdAt: walletData.createdAt
  }
}

async function recordExecution(address, betSizeUsdc, direction) {
  try {
    const contract = getContract()
    const betSizeOnchain = Math.floor(betSizeUsdc * 1e6)
    const tx = await contract.recordExecution(
      address,
      betSizeOnchain,
      direction,
      { gasLimit: 200000 }
    )
    await tx.wait()
    console.log('[circleWallet] Execution recorded onchain for:', address)
    return tx.hash
  } catch (err) {
    console.error('[circleWallet] Failed to record execution:', err.message)
    return null
  }
}

async function recordSkip(address, reason) {
  try {
    const contract = getContract()
    const tx = await contract.recordSkip(address, reason, { gasLimit: 200000 })
    await tx.wait()
    console.log('[circleWallet] Skip recorded onchain for:', address)
    return tx.hash
  } catch (err) {
    console.error('[circleWallet] Failed to record skip:', err.message)
    return null
  }
}

module.exports = {
  connectWallet,
  getOnchainData,
  recordExecution,
  recordSkip
}