import React, { useEffect, useState } from 'react';
import { ConciergeMood } from '../types';

interface ConciergeProps {
  mood: ConciergeMood;
}

const Concierge: React.FC<ConciergeProps> = ({ mood }) => {
  const [tick, setTick] = useState(0);

  // Animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Determine styles based on mood
  let moodColor = "text-arcade-primary";
  let statusText = "ONLINE";
  let containerAnimation = "animate-bounce-slow";
  let eyeOffset = 0;
  let mouthState = "neutral"; // neutral, happy, talking, sad

  switch (mood) {
    case ConciergeMood.IDLE:
      statusText = "READY";
      // Blink occasionally
      if (tick % 6 === 0) mouthState = "blink"; 
      break;
    case ConciergeMood.LISTENING:
      statusText = "LISTENING...";
      moodColor = "text-arcade-accent";
      containerAnimation = "translate-x-2"; // Leaning in
      mouthState = "open";
      eyeOffset = 2; // Look right (towards UI)
      break;
    case ConciergeMood.THINKING:
      statusText = "PROCESSING...";
      moodColor = "text-arcade-secondary";
      containerAnimation = "animate-pulse";
      mouthState = tick % 2 === 0 ? "talking" : "neutral";
      eyeOffset = tick % 2 === 0 ? -2 : 2; // Eyes shifting
      break;
    case ConciergeMood.POINTING:
      statusText = "FOUND IT!";
      moodColor = "text-green-400";
      containerAnimation = "";
      mouthState = "happy";
      eyeOffset = 4; // Look emphatically right
      break;
    case ConciergeMood.CELEBRATING:
      statusText = "SUCCESS!";
      moodColor = "text-pink-500";
      containerAnimation = "animate-bounce";
      mouthState = "happy";
      break;
    case ConciergeMood.CONFUSED:
      statusText = "ERROR";
      moodColor = "text-arcade-error";
      containerAnimation = "shake"; // Add shake class in css or just fallback
      mouthState = "sad";
      break;
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`relative transition-all duration-500 ${containerAnimation}`}>
        
        {/* Robot Head */}
        <div className={`w-32 h-32 bg-arcade-panel border-4 ${mood === ConciergeMood.CONFUSED ? 'border-arcade-error' : 'border-arcade-primary'} relative shadow-lg`}>
            
            {/* Antenna */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-1 h-6 bg-gray-500"></div>
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${tick % 2 === 0 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-red-900'} transition-colors`}></div>

            {/* Eyes */}
            <div className="absolute top-8 left-6 w-6 h-6 bg-slate-900 border-2 border-white flex items-center justify-center overflow-hidden">
                {mouthState !== 'blink' && (
                    <div className={`w-2 h-2 ${moodColor} bg-current transition-transform duration-300`} style={{ transform: `translateX(${eyeOffset}px)` }}></div>
                )}
                {mouthState === 'blink' && <div className="w-4 h-0.5 bg-slate-500"></div>}
            </div>
            <div className="absolute top-8 right-6 w-6 h-6 bg-slate-900 border-2 border-white flex items-center justify-center overflow-hidden">
                 {mouthState !== 'blink' && (
                    <div className={`w-2 h-2 ${moodColor} bg-current transition-transform duration-300`} style={{ transform: `translateX(${eyeOffset}px)` }}></div>
                )}
                {mouthState === 'blink' && <div className="w-4 h-0.5 bg-slate-500"></div>}
            </div>

            {/* Mouth Area */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-900 border-2 border-white overflow-hidden flex items-center justify-center">
                
                {/* Talking (animated bars) */}
                {mouthState === 'talking' && (
                     <div className="flex gap-1 h-full items-center">
                        <div className={`w-1 bg-current ${moodColor} h-2 animate-pulse`}></div>
                        <div className={`w-1 bg-current ${moodColor} h-4 animate-pulse delay-75`}></div>
                        <div className={`w-1 bg-current ${moodColor} h-2 animate-pulse delay-100`}></div>
                        <div className={`w-1 bg-current ${moodColor} h-3 animate-pulse`}></div>
                     </div>
                )}

                {/* Happy (Wide bar) */}
                {mouthState === 'happy' && (
                    <div className={`w-12 h-2 bg-current ${moodColor}`}></div>
                )}

                {/* Sad (Down turned or small) */}
                {mouthState === 'sad' && (
                     <div className={`w-4 h-1 bg-current ${moodColor} translate-y-1`}></div>
                )}
                
                {/* Neutral/Open */}
                {(mouthState === 'neutral' || mouthState === 'open' || mouthState === 'blink') && (
                     <div className={`w-8 h-1 bg-current ${moodColor}`}></div>
                )}
            </div>
        </div>

        {/* Neon Glow beneath */}
        <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-current ${moodColor} blur-xl opacity-40 transition-colors duration-500`}></div>
      </div>
      
      <div className="text-center">
        <h2 className="font-retro text-2xl text-white tracking-widest drop-shadow-md">CONCIERGE</h2>
        <div className={`font-retro text-lg ${moodColor} animate-pulse`}>
          [{statusText}]
        </div>
      </div>

      {/* Flavor text based on mood */}
      <div className="w-48 text-center text-xs text-slate-400 font-sans border-t border-slate-700 pt-2 mt-2">
        {mood === ConciergeMood.IDLE && "System Operational. Waiting for input."}
        {mood === ConciergeMood.LISTENING && "Awaiting voice/text command protocol."}
        {mood === ConciergeMood.THINKING && "Cross-referencing calendars..."}
        {mood === ConciergeMood.POINTING && "Optimal trajectories calculated."}
        {mood === ConciergeMood.CELEBRATING && "Meeting synchronized. Great success."}
        {mood === ConciergeMood.CONFUSED && "Syntax error. Please refine parameters."}
      </div>
    </div>
  );
};

export default Concierge;