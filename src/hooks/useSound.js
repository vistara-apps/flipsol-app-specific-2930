import { useCallback, useRef } from 'react';

// Casino sound effects using Web Audio API
export const useSound = () => {
  const audioContext = useRef(null);

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext.current;
  }, []);

  const playSound = useCallback((type) => {
    try {
      const ctx = initAudio();
      const now = ctx.currentTime;

      switch (type) {
        case 'bet': {
          // Coin drop sound
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.value = 800;
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
          gain.gain.value = 0.3;
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        
        case 'win': {
          // Victory jingle
          const notes = [523, 659, 784, 1047]; // C, E, G, High C
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.value = freq;
            gain.gain.value = 0.2;
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 + i * 0.1);
            
            osc.start(now + i * 0.1);
            osc.stop(now + 0.5 + i * 0.1);
          });
          break;
        }
        
        case 'lose': {
          // Sad trombone
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.value = 200;
          osc.frequency.linearRampToValueAtTime(100, now + 0.5);
          gain.gain.value = 0.2;
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        }
        
        case 'tick': {
          // Timer tick
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.value = 1000;
          gain.gain.value = 0.1;
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        
        case 'jackpot': {
          // Epic jackpot sound
          for (let i = 0; i < 10; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.frequency.value = 400 + Math.random() * 800;
            gain.gain.value = 0.2;
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1 + i * 0.05);
            
            osc.start(now + i * 0.05);
            osc.stop(now + 1 + i * 0.05);
          }
          break;
        }
      }
    } catch (error) {
      console.log('Sound error:', error);
    }
  }, [initAudio]);

  return { playSound };
};