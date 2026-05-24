const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets')
const { ethers } = require('ethers')
const fs = require('fs')
const path = require('path')
const { getWallet, setWallet, getBalance } = require('./store')

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET
})

const ARC_RPC = process.env.ARC_RPC || 'https://rpc.testnet.arc.network'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY

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

function getContract() {
  const provider = new ethers.JsonRpcProvider(ARC_RPC)
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
  const abi = getContractABI()
  if (!abi) throw new Error('Contract ABI not found')
  return new ethers.Contract(CONTRACT_ADDRESS, abi, wallet)
}

let walletSetId = process.env.CIRCLE_WALLET_SET_ID || null

async function getOrCreateWalletSet() {
  if (walletSetId) return walletSetId
  const response = await client.createWalletSet({ name: 'Pythia Users' })
  walletSetId = response.data?.walletSet?.id
  console.log('[circleWallet] Created wallet set:', walletSetId)
  return walletSetId
}

async function createWalletForEmail(email) {
  const setId = await getOrCreateWalletSet()
  const response = await client.createWallets({
    accountType: 'EOA',
    blockchains: ['ARC-TESTNET'],
    count: 1,
    walletSetId: setId,
    metadata: [{ name: email, refId: email.toLowerCase() }]
  })

  const wallet = response.data?.wallets?.[0]
  if (!wallet) throw new Error('Wallet creation failed')

  const walletData = {
    walletId: wallet.id,
    address: wallet.address,
    email: email.toLowerCase(),
    createdAt: new Date().toISOString()
  }

  await setWallet(email, walletData)
  return walletData
}

async function registerOnContract(address) {
  try {
    const contract = getContract()
    const isRegistered = await contract.isRegistered(address)
    if (isRegistered) {
      console.log('[circleWallet] Already registered onchain:', address)
      return false
    }
    const tx = await contract.registerWallet(address, { gasLimit: 300000 })
    await tx.wait()
    console.log('[circleWallet] Registered onchain:', address)
    return true
  } catch (err) {
    console.error('[circleWallet] Contract registration failed:', err.message)
    return false
  }
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

async function connectWallet(email) {
  if (!email || !email.includes('@')) throw new Error('Invalid email address')

  const normalizedEmail = email.toLowerCase().trim()
  let walletData = await getWallet(normalizedEmail)
  let isNew = false

  if (!walletData) {
    console.log('[circleWallet] New user, creating wallet for:', normalizedEmail)
    walletData = await createWalletForEmail(normalizedEmail)
    isNew = true
    await setBalance(walletData.address, 1000)
  } else {
    console.log('[circleWallet] Returning user:', normalizedEmail)
  }

  registerOnContract(walletData.address).catch(() => {})

  const virtualBalance = await getBalance(walletData.address)

  return {
    isNew,
    email: normalizedEmail,
    walletId: walletData.walletId,
    address: walletData.address,
    virtualBalance,
    createdAt: walletData.createdAt
  }
}

async function recordExecution(address, betSizeUsdc, direction) {
  try {
    const contract = getContract()
    const betSizeOnchain = Math.floor(betSizeUsdc * 1e6)
    const tx = await contract.recordExecution(
      address, betSizeOnchain, direction, { gasLimit: 200000 }
    )
    await tx.wait()
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
