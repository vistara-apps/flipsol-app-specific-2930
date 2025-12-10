import React, { useState } from 'react';
import { Copy, Users, DollarSign, CheckCircle } from 'lucide-react';
import { useReferral } from '../contexts/ReferralContext';

const ReferralDashboard = () => {
  const { 
    referralCode, 
    referralStats, 
    getReferralLink, 
    copyReferralLink 
  } = useReferral();
  
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const success = await copyReferralLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!referralCode) {
    return (
      <div className="card text-center py-8">
        <h3 className="text-h2 mb-4">🎯 Referral Program</h3>
        <p className="text-body text-text-muted mb-4">
          Connect your wallet to get your referral link and start earning!
        </p>
        <div className="text-sm text-text-muted">
          Earn <span className="text-accent font-semibold">0.5% of every bet</span> from your referrals
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Link */}
      <div className="card">
        <h3 className="text-h2 mb-4">🎯 Your Referral Link</h3>
        <p className="text-sm text-text-muted mb-4">
          Share this link and earn <span className="text-accent font-semibold">0.5% of every bet</span> your referrals make!
        </p>
        
        <div className="bg-surface-hover rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted mb-1">Your Referral Link</p>
              <p className="text-sm font-mono text-text-primary truncate">
                {getReferralLink()}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className={`btn-secondary flex items-center gap-2 ${copied ? 'bg-green-500/20 text-green-400' : ''}`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          💡 <strong>Pro tip:</strong> Share in your Discord, Twitter, or Telegram for maximum reach!
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-caption text-text-muted">Total Referrals</p>
              <p className="text-h2">{referralStats.totalReferred}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-caption text-text-muted">Total Earnings</p>
              <p className="text-h2">{referralStats.totalEarnings.toFixed(4)} SOL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      {referralStats.referrals && referralStats.referrals.length > 0 && (
        <div className="card">
          <h4 className="text-h3 mb-4">Recent Referrals</h4>
          <div className="space-y-3">
            {referralStats.referrals.slice(0, 10).map((referral, index) => (
              <div key={index} className="flex items-center justify-between bg-surface-hover rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">
                    {referral.referredUser ? 
                      `${referral.referredUser.slice(0, 8)}...${referral.referredUser.slice(-4)}` : 
                      'Unknown User'
                    }
                  </p>
                  <p className="text-xs text-text-muted">
                    {referral.timestamp ? 
                      new Date(referral.timestamp).toLocaleDateString() : 
                      'Unknown Date'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-accent">
                    +{referral.earning ? referral.earning.toFixed(4) : '0.0000'} SOL
                  </p>
                  <p className="text-xs text-text-muted">
                    Bet: {referral.amount ? referral.amount.toFixed(2) : '0.00'} SOL
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="card">
        <h4 className="text-h3 mb-4">How It Works</h4>
        <div className="space-y-3 text-sm text-text-muted">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">1</div>
            <p>Share your referral link with friends</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">2</div>
            <p>They click your link and connect their wallet</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">3</div>
            <p>You earn 1% of every bet they make - forever!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;