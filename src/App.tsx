/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import SpaceGame from './components/SpaceGame';
import { Rocket, Star, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050510] text-[#00ffff] flex flex-col justify-between p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      
      {/* Background Decorative Cosmic Mesh grids with Neon Swells */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-900/10 rounded-full filter blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full filter blur-[150px] pointer-events-none -z-10" />

      {/* HEADER SECTION - Styled with Glowing Cyan/Magenta linear lines */}
      <header className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#00ffff]/20 to-[#ff00ff]/20 border border-[#00ffff]/30 rounded-xl shadow-lg">
            <Rocket className="w-6 h-6 text-[#00ffff] rotate-45 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest text-white uppercase flex items-center gap-1.5 font-sans">
              COSMIC STAR CHASER <span className="text-[10px] bg-gradient-to-r from-[#00ffff]/20 to-[#ff00ff]/20 text-white font-bold px-2 py-0.5 rounded-full border border-cyan-400/30 font-mono tracking-normal">3D ARCADE</span>
            </h1>
            <p className="text-xs text-white/50 font-mono">STEER THE SPACESHIP • COLLECT GLOWING STARS • DEFY TIME LIMITS</p>
          </div>
        </div>

        {/* Status indicator rail */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/70 shadow-md">
            <ShieldAlert className="w-3.5 h-3.5 text-[#00ffff]" />
            <span>Telemetry:</span>
            <span className="text-[#00ffff] font-extrabold">ONLINE</span>
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/70 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-[#ff00ff]" />
            <span>Fidelity:</span>
            <span className="text-[#ff00ff] font-extrabold">60 FPS</span>
          </span>
        </div>
      </header>

      {/* MAIN GAME CONTROLLER */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center z-10">
        <SpaceGame />
      </main>

      {/* VIBRANT PALETTE DESIGN KEY-HINTS HUD PANEL */}
      <div className="w-full max-w-5xl mx-auto mt-4 py-4 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex flex-wrap justify-center items-center gap-x-12 gap-y-4 z-10 shadow-lg">
        <div className="flex items-center gap-3.5 text-xs font-black tracking-widest text-[#00ffff]">
          <div className="w-8 h-8 border-2 border-[#00ffff] rounded flex items-center justify-center text-lg font-bold font-mono">
            ↑
          </div>
          <span>ACCELERATE / RISE</span>
        </div>
        <div className="flex items-center gap-3.5 text-xs font-black tracking-widest text-[#00ffff]">
          <div className="flex gap-1.5">
            <div className="w-8 h-8 border-2 border-[#00ffff] rounded flex items-center justify-center text-lg font-bold font-mono">
              ←
            </div>
            <div className="w-8 h-8 border-2 border-[#00ffff] rounded flex items-center justify-center text-lg font-bold font-mono">
              →
            </div>
          </div>
          <span>STEER SPACEFLIGHT</span>
        </div>
        <div className="flex items-center gap-3.5 text-xs font-black tracking-widest text-[#ff00ff]">
          <div className="w-8 h-8 border-2 border-[#ff00ff] rounded flex items-center justify-center text-lg font-bold font-sans">
            ★
          </div>
          <span>COLLECT NEON STARS</span>
        </div>
      </div>

      {/* FOOTER TIPS RAIL */}
      <footer className="w-full max-w-5xl mx-auto mt-4 border-t border-white/10 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40 font-mono z-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-white/60">
            <Star className="w-4 h-4 text-[#ff00ff] fill-[#ff00ff]" />
            <strong>게임 규칙:</strong> 별에 가까이 다가가 부품을 회수하면 1.5초 이상의 추가 비행 부스트를 획득합니다.
          </span>
          <span className="text-white/20">|</span>
          <span className="text-white/60">★ 연속 콤보가 늘어날 수록 주파수 피치가 올라갑니다.</span>
        </div>
        
        <div className="flex items-center gap-2 text-white/40 hover:text-white/60 text-[11px]">
          <Volume2 className="w-4 h-4 text-[#00ffff]" />
          <span>오디오는 Web Audio API 실시간 합성 사운드입니다.</span>
        </div>
      </footer>

    </div>
  );
}

