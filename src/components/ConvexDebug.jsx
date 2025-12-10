import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useWallet } from '@solana/wallet-adapter-react';

const ConvexDebug = () => {
  const { publicKey } = useWallet();
  
  // Test queries
  const referralStats = useQuery(api.referrals.getReferralStats, 
    publicKey ? { wallet: publicKey.toString() } : "skip"
  );
  const leaderboard = useQuery(api.referrals.getLeaderboard);
  const activityFeed = useQuery(api.gameData.getActivityFeed);
  const gameLeaderboard = useQuery(api.gameData.getGameLeaderboard);
  const userHistory = useQuery(api.gameData.getUserHistory,
    publicKey ? { wallet: publicKey.toString() } : "skip"
  );

  return (
    <div className="card p-6 mb-6 bg-gray-900 border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-green-400">🔬 Convex Debug Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        
        {/* Referral Stats */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">📈 Your Referral Stats</h3>
          {publicKey ? (
            <div className="space-y-1">
              <div>Total Referrals: <span className="text-green-400">{referralStats?.totalReferrals || 0}</span></div>
              <div>Total Earnings: <span className="text-green-400">{(referralStats?.totalEarnings || 0).toFixed(4)} SOL</span></div>
              <div>Total Volume: <span className="text-blue-400">{(referralStats?.totalVolume || 0).toFixed(2)} SOL</span></div>
              <div className="text-xs text-gray-400 mt-2">
                Loading: {referralStats === undefined ? 'Yes' : 'No'}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Connect wallet to see stats</div>
          )}
        </div>

        {/* User Bet History */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-purple-400">🎯 Your Bet History</h3>
          {publicKey ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {userHistory?.length ? userHistory.slice(0, 5).map((bet, i) => (
                <div key={i} className="text-xs border-b border-gray-700 pb-1">
                  Round #{bet.roundId}: {bet.amount.toFixed(3)} SOL on {bet.side === 0 ? 'Heads' : 'Tails'}
                  {bet.won !== undefined && (
                    <span className={bet.won ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                      {bet.won ? `Won ${bet.payout?.toFixed(3)} SOL` : 'Lost'}
                    </span>
                  )}
                </div>
              )) : (
                <div className="text-gray-400">No bets yet</div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">Connect wallet to see history</div>
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">⚡ Live Activity</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activityFeed?.length ? activityFeed.slice(0, 8).map((activity, i) => (
              <div key={i} className="text-xs border-b border-gray-700 pb-1">
                <span className={
                  activity.type === 'win' ? 'text-green-400' :
                  activity.type === 'bet' ? 'text-blue-400' :
                  activity.type === 'jackpot' ? 'text-yellow-400' : 'text-gray-400'
                }>
                  {activity.message}
                </span>
                <div className="text-gray-500 text-xs">
                  {new Date(activity.createdAt).toLocaleTimeString()}
                </div>
              </div>
            )) : (
              <div className="text-gray-400">No activity yet</div>
            )}
          </div>
        </div>

        {/* Referral Leaderboard */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-orange-400">🏆 Referral Leaders</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {leaderboard?.length ? leaderboard.slice(0, 5).map((leader, i) => (
              <div key={i} className="text-xs flex justify-between border-b border-gray-700 pb-1">
                <span>#{leader.rank} {leader.wallet}</span>
                <span className="text-green-400">{leader.referralEarnings.toFixed(3)} SOL</span>
              </div>
            )) : (
              <div className="text-gray-400">No referrers yet</div>
            )}
          </div>
        </div>

      </div>

      {/* Connection Status */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center space-x-4 text-xs">
          <div>
            Convex Status: 
            <span className={referralStats !== undefined || activityFeed !== undefined ? 'text-green-400 ml-1' : 'text-red-400 ml-1'}>
              {referralStats !== undefined || activityFeed !== undefined ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div>
            Wallet: 
            <span className={publicKey ? 'text-green-400 ml-1' : 'text-gray-400 ml-1'}>
              {publicKey ? `${publicKey.toString().slice(0,4)}...${publicKey.toString().slice(-4)}` : 'Not connected'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ConvexDebug;