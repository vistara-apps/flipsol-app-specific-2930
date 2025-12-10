export const IDL = {
  "version": "0.1.0",
  "name": "flipsol",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "jackpot",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "rakeBps",
          "type": "u16"
        },
        {
          "name": "jackpotBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "initializeJackpot",
      "accounts": [
        {
          "name": "globalState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "jackpot",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "startRound",
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "durationSeconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "placeBet",
      "accounts": [
        {
          "name": "globalState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userBet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeRound",
      "accounts": [
        {
          "name": "globalState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "roundState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        // Jackpot account removed from program
        // {
        //   "name": "jackpot",
        //   "isMut": true,
        //   "isSigner": false
        // },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claimWinnings",
      "accounts": [
        {
          "name": "globalState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "roundState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userBet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "GlobalState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "currentRound",
            "type": "u64"
          },
          {
            "name": "rakeBps",
            "type": "u16"
          },
          {
            "name": "jackpotBps",
            "type": "u16"
          },
          {
            "name": "treasuryBump",
            "type": "u8"
          },
          {
            "name": "jackpotBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "RoundState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "roundId",
            "type": "u64"
          },
          {
            "name": "headsTotal",
            "type": "u64"
          },
          {
            "name": "tailsTotal",
            "type": "u64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "winningSide",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UserBet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "roundId",
            "type": "u64"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Treasury",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "Jackpot",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidSide",
      "msg": "Invalid side (must be 0 or 1)"
    },
    {
      "code": 6001,
      "name": "RoundExpired",
      "msg": "Round has expired"
    },
    {
      "code": 6002,
      "name": "RoundSettled",
      "msg": "Round already settled"
    },
    {
      "code": 6003,
      "name": "AlreadyBet",
      "msg": "User already placed a bet"
    },
    {
      "code": 6004,
      "name": "RoundNotExpired",
      "msg": "Round has not expired yet"
    },
    {
      "code": 6005,
      "name": "AlreadySettled",
      "msg": "Round already settled"
    },
    {
      "code": 6006,
      "name": "NoBets",
      "msg": "No bets placed"
    },
    {
      "code": 6007,
      "name": "RoundNotSettled",
      "msg": "Round not settled yet"
    },
    {
      "code": 6008,
      "name": "AlreadyClaimed",
      "msg": "Winnings already claimed"
    },
    {
      "code": 6009,
      "name": "NotWinner",
      "msg": "User did not win this round"
    },
    {
      "code": 6010,
      "name": "NoWinners",
      "msg": "No winners in this round"
    }
  ]
};