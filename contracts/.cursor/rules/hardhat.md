# Hedera Smart Contract Development Rules

## Network

- Chain ID: 296 (testnet), 295 (mainnet)
- RPC: https://testnet.hashio.io/api
- Use @hashgraph/hardhat-hethers or standard hardhat with hashio RPC

## Hedera-Specific

- HBAR has 8 decimals (not 18 like ETH) — tinybar = 1e-8 HBAR
- Gas limit: Hedera charges in USD via HBAR, set gasLimit explicitly (e.g. 1_000_000)
- Max contract size: 384KB (larger than EVM standard)
- Use HTS precompile (0x167) for native token operations instead of ERC-20 where possible
- IHederaTokenService interface: import from @hashgraph/smart-contracts

## Hardhat Config

- Always define hedera_testnet and hedera_mainnet networks in hardhat.config
- Use accounts from .env, never hardcode private keys
- Set gas: "auto" or explicit value — do NOT rely on estimation alone

## Security

- Check for reentrancy (use ReentrancyGuard from OpenZeppelin)
- Access control: use Ownable or AccessControl from OpenZeppelin
- No tx.origin checks
- Validate all external calls

## Testing

- Test on Hedera testnet, not local hardhat node (Hedera behavior differs)
- Use @hashgraph/sdk for JS-side test helpers
- Free testnet HBAR: https://portal.hedera.com

## Dependencies

- @hashgraph/sdk
- @hashgraph/smart-contracts (HTS precompile interfaces)
- @openzeppelin/contracts
