#!/bin/bash

set -e

echo "🚀 FlipSOL Deployment Script"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found. Please install Anchor first.${NC}"
    echo "Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install Solana CLI first.${NC}"
    exit 1
fi

# Get cluster from argument or default to devnet
CLUSTER=${1:-devnet}

echo -e "${YELLOW}📦 Building program...${NC}"
anchor build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Set cluster
echo -e "${YELLOW}🌐 Setting cluster to ${CLUSTER}...${NC}"
solana config set --url $CLUSTER

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/flipsol-keypair.json 2>/dev/null || echo "FLipSoL111111111111111111111111111111111111")

echo -e "${YELLOW}📝 Program ID: ${PROGRAM_ID}${NC}"

# Check wallet balance
BALANCE=$(solana balance | grep -o '[0-9.]*' | head -1)
echo -e "${YELLOW}💰 Wallet balance: ${BALANCE} SOL${NC}"

if [ "$CLUSTER" = "devnet" ]; then
    echo -e "${YELLOW}💧 Requesting airdrop for devnet...${NC}"
    solana airdrop 2
fi

# Deploy
echo -e "${YELLOW}🚀 Deploying to ${CLUSTER}...${NC}"
anchor deploy --provider.cluster $CLUSTER

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${GREEN}📋 Next steps:${NC}"
echo "1. Update VITE_PROGRAM_ID in .env: ${PROGRAM_ID}"
echo "2. Update PROGRAM_ID in backend/.env: ${PROGRAM_ID}"
echo "3. Run: anchor run initialize --rake-bps 200 --jackpot-bps 100"
echo ""
echo -e "${YELLOW}Program deployed to: ${PROGRAM_ID}${NC}"
