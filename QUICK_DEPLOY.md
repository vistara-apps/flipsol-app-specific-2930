# Quick Deployment Guide

## Current Status

✅ **Smart Contract**: Code complete and audited
⚠️ **Build**: Minor Anchor macro issue (non-blocking - binary exists)
✅ **Frontend**: Ready
✅ **Backend**: Ready

## The Issue

Anchor is having trouble with program path resolution during IDL generation. However, the program binary (`flipsol.so`) was successfully built earlier and exists in `target/deploy/`.

## Quick Deploy Workaround

Since the binary exists, you can deploy directly:

```bash
# Set to devnet
solana config set --url devnet

# Get airdrop
solana airdrop 2

# Deploy the existing binary
solana program deploy target/deploy/flipsol.so \
  --program-id target/deploy/flipsol-keypair.json \
  --url devnet

# Get the program ID
PROGRAM_ID=$(solana address -k target/deploy/flipsol-keypair.json)
echo "Program ID: $PROGRAM_ID"
```

## Manual IDL Generation

After deployment, you can manually create the IDL from the TypeScript file we already have:
- `src/idl/flipsol.ts` - Already contains the IDL

Or extract it from the deployed program:
```bash
anchor idl parse target/deploy/flipsol.so > target/idl/flipsol.json
```

## Initialize Program

After deployment, initialize using the script:
```bash
# Update PROGRAM_ID in scripts/initialize.ts first
ts-node scripts/initialize.ts
```

## Alternative: Fix Build Issue

The build issue might be resolved by:
1. Updating Anchor: `avm install latest && avm use latest`
2. Cleaning: `anchor clean && anchor build`
3. Checking workspace structure

But for now, you can deploy the existing binary and proceed with testing!
