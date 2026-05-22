const fs = require('fs')
const solc = require('solc')

const source = fs.readFileSync('./PythiaRegistry.sol', 'utf8')

const input = {
  language: 'Solidity',
  sources: {
    'PythiaRegistry.sol': { content: source }
  },
  settings: {
    outputSelection: {
      '*': { '*': ['abi', 'evm.bytecode'] }
    }
  }
}

console.log('[compile] Compiling PythiaRegistry.sol...')
const output = JSON.parse(solc.compile(JSON.stringify(input)))

if (output.errors) {
  output.errors.forEach(e => {
    if (e.severity === 'error') {
      console.error('[compile] Error:', e.message)
      process.exit(1)
    }
  })
}

const contract = output.contracts['PythiaRegistry.sol']['PythiaRegistry']
const artifact = {
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object
}

fs.writeFileSync('./PythiaRegistry.json', JSON.stringify(artifact, null, 2))
console.log('[compile] ✓ Compiled successfully → PythiaRegistry.json')
console.log('[compile] ABI functions:', artifact.abi.filter(x => x.type === 'function').map(x => x.name).join(', '))