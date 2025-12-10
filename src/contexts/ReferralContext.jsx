import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const ReferralContext = createContext(null);

export const useReferral = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within ReferralProvider');
  }
  return context;
};

export const ReferralProvider = ({ children }) => {
  const { publicKey } = useWallet();
  const [referralCode, setReferralCode] = useState(null);
  const [referredBy, setReferredBy] = useState(null);
  
  // Convex mutations and queries
  const trackReferral = useMutation(api.referrals.trackReferral);
  const referralStats = useQuery(api.referrals.getReferralStats, 
    publicKey ? { wallet: publicKey.toString() } : "skip"
  );
  const getReferrer = useQuery(api.referrals.getReferrer,
    publicKey ? { wallet: publicKey.toString() } : "skip"
  );

  // Extract referral code from URL on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      try {
        // Validate it's a valid Solana address
        if (refCode.length === 44) {
          setReferredBy(refCode);
          console.log('✅ Referral code detected:', refCode);
        }
      } catch (err) {
        console.log('❌ Invalid referral code:', refCode);
      }
    }
  }, []);

  // Set referral code when wallet connects
  useEffect(() => {
    if (publicKey) {
      setReferralCode(publicKey.toString());
    } else {
      setReferralCode(null);
    }
  }, [publicKey]);
  
  // Update referredBy based on Convex data
  useEffect(() => {
    if (getReferrer && !referredBy) {
      setReferredBy(getReferrer);
    }
  }, [getReferrer, referredBy]);

  // Generate referral link
  const getReferralLink = () => {
    if (!referralCode) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=${referralCode}`;
  };

  // Copy referral link to clipboard
  const copyReferralLink = async () => {
    const link = getReferralLink();
    if (!link) return false;

    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (err) {
      console.error('Failed to copy referral link:', err);
      return false;
    }
  };

  // Record a referral when user places bet
  const recordReferral = async (betAmount, referrerAddress) => {
    if (!publicKey || !referrerAddress) return;
    
    try {
      // Track the referral relationship if not already tracked
      await trackReferral({
        referrerWallet: referrerAddress,
        referredWallet: publicKey.toString(),
        referralCode: referrerAddress,
      });
      
      console.log('✅ Referral recorded:', {
        referrer: referrerAddress,
        referred: publicKey.toString(),
        betAmount,
        commission: betAmount * 0.005, // 0.5% commission
      });
    } catch (error) {
      console.error('❌ Failed to record referral:', error);
    }
  };

  const value = {
    referralCode,
    referredBy,
    referralStats: referralStats || {
      totalReferrals: 0,
      totalEarnings: 0,
      totalVolume: 0,
      recentActivity: [],
      referrals: [],
    },
    getReferralLink,
    copyReferralLink,
    recordReferral,
    // Expose loading state
    isLoading: referralStats === undefined,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
};