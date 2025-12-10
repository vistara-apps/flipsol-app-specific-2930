import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram, Connection, Keypair, TransactionInstruction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROGRAM_ID = new PublicKey("BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL");

async function main() {
  // Configure the client
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet from Solana CLI config
  const walletPath = process.env.ANCHOR_WALLET || path.join(process.env.HOME!, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  console.log("🚀 Initializing FlipSOL program...");
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  // Get PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );

  const [treasury] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    PROGRAM_ID
  );

  const [jackpot] = PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot")],
    PROGRAM_ID
  );

  console.log("Global State:", globalState.toString());
  console.log("Treasury:", treasury.toString());
  console.log("Jackpot:", jackpot.toString());

  // Initialize with 2% rake and 1% jackpot
  const rakeBps = 200; // 2%
  const jackpotBps = 100; // 1%

  // Build instruction data manually
  // Initialize discriminator: sha256("global:initialize")[0..8]
  const instructionDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const rakeBpsBuffer = Buffer.allocUnsafe(2);
  rakeBpsBuffer.writeUInt16LE(rakeBps, 0);
  const jackpotBpsBuffer = Buffer.allocUnsafe(2);
  jackpotBpsBuffer.writeUInt16LE(jackpotBps, 0);
  
  const instructionData = Buffer.concat([
    instructionDiscriminator,
    rakeBpsBuffer,
    jackpotBpsBuffer,
  ]);

  const accounts = [
    { pubkey: globalState, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: jackpot, isSigner: false, isWritable: true },
    { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const transaction = new anchor.web3.Transaction().add(
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: accounts,
      data: instructionData,
    })
  );

  try {
    const tx = await provider.sendAndConfirm(transaction);
    console.log("✅ Initialization successful!");
    console.log("Transaction signature:", tx);
    console.log("\n📊 Configuration:");
    console.log(`  Rake: ${rakeBps} bps (${rakeBps / 100}%)`);
    console.log(`  Jackpot: ${jackpotBps} bps (${jackpotBps / 100}%)`);
  } catch (error: any) {
    console.error("❌ Initialization failed:", error);
    if (error.logs) {
      console.error("Error logs:", error.logs);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
