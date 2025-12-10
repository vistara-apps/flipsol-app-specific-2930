import { Connection, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const RPC = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL';

async function main() {
    console.log(`Connecting to ${RPC}`);
    console.log(`Program ID: ${PROGRAM_ID}`);

    const connection = new Connection(RPC, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);

    // 1. Fetch Global State
    const [globalPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        programId
    );

    console.log(`Global PDA: ${globalPDA.toString()}`);
    const globalAccount = await connection.getAccountInfo(globalPDA);

    if (!globalAccount) {
        console.error('❌ Global State NOT FOUND. Is the program initialized?');
        return;
    }

    const currentRound = Number(globalAccount.data.readBigUInt64LE(40));
    console.log(`✅ Global State Found. Current Round: ${currentRound}`);

    // 2. Fetch Last 5 Rounds
    const roundsToFetch = 5;
    const pdas = [];
    const ids = [];

    for (let i = 0; i < roundsToFetch; i++) {
        const rid = currentRound - i;
        if (rid <= 0) break;
        ids.push(rid);

        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(BigInt(rid), 0);
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from('round'), buf], programId);
        pdas.push(pda);
    }

    console.log(`Fetching rounds: ${ids.join(', ')}`);
    const accounts = await connection.getMultipleAccountsInfo(pdas);

    accounts.forEach((acc, i) => {
        const rid = ids[i];
        if (!acc) {
            console.log(`⚠️ Round ${rid}: Account not found`);
            return;
        }

        const data = acc.data;
        console.log(`\nRound ${rid} Raw Data Length: ${data.length}`);

        try {
            // Manual Parse Verification
            const p_roundId = Number(data.readBigUInt64LE(8));
            const p_headsTotal = Number(data.readBigUInt64LE(16));
            const p_tailsTotal = Number(data.readBigUInt64LE(24));
            const p_endsAt = Number(data.readBigInt64LE(32));
            const p_settled = data.readUInt8(40) === 1;
            const p_winningSide = data.readUInt8(41);

            console.log(`✅ Parsed Correctly:`);
            console.log(`   - ID: ${p_roundId}`);
            console.log(`   - Heads: ${p_headsTotal} (Lamports)`);
            console.log(`   - Tails: ${p_tailsTotal} (Lamports)`);
            console.log(`   - Ends: ${new Date(p_endsAt * 1000).toISOString()}`);
            console.log(`   - Settled: ${p_settled}`);
            console.log(`   - Winner: ${p_winningSide} (${p_winningSide === 0 ? 'Heads' : 'Tails'})`);

        } catch (e) {
            console.error(`❌ Parse Error for Round ${rid}:`, e);
        }
    });
}

main().catch(console.error);
