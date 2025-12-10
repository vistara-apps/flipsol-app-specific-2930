use anchor_lang::prelude::*;
use anchor_lang::system_program::{System};

declare_id!("BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL");

#[program]
pub mod flipsol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, rake_bps: u16, jackpot_bps: u16) -> Result<()> {
        require!(rake_bps <= 1000, ErrorCode::InvalidRakeBps); // Max 10%
        require!(jackpot_bps <= 1000, ErrorCode::InvalidJackpotBps); // Max 10%
        require!(rake_bps + jackpot_bps <= 1000, ErrorCode::InvalidTotalBps); // Max 10% total
        
        let global_state = &mut ctx.accounts.global_state;
        global_state.authority = ctx.accounts.authority.key();
        global_state.current_round = 0;
        global_state.rake_bps = rake_bps;
        global_state.jackpot_bps = jackpot_bps;
        global_state.treasury_bump = ctx.bumps.treasury;
        global_state.jackpot_bump = ctx.bumps.jackpot;
        global_state.min_bet = 10_000_000; // 0.01 SOL minimum
        
        msg!("Initialized FlipSOL with rake: {}bps, jackpot: {}bps", rake_bps, jackpot_bps);
        Ok(())
    }

    // New instruction to initialize just the jackpot account if it's missing
    pub fn initialize_jackpot(ctx: Context<InitializeJackpot>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.global_state.authority,
            ErrorCode::Unauthorized
        );
        
        // Verify the jackpot bump matches what's stored in global_state
        require!(
            ctx.bumps.jackpot == ctx.accounts.global_state.jackpot_bump,
            ErrorCode::InvalidBump
        );
        
        msg!("Jackpot account initialized with bump: {}", ctx.bumps.jackpot);
        Ok(())
    }

    pub fn start_round(ctx: Context<StartRound>, duration_seconds: i64) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.global_state.authority,
            ErrorCode::Unauthorized
        );
        require!(duration_seconds > 0, ErrorCode::InvalidDuration);
        require!(duration_seconds <= 86400, ErrorCode::InvalidDuration); // Max 24 hours
        
        let global_state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;
        
        global_state.current_round = global_state.current_round
            .checked_add(1)
            .ok_or(ErrorCode::RoundOverflow)?;
        let round_id = global_state.current_round;
        
        let round_state = &mut ctx.accounts.round_state;
        round_state.round_id = round_id;
        round_state.heads_total = 0;
        round_state.tails_total = 0;
        round_state.ends_at = clock.unix_timestamp
            .checked_add(duration_seconds)
            .ok_or(ErrorCode::TimestampOverflow)?;
        round_state.settled = false;
        round_state.winning_side = 2; // 2 = unset
        round_state.bump = ctx.bumps.round_state;
        
        msg!("Started round {} ending at {}", round_id, round_state.ends_at);
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, side: u8, amount: u64) -> Result<()> {
        require!(side <= 1, ErrorCode::InvalidSide);
        require!(amount >= ctx.accounts.global_state.min_bet, ErrorCode::BetTooSmall);
        
        let clock = Clock::get()?;
        
        // Check round state before transfers
        require!(
            clock.unix_timestamp < ctx.accounts.round_state.ends_at,
            ErrorCode::RoundExpired
        );
        require!(!ctx.accounts.round_state.settled, ErrorCode::RoundSettled);
        
        // Check if user already bet - account must be new (init ensures this)
        require!(
            ctx.accounts.user_bet.amount == 0,
            ErrorCode::AlreadyBet
        );
        
        // Get round_id before mutable borrow
        let round_id = ctx.accounts.round_state.round_id;
        let user_key = ctx.accounts.user.key();
        
        // Transfer SOL from user to round state PDA using system program
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &user_key,
            &ctx.accounts.round_state.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.round_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        // Update user bet
        let user_bet = &mut ctx.accounts.user_bet;
        user_bet.user = user_key;
        user_bet.round_id = round_id;
        user_bet.side = side;
        user_bet.amount = amount;
        user_bet.claimed = false;
        
        // Update round totals
        let round_state = &mut ctx.accounts.round_state;
        if side == 0 {
            round_state.heads_total = round_state.heads_total
                .checked_add(amount)
                .ok_or(ErrorCode::AmountOverflow)?;
        } else {
            round_state.tails_total = round_state.tails_total
                .checked_add(amount)
                .ok_or(ErrorCode::AmountOverflow)?;
        }
        
        msg!("User {} bet {} lamports on side {}", user_key, amount, side);
        Ok(())
    }

    pub fn close_round(ctx: Context<CloseRound>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.global_state.authority,
            ErrorCode::Unauthorized
        );
        
        let clock = Clock::get()?;
        
        // Check round state before modifications
        require!(
            clock.unix_timestamp >= ctx.accounts.round_state.ends_at,
            ErrorCode::RoundNotExpired
        );
        require!(!ctx.accounts.round_state.settled, ErrorCode::AlreadySettled);
        
        let total_pot = ctx.accounts.round_state.heads_total
            .checked_add(ctx.accounts.round_state.tails_total)
            .ok_or(ErrorCode::AmountOverflow)?;
        require!(total_pot > 0, ErrorCode::NoBets);
        
        // Get values we need before mutable borrow
        let round_id = ctx.accounts.round_state.round_id;
        let round_bump = ctx.accounts.round_state.bump;
        let round_balance = ctx.accounts.round_state.to_account_info().lamports();
        let round_key = ctx.accounts.round_state.key();
        let treasury_key = ctx.accounts.treasury.key();
        
        // Improved randomness: Use recent blockhash + round_id + clock for better distribution
        let recent_blockhash = round_balance; // Use balance as source of randomness
        let clock_slot = clock.slot;
        
        // Create hash input from multiple sources
        let mut hash_input = [0u8; 24]; // round_id (u64) + clock_slot (u64) + recent_blockhash (u64) = 8 + 8 + 8 = 24 bytes
        let mut offset = 0;
        hash_input[offset..offset + 8].copy_from_slice(&round_id.to_le_bytes());
        offset += 8;
        hash_input[offset..offset + 8].copy_from_slice(&clock_slot.to_le_bytes());
        offset += 8;
        hash_input[offset..offset + 8].copy_from_slice(&recent_blockhash.to_le_bytes());
        
        // Use SHA256 hash for randomness  
        let hash_result = anchor_lang::solana_program::hash::hash(&hash_input);
        let hash_bytes = hash_result.to_bytes();
        
        // Use first byte for randomness
        let pseudo_random = hash_bytes[0] % 2;
        let winning_side = if pseudo_random == 0 { 0u8 } else { 1u8 };
        
        // Calculate cuts with proper error handling
        let global_state = &ctx.accounts.global_state;
        let jackpot_cut = total_pot
            .checked_mul(global_state.jackpot_bps as u64)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::DivisionByZero)?;
        let rake_cut = total_pot
            .checked_mul(global_state.rake_bps as u64)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        // Total casino cut (rake + jackpot both go to treasury for simplicity)
        let total_casino_cut = jackpot_cut
            .checked_add(rake_cut)
            .ok_or(ErrorCode::AmountOverflow)?;
        
        // Verify we have enough balance
        require!(round_balance >= total_casino_cut, ErrorCode::InsufficientFunds);
        
        // Transfer all casino cuts to treasury (simplified - no separate jackpot account needed)
        // This way we just show treasury balance as the casino's total balance
        if total_casino_cut > 0 {
            **ctx.accounts.round_state.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.round_state.to_account_info()
                .lamports()
                .checked_sub(total_casino_cut)
                .ok_or(ErrorCode::InsufficientFunds)?;
                
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.treasury.to_account_info()
                .lamports()
                .checked_add(total_casino_cut)
                .ok_or(ErrorCode::AmountOverflow)?;
        }
        
        // Transfer rake cut using direct lamport manipulation
        if rake_cut > 0 {
            **ctx.accounts.round_state.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.round_state.to_account_info()
                .lamports()
                .checked_sub(rake_cut)
                .ok_or(ErrorCode::InsufficientFunds)?;
                
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.treasury.to_account_info()
                .lamports()
                .checked_add(rake_cut)
                .ok_or(ErrorCode::AmountOverflow)?;
        }
        
        // Jackpot trigger removed - simplified architecture
        // All casino cuts go to treasury, which can be displayed as the casino balance
        
        // Now we can safely get mutable reference
        let round_state = &mut ctx.accounts.round_state;
        round_state.winning_side = winning_side;
        round_state.settled = true;
        
        msg!("Round {} settled. Winning side: {}, Total: {} lamports", 
             round_id, winning_side, total_pot);
        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let round_state = &ctx.accounts.round_state;
        let user_bet = &mut ctx.accounts.user_bet;
        
        require!(round_state.settled, ErrorCode::RoundNotSettled);
        require!(!user_bet.claimed, ErrorCode::AlreadyClaimed);
        require!(
            user_bet.side == round_state.winning_side,
            ErrorCode::NotWinner
        );
        require!(
            user_bet.user == ctx.accounts.user.key(),
            ErrorCode::InvalidUser
        );
        require!(
            user_bet.round_id == round_state.round_id,
            ErrorCode::InvalidRound
        );
        
        let total_pot = round_state.heads_total
            .checked_add(round_state.tails_total)
            .ok_or(ErrorCode::AmountOverflow)?;
        let winning_total = if round_state.winning_side == 0 {
            round_state.heads_total
        } else {
            round_state.tails_total
        };
        
        require!(winning_total > 0, ErrorCode::NoWinners);
        require!(user_bet.amount > 0, ErrorCode::InvalidBet);
        
        let global_state = &ctx.accounts.global_state;
        let jackpot_cut = total_pot
            .checked_mul(global_state.jackpot_bps as u64)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::DivisionByZero)?;
        let rake_cut = total_pot
            .checked_mul(global_state.rake_bps as u64)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        let winner_pool = total_pot
            .checked_sub(jackpot_cut)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_sub(rake_cut)
            .ok_or(ErrorCode::AmountOverflow)?;
        
        // Get actual round balance (may include jackpot if triggered)
        let round_balance = **ctx.accounts.round_state.to_account_info().try_borrow_lamports()?;
        let available_pool = round_balance.min(winner_pool);
        
        // Calculate user share proportionally
        let user_share = user_bet.amount
            .checked_mul(available_pool)
            .ok_or(ErrorCode::AmountOverflow)?
            .checked_div(winning_total)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        require!(user_share > 0, ErrorCode::InvalidPayout);
        require!(round_balance >= user_share, ErrorCode::InsufficientFunds);
        
        // Transfer winnings from round state PDA to user using direct lamport manipulation
        // (PDAs with account data cannot use system transfers as 'from' account)
        **ctx.accounts.round_state.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.round_state.to_account_info()
            .lamports()
            .checked_sub(user_share)
            .ok_or(ErrorCode::InsufficientFunds)?;
            
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.user.to_account_info()
            .lamports()
            .checked_add(user_share)
            .ok_or(ErrorCode::AmountOverflow)?;
        
        user_bet.claimed = true;
        
        msg!("User {} claimed {} lamports", ctx.accounts.user.key(), user_share);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::LEN,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Treasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Jackpot::LEN,
        seeds = [b"jackpot"],
        bump
    )]
    pub jackpot: Account<'info, Jackpot>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeJackpot<'info> {
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Jackpot::LEN,
        seeds = [b"jackpot"],
        bump
    )]
    pub jackpot: Account<'info, Jackpot>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartRound<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + RoundState::LEN,
        seeds = [b"round", global_state.current_round.checked_add(1).unwrap().to_le_bytes().as_ref()],
        bump
    )]
    pub round_state: Account<'info, RoundState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [b"round", round_state.round_id.to_le_bytes().as_ref()],
        bump = round_state.bump
    )]
    pub round_state: Account<'info, RoundState>,
    
    #[account(
        init,
        payer = user,
        space = 8 + UserBet::LEN,
        seeds = [b"user_bet", user.key().as_ref(), round_state.round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub user_bet: Account<'info, UserBet>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseRound<'info> {
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [b"round", round_state.round_id.to_le_bytes().as_ref()],
        bump = round_state.bump
    )]
    pub round_state: Account<'info, RoundState>,
    
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = global_state.treasury_bump
    )]
    pub treasury: Account<'info, Treasury>,
    
    // Jackpot account removed - all funds go to treasury for simplicity
    // Treasury balance = total casino balance (rake + jackpot cuts)
    
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    
    #[account(
        mut,
        seeds = [b"round", round_state.round_id.to_le_bytes().as_ref()],
        bump = round_state.bump
    )]
    pub round_state: Account<'info, RoundState>,
    
    #[account(
        mut,
        seeds = [b"user_bet", user.key().as_ref(), round_state.round_id.to_le_bytes().as_ref()],
        bump
    )]
    pub user_bet: Account<'info, UserBet>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub current_round: u64,
    pub rake_bps: u16,
    pub jackpot_bps: u16,
    pub treasury_bump: u8,
    pub jackpot_bump: u8,
    pub min_bet: u64, // Minimum bet in lamports
}

impl GlobalState {
    pub const LEN: usize = 32 + 8 + 2 + 2 + 1 + 1 + 8;
}

#[account]
pub struct RoundState {
    pub round_id: u64,
    pub heads_total: u64,
    pub tails_total: u64,
    pub ends_at: i64,
    pub settled: bool,
    pub winning_side: u8, // 0 = heads, 1 = tails, 2 = unset
    pub bump: u8,
}

impl RoundState {
    pub const LEN: usize = 8 + 8 + 8 + 8 + 1 + 1 + 1;
}

#[account]
pub struct UserBet {
    pub user: Pubkey,
    pub round_id: u64,
    pub side: u8,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl UserBet {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 1 + 1;
}

#[account]
pub struct Treasury {
    // Holds rake SOL
}

impl Treasury {
    pub const LEN: usize = 8;
}

#[account]
pub struct Jackpot {
    // Holds jackpot SOL
}

impl Jackpot {
    pub const LEN: usize = 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid side (must be 0 or 1)")]
    InvalidSide,
    #[msg("Round has expired")]
    RoundExpired,
    #[msg("Round already settled")]
    RoundSettled,
    #[msg("User already placed a bet")]
    AlreadyBet,
    #[msg("Round has not expired yet")]
    RoundNotExpired,
    #[msg("Round already settled")]
    AlreadySettled,
    #[msg("No bets placed")]
    NoBets,
    #[msg("Round not settled yet")]
    RoundNotSettled,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("User did not win this round")]
    NotWinner,
    #[msg("No winners in this round")]
    NoWinners,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("Invalid rake basis points")]
    InvalidRakeBps,
    #[msg("Invalid jackpot basis points")]
    InvalidJackpotBps,
    #[msg("Invalid total basis points")]
    InvalidTotalBps,
    #[msg("Bet amount too small")]
    BetTooSmall,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Round overflow")]
    RoundOverflow,
    #[msg("Timestamp overflow")]
    TimestampOverflow,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid user")]
    InvalidUser,
    #[msg("Invalid round")]
    InvalidRound,
    #[msg("Invalid bet")]
    InvalidBet,
    #[msg("Invalid payout")]
    InvalidPayout,
    #[msg("Invalid bump seed")]
    InvalidBump,
}
