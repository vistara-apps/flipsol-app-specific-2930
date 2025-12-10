import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { PROGRAM_ID } from '../config/constants';

const UnclaimedWinnings = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [unclaimedWinnings, setUnclaimedWinnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState({});
  const [totalUnclaimed, setTotalUnclaimed] = useState(0);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUnclaimedWinnings();
    } else {
      setUnclaimedWinnings([]);
      setTotalUnclaimed(0);
    }
  }, [connected, publicKey]);

  const fetchUnclaimedWinnings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/unclaimed-winnings/${publicKey.toString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setUnclaimedWinnings(data.unclaimedWinnings);
        setTotalUnclaimed(data.totalUnclaimed);
      }
    } catch (error) {
      console.error('Error fetching unclaimed winnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimWinnings = async (roundId) => {
    if (!publicKey || !signTransaction) return;
    
    try {
      setClaiming(prev => ({ ...prev, [roundId]: true }));
      
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
      );

      const programId = new PublicKey(PROGRAM_ID);
      
      // Create PDAs
      const [globalPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        programId
      );
      
      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        programId
      );
      
      const [userBetPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_bet'), publicKey.toBuffer(), roundIdBuffer],
        programId
      );

      // Create claim instruction
      const discriminator = Buffer.from([161, 215, 24, 59, 14, 236, 242, 221]); // claim_winnings
      
      const instruction = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: globalPDA, isSigner: false, isWritable: false },
          { pubkey: roundPDA, isSigner: false, isWritable: true },
          { pubkey: userBetPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signed.serialize());
      
      console.log('Claim transaction sent:', txHash);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
      
      if (!confirmation.value.err) {
        // Success - refresh the list
        await fetchUnclaimedWinnings();
        
        // Show success message
        alert(`Successfully claimed winnings from Round ${roundId}!\nTransaction: ${txHash}`);
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error('Error claiming winnings:', error);
      alert(`Failed to claim winnings: ${error.message}`);
    } finally {
      setClaiming(prev => ({ ...prev, [roundId]: false }));
    }
  };

  if (!connected) {
    return (
      <div className="card bg-yellow-900/20 border-yellow-600/30 p-lg text-center">
        <h3 className="text-lg font-semibold mb-sm">💰 Unclaimed Winnings</h3>
        <p className="text-gray-400 text-sm">Connect your wallet to see unclaimed winnings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card bg-yellow-900/20 border-yellow-600/30 p-lg text-center">
        <h3 className="text-lg font-semibold mb-sm">💰 Unclaimed Winnings</h3>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (unclaimedWinnings.length === 0) {
    return (
      <div className="card bg-yellow-900/20 border-yellow-600/30 p-lg text-center">
        <h3 className="text-lg font-semibold mb-sm">💰 Unclaimed Winnings</h3>
        <p className="text-gray-400 text-sm">No unclaimed winnings</p>
      </div>
    );
  }

  return (
    <div className="card bg-yellow-900/20 border-yellow-600/30 p-lg">
      <h3 className="text-lg font-semibold mb-md">
        💰 Unclaimed Winnings
        {totalUnclaimed > 0 && (
          <span className="float-right text-yellow-400">
            {totalUnclaimed.toFixed(3)} SOL
          </span>
        )}
      </h3>
      
      <div className="space-y-sm">
        {unclaimedWinnings.map((winning) => (
          <div
            key={winning.roundId}
            className="flex items-center justify-between p-sm bg-black/20 rounded-lg border border-yellow-600/20"
          >
            <div className="flex-1">
              <div className="font-medium">
                Round #{winning.roundId}
              </div>
              <div className="text-sm text-gray-400">
                Bet: {winning.betAmount.toFixed(3)} SOL on {winning.side}
              </div>
              <div className="text-sm text-yellow-400">
                Won: {winning.estimatedWinnings.toFixed(3)} SOL
              </div>
            </div>
            
            <button
              onClick={() => claimWinnings(winning.roundId)}
              disabled={claiming[winning.roundId]}
              className="btn btn-sm btn-primary ml-sm"
            >
              {claiming[winning.roundId] ? (
                <span className="animate-pulse">Claiming...</span>
              ) : (
                'Claim'
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-md pt-md border-t border-yellow-600/20 text-center">
        <button
          onClick={fetchUnclaimedWinnings}
          className="text-yellow-400 hover:text-yellow-300 text-sm"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default UnclaimedWinnings;