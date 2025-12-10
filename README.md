# FlipSOL - Solana Coin Flip Game

A production-ready, round-based coin flip betting game on Solana with jackpot functionality.

## Features

- 🎲 Round-based coin flip betting (Heads/Tails)
- 💰 Multi-winner proportional payout system
- 🎰 Jackpot pool with random triggers
- 🏦 House treasury with configurable rake
- 📊 Real-time leaderboard and history
- 🔐 Full Solana wallet integration
- 📱 Responsive UI with TailwindCSS
- 🚀 Production-ready backend with event indexing

## Tech Stack

### On-Chain
- **Solana** - Blockchain network
- **Anchor** - Smart contract framework (Rust)
- **PDAs** - Program Derived Accounts for state management

### Frontend
- **React** with TypeScript
- **TailwindCSS** - Styling
- **Solana Wallet Adapter** - Wallet integration
- **Anchor Client** - On-chain interactions
- **Vite** - Build tool

### Backend
- **Node.js** with TypeScript
- **Express** - API server
- **PostgreSQL** - Database
- **Prisma** - ORM
- **Event Indexer** - On-chain event listener

## Project Structure

```
flipsol-app-specific-2930/
├── programs/
│   └── flipsol/          # Anchor program (Rust)
│       └── src/
│           └── lib.rs
├── src/                  # Frontend React app
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── config/
│   └── idl/
├── backend/             # Backend API
│   ├── src/
│   │   ├── routes/
│   │   ├── indexer/
│   │   └── index.ts
│   └── prisma/
└── Anchor.toml
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Rust & Anchor CLI
- PostgreSQL database
- Solana CLI tools

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Setup Anchor Program

```bash
# Install Anchor CLI (if not installed)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build the program
anchor build

# Deploy to devnet (update PROGRAM_ID in config after deployment)
anchor deploy --provider.cluster devnet
```

### 3. Configure Environment

```bash
# Frontend - Copy and update .env.example
cp .env.example .env

# Backend - Copy and update .env.example
cp backend/.env.example backend/.env
```

Update the following in `.env`:
- `VITE_PROGRAM_ID` - Your deployed program ID
- `VITE_RPC_URL` - Solana RPC endpoint
- `DATABASE_URL` - PostgreSQL connection string
- `RPC_URL` - Solana RPC for backend
- `PROGRAM_ID` - Your deployed program ID

### 4. Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Initialize the Program

After deploying, initialize the program with:

```typescript
// Using Anchor client or CLI
anchor run initialize --rake-bps 200 --jackpot-bps 100
```

This sets:
- Rake: 2% (200 basis points)
- Jackpot: 1% (100 basis points)

### 6. Run Development Servers

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend API
cd backend
npm run dev

# Terminal 3: Event Indexer
cd backend
npm run indexer:dev
```

## Game Mechanics

### Round Flow

1. **Admin starts round** with duration in seconds
2. **Users place bets** on Heads (0) or Tails (1)
3. **Timer expires** - round closes automatically
4. **Admin closes round** - determines winner using pseudo-random logic
5. **Winners claim** proportional payouts
6. **New round starts**

### Payout Calculation

```
Total Pot = Heads Total + Tails Total
Jackpot Cut = Total Pot × jackpotBps / 10000
Rake Cut = Total Pot × rakeBps / 10000
Winner Pool = Total Pot - Jackpot Cut - Rake Cut

User Payout = (User Bet / Winning Side Total) × Winner Pool
```

### Jackpot Trigger

Jackpot randomly triggers when `blockhash mod 7777 == 1`, adding the entire jackpot pool to the winner pool.

## API Endpoints

### Rounds
- `GET /api/rounds/current` - Get current active round
- `GET /api/rounds/history` - Get round history
- `GET /api/rounds/user/:address` - Get user bet history

### Leaderboard
- `GET /api/leaderboard` - Get top winners

### Stats
- `GET /api/stats` - Get overall statistics

### Admin (requires auth)
- `GET /api/admin/metrics` - Get house metrics

## Deployment

### Frontend (Vercel)

```bash
npm run build
vercel deploy
```

### Backend

Deploy to your preferred Node.js hosting (Railway, Render, etc.):

```bash
cd backend
npm run build
npm start
```

### Program

```bash
# Mainnet deployment
anchor build
anchor deploy --provider.cluster mainnet
```

## Environment Variables

### Frontend (.env)
```
VITE_SOLANA_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=YourProgramID
VITE_API_BASE_URL=https://your-api.com/api
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=YourProgramID
PORT=3001
ADMIN_KEY=your-secret-key
```

## Security Considerations

- ✅ All state stored on-chain via PDAs
- ✅ Provably fair randomness using blockhash
- ✅ One bet per user per round enforced
- ✅ Admin-only functions protected
- ✅ Proper error handling and validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
