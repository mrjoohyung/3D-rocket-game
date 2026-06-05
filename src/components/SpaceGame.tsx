/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Info, 
  Rocket, 
  Award, 
  Cpu, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Shield
} from 'lucide-react';
import { spaceAudio } from '../utils/audio';
import { 
  Spaceship, 
  CollectibleStar, 
  SpaceDust, 
  GameParticle, 
  GameState,
  CosmicAsteroid
} from '../types';

export default function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React-based states for overlay menus and high scores
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    speed: 5.5,
    targetSpeed: 5.5,
    distance: 0,
    isGameOver: false,
    isPaused: false,
    hasStarted: false,
    isNewRecord: false,
    streakCount: 0,
    streakTimer: 0,
  });

  const [timeLeft, setTimeLeft] = useState<number>(45); // Arcade 45 seconds countdown
  const [shield, setShield] = useState<number>(100);    // Cosmic protective shield
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [controlType, setControlType] = useState<'keyboard' | 'mouse' | 'touch'>('keyboard');

  // Input listener refs
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchActive = useRef<boolean>(false);
  const touchDirection = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Smooth Game State refs to avoid state trigger lagging in high-frequency 60fps loop
  const scoreRef = useRef<number>(0);
  const timeLeftRef = useRef<number>(45);
  const shieldRef = useRef<number>(100);
  const comboRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);
  const shipPosRef = useRef<Spaceship>({
    x: 0,
    y: 0,
    z: 150, // Fixed physical plane distance for spaceship
    roll: 0,
    pitch: 0,
    yaw: 0,
    shield: 100,
  });

  // Game assets list maintained in mutable loops
  const starsRef = useRef<CollectibleStar[]>([]);
  const backgroundsRef = useRef<SpaceDust[]>([]);
  const asteroidsRef = useRef<CosmicAsteroid[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const tunnelRingsRef = useRef<{ z: number; maxRadius: number }[]>([]);

  // Sound triggers
  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newMuted = !isAudioMuted;
    setIsAudioMuted(newMuted);
    spaceAudio.setMute(newMuted);
  };

  // High score init
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spacestar_highscore');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          setGameState(prev => ({ ...prev, highScore: parsed }));
        }
      }
    } catch (e) {
      console.warn("Storage access failed:", e);
    }
  }, []);

  // Set control type on load based on capability
  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (hasTouch) {
      setControlType('touch');
    }
  }, []);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling when playing with arrows
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true; // Support original case
      setControlType('keyboard');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse / Pointer events for secondary screen drag control
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!gameState.hasStarted || gameState.isGameOver || gameState.isPaused) return;
    if (controlType === 'keyboard') return; // defer to keyboard if keys are pressed

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0 to 1
    const py = (e.clientY - rect.top) / rect.height; // 0 to 1

    // Map 0 -> 1 to coordinates bounds [-180, 180] and [-120, 120]
    mousePosition.current = {
      x: (px * 2 - 1) * 190,
      y: -(py * 2 - 1) * 130, // Invert so mouse up moves ship up
    };
  };

  // Touch handlers for simulated mobile controls
  const handleTouchStart = (dir: { x: number; y: number }) => {
    touchActive.current = true;
    touchDirection.current = dir;
    setControlType('touch');
  };

  const handleTouchEnd = () => {
    touchActive.current = false;
    touchDirection.current = { x: 0, y: 0 };
  };

  // Sound init trigger helper
  const triggerAudioInitOnFirstClick = () => {
    if (!hasInteracted) {
      spaceAudio.init();
      spaceAudio.setMute(isAudioMuted);
      setHasInteracted(true);
    }
  };

  // Start warp adventure
  const handleStartGame = () => {
    triggerAudioInitOnFirstClick();

    // Reset loop mutable constructs
    scoreRef.current = 0;
    timeLeftRef.current = 45;
    shieldRef.current = 100;
    comboRef.current = 0;
    comboTimerRef.current = 0;

    shipPosRef.current = {
      x: 0,
      y: 0,
      z: 150,
      roll: 0,
      pitch: 0,
      yaw: 0,
      shield: 100,
    };

    // Populate objects
    initializeGameObjects();

    setGameState({
      score: 0,
      highScore: gameState.highScore,
      speed: 6.0,
      targetSpeed: 6.0,
      distance: 0,
      isGameOver: false,
      isPaused: false,
      hasStarted: true,
      isNewRecord: false,
      streakCount: 0,
      streakTimer: 0,
    });

    setTimeLeft(45);
    setShield(100);
  };

  // Quick reset logic
  const handleRestart = () => {
    handleStartGame();
  };

  const spawnNewAsteroid = (initialZ?: number): CosmicAsteroid => {
    return {
      id: Math.random().toString(36).substring(2, 11),
      x: (Math.random() - 0.5) * 440,
      y: (Math.random() - 0.5) * 280,
      z: initialZ !== undefined ? initialZ : (1000 + Math.random() * 300),
      size: 15 + Math.random() * 20,
      color: Math.random() > 0.45 ? 'grey' : 'red',
      rollSpeed: (Math.random() - 0.5) * 0.04,
      rotation: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
    };
  };

  // Initialize objects
  const initializeGameObjects = () => {
    // Generate background micro starfield (space dust)
    const dust: SpaceDust[] = [];
    for (let i = 0; i < 180; i++) {
      dust.push({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1200,
        z: Math.random() * 1000 + 10,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }
    backgroundsRef.current = dust;

    // Generate orbiting space tunnel circular guidelines
    const rings = [];
    for (let i = 0; i < 5; i++) {
      rings.push({
        z: (i * 200) + 100,
        maxRadius: 280,
      });
    }
    tunnelRingsRef.current = rings;

    // Generate floating collectible stars with different rewards
    const stars: CollectibleStar[] = [];
    for (let i = 0; i < 7; i++) {
      const typeRoll = Math.random();
      let type: 'gold' | 'cyan' | 'pink' = 'gold';
      let points = 1;
      if (typeRoll > 0.88) {
        type = 'pink'; // rarest
        points = 5;
      } else if (typeRoll > 0.65) {
        type = 'cyan'; // semi rare
        points = 2;
      }

      stars.push({
        id: Math.random().toString(36).substr(2, 9),
        // Position them in a cone shape extending forwards
        x: (Math.random() - 0.5) * 380,
        y: (Math.random() - 0.5) * 260,
        z: 300 + (i * 120) + Math.random() * 50,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: 0.02 + Math.random() * 0.03,
        type,
        points,
        pulseScale: 1.0,
      });
    }
    starsRef.current = stars;

    // Generate initial asteroids based on start config
    const asteroidsList: CosmicAsteroid[] = [];
    for (let i = 0; i < 4; i++) {
      asteroidsList.push(spawnNewAsteroid(300 + i * 220));
    }
    asteroidsRef.current = asteroidsList;

    particlesRef.current = [];
  };

  // Spawn visual feedback explosion particles
  const spawnExplosion = (x: number, y: number, z: number, color: string, count = 20) => {
    for (let i = 0; i < count; i++) {
      const speed = 4 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const pitchAngle = (Math.random() - 0.5) * Math.PI;

      particlesRef.current.push({
        x: x,
        y: y,
        z: z,
        vx: Math.cos(angle) * Math.sin(pitchAngle) * speed,
        vy: Math.sin(angle) * Math.sin(pitchAngle) * speed,
        vz: Math.cos(pitchAngle) * speed - 5, // blast outward towards screen slightly
        color: color,
        size: Math.random() * 3.5 + 1.5,
        life: 45 + Math.floor(Math.random() * 20),
        maxLife: 60,
      });
    }
  };

  // Spawn thruster particles
  const spawnThrusterJet = (shipX: number, shipY: number) => {
    // Engine exhausts particles from rear nozzles
    const colors = ['#f97316', '#3b82f6', '#38bdf8', '#ef4444'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Left Thruster & Right Thruster offsets (rotated slightly)
    const offsets = [
      { dx: -6, dy: -2 },
      { dx: 6, dy: -2 }
    ];

    offsets.forEach(offset => {
      // Add subtle roll matrix offset
      const rx = shipX + offset.dx * Math.cos(shipPosRef.current.roll) - offset.dy * Math.sin(shipPosRef.current.roll);
      const ry = shipY + offset.dx * Math.sin(shipPosRef.current.roll) + offset.dy * Math.cos(shipPosRef.current.roll);

      particlesRef.current.push({
        x: rx,
        y: ry + (Math.random() - 0.5) * 3,
        z: 145, // slightly behind the physical ship plane
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1, // drift downwards slightly
        vz: -20 - Math.random() * 15, // push directly back at high velocity
        color: color,
        size: Math.random() * 3 + 1,
        life: 15 + Math.floor(Math.random() * 10),
        maxLife: 25,
      });
    });
  };

  // Dynamic game loop driven by requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Check game active status
      if (!gameState.hasStarted || gameState.isGameOver || gameState.isPaused) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const f = canvas.height * 0.72; // perspective focal factor

      // Clear dark outer space
      ctx.fillStyle = '#06060f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle nebula center glow
      const radialGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, canvas.width * 0.5);
      radialGlow.addColorStop(0, 'rgba(49, 10, 80, 0.25)'); // core dark purple
      radialGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.15)'); // deep slate
      radialGlow.addColorStop(1, 'rgba(6, 6, 15, 0)'); // fade out
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. UPDATE SPEEDS & GLOBAL PARAMS
      const isBoostingState = keysPressed.current['Shift'] || keysPressed.current['shift'];
      const targetSpeedValue = isBoostingState ? 12.5 : 5.8;
      
      // Interpolate speeds smoothly
      const currentSpeed = shipPosRef.current.shield <= 0 ? 0 : 
        (gameState.speed + (targetSpeedValue - gameState.speed) * 0.12);
      
      // Update local state value for UI
      setGameState(prev => {
        if (Math.abs(prev.speed - currentSpeed) > 0.05) {
          return { ...prev, speed: currentSpeed, distance: prev.distance + currentSpeed * 0.06 };
        } else {
          return { ...prev, distance: prev.distance + currentSpeed * 0.06 };
        }
      });

      // 2. TIMERS & DECAY
      if (comboTimerRef.current > 0) {
        comboTimerRef.current -= 1.6; // combo timer decay
        if (comboTimerRef.current <= 0) {
          comboRef.current = 0;
        }
      }

      // Decrement arcade timer
      timeLeftRef.current -= 1 / 60; // 60fps
      if (timeLeftRef.current <= 0) {
        // Force Game Over
        timeLeftRef.current = 0;
        setGameState(prev => {
          const isNewRecord = scoreRef.current > prev.highScore;
          if (isNewRecord) {
            try {
              localStorage.setItem('spacestar_highscore', scoreRef.current.toString());
            } catch (e) {}
          }
          return {
            ...prev,
            isGameOver: true,
            isNewRecord,
            highScore: isNewRecord ? scoreRef.current : prev.highScore,
          };
        });
        spaceAudio.shutdown();
      }

      // Sync React state timers occasionally
      if (Math.floor(timeLeftRef.current) !== Math.floor(timeLeft)) {
        setTimeLeft(Math.max(0, Math.floor(timeLeftRef.current)));
      }

      // 3. VEHICLE CONTROLS (SPACESHIP HANDLING)
      let dx = 0;
      let dy = 0;

      if (controlType === 'keyboard') {
        const speedMultiplier = isBoostingState ? 4.8 : 3.8;
        if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
          dx = -speedMultiplier;
        }
        if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
          dx = speedMultiplier;
        }
        if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W']) {
          dy = speedMultiplier; // ship rising (+Y coordinate in float space)
        }
        if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S']) {
          dy = -speedMultiplier; // ship descending (-Y coordinate in float space)
        }

        // Apply velocities to ship reference position
        shipPosRef.current.x += dx;
        shipPosRef.current.y += dy;
      } else if (controlType === 'touch' && touchActive.current) {
        // Direct touch control movement multiplier
        const touchSpeedMultiplier = isBoostingState ? 5.5 : 4.0;
        shipPosRef.current.x += touchDirection.current.x * touchSpeedMultiplier;
        shipPosRef.current.y += touchDirection.current.y * touchSpeedMultiplier;
      } else {
        // Mouse/Pointer hover coordinates damping
        const targetXMouse = mousePosition.current.x;
        const targetYMouse = mousePosition.current.y;
        shipPosRef.current.x += (targetXMouse - shipPosRef.current.x) * 0.12;
        shipPosRef.current.y += (targetYMouse - shipPosRef.current.y) * 0.12;

        dx = targetXMouse - shipPosRef.current.x;
        dy = targetYMouse - shipPosRef.current.y;
      }

      // Constrain spaceship limits to avoid flying outside projection screen limits
      const widthBounds = 190;
      const heightBounds = 130;
      if (shipPosRef.current.x < -widthBounds) shipPosRef.current.x = -widthBounds;
      if (shipPosRef.current.x > widthBounds) shipPosRef.current.x = widthBounds;
      if (shipPosRef.current.y < -heightBounds) shipPosRef.current.y = -heightBounds;
      if (shipPosRef.current.y > heightBounds) shipPosRef.current.y = heightBounds;

      // Apply aerodynamic dynamic rolling (z tilt) based on keyboard/touch movement
      let targetRoll = 0;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A'] || touchDirection.current.x < -0.1) {
        targetRoll = -0.42; // roll left
      } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D'] || touchDirection.current.x > 0.1) {
        targetRoll = 0.42; // roll right
      } else if (controlType === 'mouse' && Math.abs(dx) > 1.5) {
        targetRoll = Math.max(-0.45, Math.min(0.45, dx * 0.04));
      }
      shipPosRef.current.roll += (targetRoll - shipPosRef.current.roll) * 0.12;

      // Apply dynamic pitch (diving/ascending tilt)
      let targetPitch = 0;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['w'] || keysPressed.current['W'] || touchDirection.current.y > 0.1) {
        targetPitch = -0.25; // nose rising
      } else if (keysPressed.current['ArrowDown'] || keysPressed.current['s'] || keysPressed.current['S'] || touchDirection.current.y < -0.1) {
        targetPitch = 0.25; // nose diving
      } else if (controlType === 'mouse' && Math.abs(dy) > 1.5) {
        targetPitch = Math.max(-0.3, Math.min(0.3, -dy * 0.05));
      }
      shipPosRef.current.pitch += (targetPitch - shipPosRef.current.pitch) * 0.12;

      // Trigger thruster fire plume
      if (Math.random() < 0.85) {
        spawnThrusterJet(shipPosRef.current.x, shipPosRef.current.y);
      }

      // Sync speed hum oscillator context safely
      const tiltOffset = Math.abs(shipPosRef.current.roll) + Math.abs(shipPosRef.current.pitch);
      spaceAudio.updateEngineHum(currentSpeed / 12.5, tiltOffset);

      // 4. DRAW WARP SPACE GRID TUNNEL CIRCLES
      ctx.lineWidth = 1.3;
      tunnelRingsRef.current.forEach(ring => {
        // Move ring closer through Z space
        ring.z -= currentSpeed * 0.82;
        if (ring.z <= 10) {
          ring.z = 1000; // recycle and push far away
        }

        // Draw circles in perspective projection
        if (ring.z > 20) {
          const rx = cx;
          const ry = cy;
          // Scale diameter based on distance Z
          const radius = (ring.maxRadius / ring.z) * f;
          
          // Outer spiral tunnel circle
          ctx.beginPath();
          ctx.arc(rx, ry, radius, 0, Math.PI * 2);
          
          // Fade opacity based on depth distance
          const opacity = Math.min(0.35, Math.max(0.01, 1 - (ring.z / 1000)));
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
          ctx.stroke();

          // Add crosshair hub guides inside spiral
          ctx.beginPath();
          ctx.arc(rx, ry, radius * 0.15, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.4})`;
          ctx.stroke();
        }
      });

      // 5. RENDER BACKGROUND STARS / DUST
      backgroundsRef.current.forEach(star => {
        // Shift forwards
        star.z -= currentSpeed;
        if (star.z <= 10) {
          // Recycle far
          star.z = 1000;
          star.x = (Math.random() - 0.5) * 1600;
          star.y = (Math.random() - 0.5) * 1200;
        }

        // Draw dynamic linear streak stars representing velocity vector
        if (star.z > 20) {
          // Current projection coordinates
          const sx = cx + (star.x / star.z) * f;
          const sy = cy - (star.y / star.z) * f;

          // Previous coordinate position representing speed streaking
          const prevZ = star.z + currentSpeed * 1.8;
          const px = cx + (star.x / prevZ) * f;
          const py = cy - (star.y / prevZ) * f;

          // Verify if it is inside boundary to minimize off-canvas draw calculations
          if (sx >= 0 && sx <= canvas.width && sy >= 0 && sy <= canvas.height) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            
            // Further stars are dimmer and thinner
            const size = (star.size / star.z) * f * 0.18;
            ctx.lineWidth = Math.max(0.6, Math.min(size, 2.5));

            const alpha = Math.min(1.0, Math.max(0.05, 1 - (star.z / 1000))) * star.opacity;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.stroke();
          }
        }
      });

      // 6. RENDER FLOATING COLLECTIBLE STARS
      starsRef.current.forEach(star => {
        // Move towards the ship physical plane depth
        star.z -= currentSpeed * 0.85;
        star.spin += star.spinSpeed;

        // If star passes through ship viewport plane
        if (star.z <= 40) {
          // It was not collected in time - Recycle far in distance
          star.z = 1000 + Math.random() * 80;
          star.x = (Math.random() - 0.5) * 380;
          star.y = (Math.random() - 0.5) * 260;
          star.points = Math.random() > 0.85 ? 5 : (Math.random() > 0.65 ? 2 : 1);
          star.type = star.points === 5 ? 'pink' : (star.points === 2 ? 'cyan' : 'gold');
        }

        // Perform 3D collision check! Ship is physically on Z=150 plane.
        const zThreshold = 25;
        if (Math.abs(star.z - shipPosRef.current.z) < zThreshold) {
          // Calculate 2D Cartesian distance in X & Y coordinate frame
          const distShipSpace = Math.sqrt(
            Math.pow(star.x - shipPosRef.current.x, 2) + 
            Math.pow(star.y - shipPosRef.current.y, 2)
          );

          // HIGHLY FORGIVING COLLISION WINDOW (Increased from 26 to 45 for effortless targeting!)
          const collectThreshold = 45;
          if (distShipSpace < collectThreshold) {
            // SUCCESSFUL star collection!
            const addedPoints = star.points;
            scoreRef.current += addedPoints;
            comboRef.current += 1;
            comboTimerRef.current = 100; // Refill combo meter to full state

            // Synthesize collection audio chime chime
            spaceAudio.playCollect(comboRef.current);
            if (comboRef.current % 5 === 0) {
              spaceAudio.playStreakBonus();
            }

            // Explode spark particles at projected screenspace coordinates
            const projSX = cx + (star.x / star.z) * f;
            const projSY = cy - (star.y / star.z) * f;
            
            const starColors = {
              gold: '#facc15', // Gold
              cyan: '#06b6d4', // Cyan
              pink: '#ec4899', // Pink
              rainbow: '#a855f7'
            };
            const explosionColor = starColors[star.type] || '#facc15';

            spawnExplosion(star.x, star.y, star.z, explosionColor, 22);

            // Time reward logic! Add bonus seconds
            const timeReward = star.type === 'pink' ? 5.0 : (star.type === 'cyan' ? 3.0 : 1.5);
            timeLeftRef.current = Math.min(60, timeLeftRef.current + timeReward);

            // Instantly recycle collected star in the far background
            star.z = 1000 + Math.random() * 50;
            star.x = (Math.random() - 0.5) * 400;
            star.y = (Math.random() - 0.5) * 280;
            star.points = Math.random() > 0.88 ? 5 : (Math.random() > 0.65 ? 2 : 1);
            star.type = star.points === 5 ? 'pink' : (star.points === 2 ? 'cyan' : 'gold');

            // Quick trigger React state update to keep score synced
            setGameState(prev => ({
              ...prev,
              score: scoreRef.current,
              streakCount: comboRef.current,
            }));
          }
        }

        // Draw star in perspective
        if (star.z > 25) {
          const starX = cx + (star.x / star.z) * f;
          const starY = cy - (star.y / star.z) * f;

          // Sizing scale with exponential depth perspective
          const starScale = (18 / star.z) * f;

          if (starX >= -100 && starX <= canvas.width + 100 && starY >= -100 && starY <= canvas.height + 100) {
            // Apply pulse effect
            const pulse = 1.0 + Math.sin(star.spin * 2) * 0.08;
            const radiusOuter = starScale * pulse;
            const radiusInner = radiusOuter * 0.45;

            ctx.save();
            ctx.shadowBlur = radiusOuter * 0.6;
            
            // Choose colors based on star tier type
            if (star.type === 'pink') {
               ctx.shadowColor = 'rgba(236, 72, 153, 0.82)'; // Pink nebula gem
              ctx.fillStyle = '#f472b6';
              ctx.strokeStyle = '#ec4899';
            } else if (star.type === 'cyan') {
              ctx.shadowColor = 'rgba(6, 182, 212, 0.82)'; // Cyan crystal
              ctx.fillStyle = '#22d3ee';
              ctx.strokeStyle = '#06b6d4';
            } else {
              ctx.shadowColor = 'rgba(234, 179, 8, 0.82)'; // Gold star
              ctx.fillStyle = '#fde047';
              ctx.strokeStyle = '#eab308';
            }

            // Draw stellar 5-pointed coordinates
            ctx.beginPath();
            const pointsCount = 5;
            for (let p = 0; p < pointsCount * 2; p++) {
              const theta = (p * Math.PI) / pointsCount + star.spin;
              const r = p % 2 === 0 ? radiusOuter : radiusInner;
              const sx = starX + Math.cos(theta) * r;
              const sy = starY + Math.sin(theta) * r;
              if (p === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Inner cute glowing crystal core
            ctx.beginPath();
            ctx.arc(starX, starY, radiusInner * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Render miniature indicator text for values when moderately close
            if (star.z < 600 && star.type !== 'gold') {
              ctx.font = `650 ${Math.max(9, radiusInner * 0.7)}px var(--font-sans)`;
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(`+${star.points}`, starX, starY + radiusOuter * 1.5);
            }

            ctx.restore();
          }
        }
      });

      // 6.5 DYNAMIC LEVEL SCALING & ASTEROID GENERATION / RENDER CODE
      const currentLevel = Math.floor(scoreRef.current / 5) + 1;
      const targetAsteroidLimit = Math.min(18, 3 + currentLevel * 2); // Scales count dynamically based on current Level!
      
      // Auto scale asteroids active lists
      while (asteroidsRef.current.length < targetAsteroidLimit) {
        asteroidsRef.current.push(spawnNewAsteroid(1000 + Math.random() * 300));
      }

      asteroidsRef.current.forEach(ast => {
        // Move towards the ship physical plane depth
        ast.z -= currentSpeed * 0.95; // Asteroids fly at high warp velocity
        ast.rotation += ast.rollSpeed;
        
        // Minor orbital drifting
        ast.x += ast.vx;
        ast.y += ast.vy;

        // If asteroid has passed behind the ship (Z <= 40)
        if (ast.z <= 40) {
          // Recycle far away
          Object.assign(ast, spawnNewAsteroid(1000 + Math.random() * 120));
        }

        // 3D Collision Check with Ship plane (Z=150)
        const zThreshold = 25;
        if (Math.abs(ast.z - shipPosRef.current.z) < zThreshold) {
          const distShipSpace = Math.sqrt(
            Math.pow(ast.x - shipPosRef.current.x, 2) + 
            Math.pow(ast.y - shipPosRef.current.y, 2)
          );

          // Proximity checkpoint represents the asteroid physical collision size
          const impactBounds = ast.size * 0.95;
          if (distShipSpace < impactBounds) {
            // Player got struck! Subtract health protective shield
            const damage = ast.color === 'red' ? 20 : 12;
            shieldRef.current = Math.max(0, shieldRef.current - damage);
            setShield(Math.floor(shieldRef.current));

            // Dramatic visual sparks explosion
            const blastColor = ast.color === 'red' ? '#f43f5e' : '#9ca3af';
            spawnExplosion(ast.x, ast.y, ast.z, blastColor, 24);
            
            // Play negative synthesizer alarming tone
            spaceAudio.playStreakBonus(); 

            // Red warning overlay flash feedback
            ctx.save();
            ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Handle Shield Zeroed out -> Instant Game Over!
            if (shieldRef.current <= 0) {
              setGameState(prev => {
                const isNewRecord = scoreRef.current > prev.highScore;
                if (isNewRecord) {
                  try {
                    localStorage.setItem('spacestar_highscore', scoreRef.current.toString());
                  } catch (e) {}
                }
                return {
                  ...prev,
                  isGameOver: true,
                  isNewRecord,
                  highScore: isNewRecord ? scoreRef.current : prev.highScore,
                };
              });
              spaceAudio.shutdown();
            }

            // Instantly recycle asteroid on impact
            Object.assign(ast, spawnNewAsteroid(1000 + Math.random() * 200));
          }
        }

        // Draw Asteroids in 3D projection
        if (ast.z > 25) {
          const astX = cx + (ast.x / ast.z) * f;
          const astY = cy - (ast.y / ast.z) * f;

          // Sizing factor with depth coordinates
          const rockRadius = (ast.size / ast.z) * f * 1.5;

          if (astX >= -200 && astX <= canvas.width + 200 && astY >= -200 && astY <= canvas.height + 200) {
            ctx.save();
            ctx.shadowBlur = rockRadius * 0.45;
            
            if (ast.color === 'red') {
              ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
              ctx.fillStyle = '#991b1b'; // obsidian volcanic core
              ctx.strokeStyle = '#ef4444'; // glowing red lava fissures
            } else {
              ctx.shadowColor = 'rgba(115, 115, 115, 0.4)';
              ctx.fillStyle = '#374151'; // dusty iron granite core
              ctx.strokeStyle = '#9ca3af'; // silver crater ridges
            }

            ctx.beginPath();
            const ridges = 8;
            for (let r = 0; r < ridges; r++) {
              const theta = (r * Math.PI * 2) / ridges + ast.rotation;
              // Make it rough and organic
              const irregularity = 0.82 + Math.cos(r * 1.3 + ast.size) * 0.16;
              const rad = rockRadius * irregularity;
              const rx = astX + Math.cos(theta) * rad;
              const ry = astY + Math.sin(theta) * rad;
              if (r === 0) ctx.moveTo(rx, ry);
              else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Inner geological craters details
            ctx.strokeStyle = ast.color === 'red' ? '#7f1d1d' : '#1f2937';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(astX - rockRadius * 0.2, astY - rockRadius * 0.15, rockRadius * 0.25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(astX + rockRadius * 0.3, astY + rockRadius * 0.25, rockRadius * 0.15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
          }
        }
      });

      // 7. RENDER EXPLOSIONS & THRUSTER PARTICLES
      particlesRef.current.forEach((p, idx) => {
        // Move particle in 3D frame
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.life--;

        // Project particle
        if (p.life > 0 && p.z > 10) {
          const px = cx + (p.x / p.z) * f;
          const py = cy - (p.y / p.z) * f;
          const size = (p.size / p.z) * f;

          if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            
            // Alpha decay
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0; // restore
          }
        }
      });

      // Retain active particles with remaining life
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.z > 10);

      // 8. GRAPHICALLY RENDER 3D SPACESHIP CAD MODEL
      // Coordinates of vertices representing our advanced, premium starfighter ship
      const ship = shipPosRef.current;
      const rollMat = ship.roll;
      const pitchMat = ship.pitch;
      
      const vertices: { [key: string]: number[] } = {
        noseTip: [0, 0, 32],                // sleek elongated nose point
        hullTopAhead: [0, 3.5, 18],          // cockpit top rise
        hullBaseAhead: [0, -3.0, 18],        // bottom structural plate node
        canopyPeak: [0, 5.5, 5],             // curved canopy peak
        canopyRear: [0, 3.0, -5],            // canopy back sloping assembly
        fuselageCenter: [0, -1, 0],          // structural central point
        engineNozzleLeft: [-8, -1.0, -18],   // heavy cylindrical thruster port exhaust
        engineNozzleRight: [8, -1.0, -18],   // heavy cylindrical thruster starboard exhaust
        keelFinPeak: [0, 10.5, -15],          // vertical wing fin peak stabilizer
        wingPortBase: [-8, -1.2, -1],        // inner swept wings mount
        wingPortSweep: [-28, -4.0, -12],      // backward aerodynamic swept wing tip
        wingPortGun: [-30, -3.5, -2],        // twin laser cannon tips pointing forward
        wingStbdBase: [8, -1.2, -1],
        wingStbdSweep: [28, -4.0, -12],
        wingStbdGun: [30, -3.5, -2]
      };

      // Math matrix rotation helper around localized ship vectors
      const transformNode = (v: number[]) => {
        const lx = v[0];
        const ly = v[1];
        const lz = v[2];

        // 1. Roll rotation (tilt around Z axis)
        const x1 = lx * Math.cos(rollMat) - ly * Math.sin(rollMat);
        const y1 = lx * Math.sin(rollMat) + ly * Math.cos(rollMat);
        const z1 = lz;

        // 2. Pitch rotation (climb/dive around X-axis)
        const x2 = x1;
        const y2 = y1 * Math.cos(pitchMat) - z1 * Math.sin(pitchMat);
        const z2 = y1 * Math.sin(pitchMat) + z1 * Math.cos(pitchMat);

        // Translate using physical ship offset world frame
        const xw = x2 + ship.x;
        const yw = y2 + ship.y;
        const zw = z2 + ship.z; // Z position fixed at 150

        // Project onto screenspace
        const sx = cx + (xw / zw) * f;
        const sy = cy - (yw / zw) * f;

        return { x: sx, y: sy, depth: zw };
      };

      // Transform all vertices to 2D nodes
      const nodes: { [key: string]: { x: number; y: number; depth: number } } = {};
      Object.keys(vertices).forEach(key => {
        nodes[key] = transformNode(vertices[key]);
      });

      // Render outer cockpit high-tech target crosshair lock
      const drawHUDInterface = () => {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(nodes.noseTip.x - 45, nodes.noseTip.y);
        ctx.lineTo(nodes.noseTip.x - 12, nodes.noseTip.y);
        ctx.moveTo(nodes.noseTip.x + 12, nodes.noseTip.y);
        ctx.lineTo(nodes.noseTip.x + 45, nodes.noseTip.y);
        
        ctx.moveTo(nodes.noseTip.x, nodes.noseTip.y - 30);
        ctx.lineTo(nodes.noseTip.x, nodes.noseTip.y - 12);
        ctx.moveTo(nodes.noseTip.x, nodes.noseTip.y + 12);
        ctx.lineTo(nodes.noseTip.x, nodes.noseTip.y + 30);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nodes.noseTip.x, nodes.noseTip.y, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };

      drawHUDInterface();

      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = isBoostingState ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 0, 255, 0.4)';

      // Layer A: Swept Right Wing (Starboard Wing Plate)
      ctx.beginPath();
      ctx.moveTo(nodes.fuselageCenter.x, nodes.fuselageCenter.y);
      ctx.lineTo(nodes.wingStbdBase.x, nodes.wingStbdBase.y);
      ctx.lineTo(nodes.wingStbdSweep.x, nodes.wingStbdSweep.y);
      ctx.lineTo(nodes.engineNozzleRight.x, nodes.engineNozzleRight.y);
      ctx.closePath();
      const gradStbd = ctx.createLinearGradient(nodes.wingStbdBase.x, nodes.wingStbdBase.y, nodes.wingStbdSweep.x, nodes.wingStbdSweep.y);
      gradStbd.addColorStop(0, '#4a148c'); // Deep magenta-purple core
      gradStbd.addColorStop(0.5, '#880e4f'); // Hot cherry magenta
      gradStbd.addColorStop(1, '#ff00ff'); // Neon pink wingtip
      ctx.fillStyle = gradStbd;
      ctx.fill();
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Swept Right Laser Pod
      ctx.beginPath();
      ctx.moveTo(nodes.wingStbdSweep.x, nodes.wingStbdSweep.y);
      ctx.lineTo(nodes.wingStbdGun.x, nodes.wingStbdGun.y);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Layer B: Swept Left Wing (Port Wing Plate)
      ctx.beginPath();
      ctx.moveTo(nodes.fuselageCenter.x, nodes.fuselageCenter.y);
      ctx.lineTo(nodes.wingPortBase.x, nodes.wingPortBase.y);
      ctx.lineTo(nodes.wingPortSweep.x, nodes.wingPortSweep.y);
      ctx.lineTo(nodes.engineNozzleLeft.x, nodes.engineNozzleLeft.y);
      ctx.closePath();
      const gradPort = ctx.createLinearGradient(nodes.wingPortBase.x, nodes.wingPortBase.y, nodes.wingPortSweep.x, nodes.wingPortSweep.y);
      gradPort.addColorStop(0, '#4a148c');
      gradPort.addColorStop(0.5, '#880e4f');
      gradPort.addColorStop(1, '#ff00ff');
      ctx.fillStyle = gradPort;
      ctx.fill();
      ctx.strokeStyle = '#ff00ff';
      ctx.stroke();

      // Swept Left Laser Pod
      ctx.beginPath();
      ctx.moveTo(nodes.wingPortSweep.x, nodes.wingPortSweep.y);
      ctx.lineTo(nodes.wingPortGun.x, nodes.wingPortGun.y);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Layer C: Heavy Engine cylinders
      const drawEngineNozzle = (baseNode: { x: number; y: number }, outerColor: string) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(baseNode.x, baseNode.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = outerColor;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Glowing reactor core inside nozzle
        ctx.beginPath();
        ctx.arc(baseNode.x, baseNode.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isBoostingState ? '#00ffff' : '#ff00ff';
        ctx.fill();
        ctx.restore();
      };
      drawEngineNozzle(nodes.engineNozzleLeft, 'rgba(0, 255, 255, 0.5)');
      drawEngineNozzle(nodes.engineNozzleRight, 'rgba(0, 255, 255, 0.5)');

      // Layer D: Sleek Spindle Fuselage Core (Heavy plate chassis)
      ctx.beginPath();
      ctx.moveTo(nodes.noseTip.x, nodes.noseTip.y);
      ctx.lineTo(nodes.wingStbdBase.x, nodes.wingStbdBase.y);
      ctx.lineTo(nodes.engineNozzleRight.x, nodes.engineNozzleRight.y);
      ctx.lineTo(nodes.fuselageCenter.x, nodes.fuselageCenter.y);
      ctx.lineTo(nodes.engineNozzleLeft.x, nodes.engineNozzleLeft.y);
      ctx.lineTo(nodes.wingPortBase.x, nodes.wingPortBase.y);
      ctx.closePath();
      const gradFuselage = ctx.createLinearGradient(nodes.noseTip.x, nodes.noseTip.y, nodes.fuselageCenter.x, nodes.fuselageCenter.y);
      gradFuselage.addColorStop(0, '#ffffff'); // polished titanium white nose
      gradFuselage.addColorStop(0.2, '#94a3b8'); // steel gray upper plates
      gradFuselage.addColorStop(0.7, '#1e293b'); // dark navy alloy paneling
      gradFuselage.addColorStop(1, '#0f172a'); // carbon-black engine base
      ctx.fillStyle = gradFuselage;
      ctx.fill();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Layer E: Pilot Cockpit Sapphire Glass Dome
      ctx.beginPath();
      ctx.moveTo(nodes.hullTopAhead.x, nodes.hullTopAhead.y);
      ctx.lineTo(nodes.canopyPeak.x, nodes.canopyPeak.y);
      ctx.lineTo(nodes.canopyRear.x, nodes.canopyRear.y);
      ctx.lineTo(nodes.hullBaseAhead.x, nodes.hullBaseAhead.y);
      ctx.closePath();
      const gradCanopy = ctx.createRadialGradient(nodes.canopyPeak.x, nodes.canopyPeak.y, 2, nodes.canopyPeak.x, nodes.canopyPeak.y, 9);
      gradCanopy.addColorStop(0, '#e0f7fa'); // super glint sun reflection
      gradCanopy.addColorStop(0.3, '#00ffff'); // neon electric cyan
      gradCanopy.addColorStop(0.8, '#01579b'); // royal space blue
      gradCanopy.addColorStop(1, '#000a12'); // black frame rim
      ctx.fillStyle = gradCanopy;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Layer F: Dynamic Keel Fin top rudder
      ctx.beginPath();
      ctx.moveTo(nodes.canopyRear.x, nodes.canopyRear.y);
      ctx.lineTo(nodes.keelFinPeak.x, nodes.keelFinPeak.y);
      ctx.lineTo(nodes.fuselageCenter.x, nodes.fuselageCenter.y - 10);
      ctx.closePath();
      const gradFin = ctx.createLinearGradient(nodes.canopyRear.x, nodes.canopyRear.y, nodes.keelFinPeak.x, nodes.keelFinPeak.y);
      gradFin.addColorStop(0, '#d1c4e9');
      gradFin.addColorStop(0.6, '#311b92');
      gradFin.addColorStop(1, '#00ffff');
      ctx.fillStyle = gradFin;
      ctx.fill();
      ctx.strokeStyle = '#00ffff';
      ctx.stroke();

      // Layer G: Left Red / Right Green active wingtip aviation safety blinking beacons!
      const blinkOn = Math.floor(Date.now() / 200) % 2 === 0;
      if (blinkOn) {
        // Red beacon on Port wing
        ctx.beginPath();
        ctx.arc(nodes.wingPortSweep.x, nodes.wingPortSweep.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#f87171';
        ctx.fill();

        // Green beacon on Starboard wing
        ctx.beginPath();
        ctx.arc(nodes.wingStbdSweep.x, nodes.wingStbdSweep.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#4ade80';
        ctx.fill();
      }

      ctx.restore(); // restore shadows

      // 9. SCREEN BORDER METALLIC TILT WARPING EFFECT
      // Render cute sci-fi bounding frame borders inside canvas
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, timeLeft, isAudioMuted, controlType]);

  // Adjust canvas dimensions dynamically on sidebars or container sizes resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = Math.max(480, container.clientHeight);
    };

    // Run first time
    handleResize();

    // Setup listener
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      className="relative w-full h-[580px] bg-[#050510] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.08)] flex flex-col font-sans select-none touch-none" 
      ref={containerRef}
      onPointerMove={handlePointerMove}
    >
      {/* 3D RENDER CANVAS */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
      />

      {/* FLOATING TOP HEAD PANEL (SCOREBOARD + TIMER + METERS) */}
      {gameState.hasStarted && !gameState.isGameOver && (
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start pointer-events-none z-10">
          
          {/* LEFT PANEL: SPEEDOMETER & DEFLECTION SHIELDS */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-900/80 backdrop-blur-md rounded-xl border border-sky-500/20 shadow-lg text-white pointer-events-auto min-w-[150px]">
            {/* Speedometer section */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-sky-400 font-bold">
                <Rocket className="w-3.5 h-3.5 animate-pulse" />
                <span>Space Engine</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                <span className="text-xl font-black text-white">
                  {(gameState.speed * 125).toFixed(0)}
                </span>
                <span className="text-[9px] text-slate-400">LY/h</span>
              </div>
              {/* Boost threshold meter */}
              <div className="w-full bg-slate-950 h-1.5 mt-0.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-150 rounded-full ${
                    gameState.speed > 8 ? 'bg-amber-400 animate-pulse' : 'bg-sky-400'
                  }`}
                  style={{ width: `${(gameState.speed / 12.5) * 100}%` }}
                />
              </div>
            </div>

            {/* Protective Shield integrity bar Section */}
            <div className="border-t border-slate-800 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                <Shield className={`w-3.5 h-3.5 ${shield < 35 ? 'text-rose-500 animate-bounce' : ''}`} />
                <span>Deflection Shield</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                <span className={`text-xl font-black ${shield < 35 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {shield}%
                </span>
              </div>
              {/* Shield integrity gauge bar */}
              <div className="w-full bg-slate-950 h-1.5 mt-0.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    shield < 35 ? 'bg-rose-500 animate-pulse' : (shield < 65 ? 'bg-amber-500' : 'bg-emerald-500')
                  }`}
                  style={{ width: `${shield}%` }}
                />
              </div>
            </div>

            <span className="text-[9px] text-slate-400 leading-tight">
              {controlType === 'keyboard' ? 'Hold [Shift] to Boost' : 'Autopilot active'}
            </span>
          </div>

          {/* MAIN CENTER PANEL: GIANT NEON SCORE */}
          <div className="flex flex-col items-center mt-3">
            <span className="text-xs uppercase tracking-[0.25em] text-white/60 font-medium">
              Current Mission Score
            </span>
            <div className="flex items-center mt-1 filter drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]">
              <span className="text-7xl sm:text-8xl md:text-9xl font-black bg-gradient-to-b from-[#00ffff] to-[#ff00ff] bg-clip-text text-transparent font-mono tracking-[-0.05em] leading-none">
                {String(gameState.score).padStart(2, '0')}
              </span>
            </div>

            {/* COMBO MULTIPLIER POPUP */}
            {gameState.streakCount > 1 && comboTimerRef.current > 0 && (
              <div 
                className="mt-2 flex flex-col items-center animate-bounce bg-yellow-400/10 border border-yellow-400/40 px-3 py-0.5 rounded-full backdrop-blur-sm shadow-xl"
                style={{ opacity: comboTimerRef.current / 100 }}
              >
                <span className="text-yellow-300 font-bold text-xs uppercase tracking-wider font-mono">
                  ★ {gameState.streakCount} Combo Multiplier ★
                </span>
                {/* Combo mini decay line */}
                <div 
                  className="bg-yellow-400 h-0.5 mt-0.5 rounded-full transition-all duration-75"
                  style={{ width: `${comboTimerRef.current}%` }}
                />
              </div>
            )}
          </div>

          {/* RIGHT PANEL: CHRONO TIMER COUNTER */}
          <div className="flex flex-col items-end gap-2 text-white">
            <div className="p-3 bg-slate-900/80 backdrop-blur-md rounded-xl border border-rose-500/20 shadow-lg text-right min-w-[130px] pointer-events-auto">
              <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-widest text-rose-400 font-bold">
                <div className={`w-1.5 h-1.5 rounded-full bg-rose-500 ${timeLeft < 10 ? 'animate-ping' : ''}`} />
                <span>Warp Drive Cooldown</span>
              </div>
              <div className="flex items-baseline justify-end gap-0.5 mt-1 font-mono">
                <span className={`text-2xl font-black ${timeLeft < 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                  {timeLeft.toFixed(0)}
                </span>
                <span className="text-xs text-slate-400">s</span>
              </div>
              {/* Cooldown bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    timeLeft < 10 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
                />
              </div>
            </div>

            {/* HIGHSCORE PILL */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/50 rounded-full px-3 py-1 font-mono text-xs shadow-md">
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-slate-400">Record:</span>
              <span className="text-white font-bold">{gameState.highScore}</span>
            </div>
          </div>

        </div>
      )}

      {/* AUDIO MUTE PILL OVERLAY (ALWAYS ACCESSIBLE WHEN ACTIVE) */}
      {gameState.hasStarted && !gameState.isGameOver && (
        <button 
          onClick={handleToggleMute}
          className="absolute bottom-4 right-4 p-2.5 bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-white rounded-full pointer-events-auto shadow-md transition-all z-10"
          id="btn_game_mute"
          title="Toggle Mute"
        >
          {isAudioMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
        </button>
      )}

      {/* CENTRAL OVERLAYS (START SCREEN, GAME OVER, TUTORIALS) */}
      
      {/* 1. START GAME SCREEN */}
      {!gameState.hasStarted && (
        <div className="absolute inset-0 bg-[#040409]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          {/* Glowing background vector shapes */}
          <div className="absolute w-[300px] h-[300px] bg-sky-500/10 rounded-full filter blur-[100px] -z-10 animate-pulse" />
          <div className="absolute w-[200px] h-[200px] bg-purple-500/10 rounded-full filter blur-[80px] -z-10" />

          {/* Icon ship logo header */}
          <div className="mb-4 relative p-4 bg-slate-800/40 border border-sky-500/30 rounded-3xl glow">
            <Rocket className="w-12 h-12 text-sky-400 animate-bounce" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight uppercase font-sans">
            3D Space Star Game
          </h1>
          <p className="text-xs text-sky-300 font-mono tracking-widest uppercase mt-1 mb-6">
            ★ Cosmic Star Collector Sim ★
          </p>

          <p className="text-slate-300 text-sm max-w-sm leading-relaxed mb-6">
            우주선을 3D 방향키로 조종해 우주 공간에 부유하는 <span className="text-yellow-300 font-semibold">빛나는 별</span>을 모으세요. 별을 모으면 시간이 연장되고 추가 보너스를 획득합니다!
          </p>

          {/* Quick instructions panel */}
          <div className="w-full max-w-xs bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-left mb-6 font-mono text-xs text-slate-400 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white border-b border-slate-800 pb-1.5 justify-center">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold">CONTROL SCHEME</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span>✈ Steering:</span>
              <span className="text-sky-300 font-bold bg-slate-950 px-2 py-0.5 rounded text-[10px]">
                Arrow Keys / WASD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>⚡ Quantum Boost:</span>
              <span className="text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded text-[10px]">
                Hold Shift
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>🖱 Mouse Play:</span>
              <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded text-[10px]">
                Hover to Guided Glide
              </span>
            </div>
          </div>

          {/* Master volume start warning */}
          <button 
            onClick={handleStartGame}
            className="flex items-center gap-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-3.5 px-8 rounded-full text-base tracking-wider uppercase shadow-[0_4px_20px_rgba(56,189,248,0.4)] transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
            id="btn_game_start"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START WARP DRIVE</span>
          </button>

          <div className="flex items-center gap-4 mt-6">
            <button 
              onClick={() => setShowHowToPlay(!showHowToPlay)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs pointer-events-auto font-mono"
            >
              <Info className="w-4 h-4 text-sky-400" />
              <span>별자리 특성 보기</span>
            </button>
            <button 
              onClick={(e) => handleToggleMute(e)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs pointer-events-auto font-mono border-l border-slate-700 pl-4"
            >
              {isMuted => isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
              <span>{isAudioMuted ? 'Muted' : 'Sound Synthesizer'}</span>
            </button>
          </div>

          {/* How To Play Dropdown modal */}
          {showHowToPlay && (
            <div className="mt-4 p-3.5 bg-slate-950/90 border border-sky-500/30 rounded-xl text-left text-xs text-slate-300 max-w-xs animate-fadeIn leading-relaxed">
              <p className="font-semibold text-sky-300 font-sans mb-1 pb-1 border-b border-slate-800">우주 별 종류와 점수:</p>
              <ul className="list-none space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping inline-block" />
                  <span className="text-yellow-300 font-bold">골드 스타 (★)</span>: 기본 1점 (+1.5초 부스트)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-cyan-300 font-bold">네온 수성 (★★)</span>: 2점 (+3.0초 부스트)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
                  <span className="text-pink-300 font-bold">은하 프리즘 (★★★★★)</span>: 5점 (+5.0초 부스트)
                </li>
              </ul>
              <p className="mt-2 text-[10px] text-slate-500">
                연속해서 별을 빠르게 먹으면 <span className="text-yellow-400 font-semibold">콤보 보너스 음향 시퀀스</span>가 열립니다!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. GAME OVER OVERLAY SCREEN */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 bg-[#030307]/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="absolute w-[250px] h-[250px] bg-rose-500/10 rounded-full filter blur-[90px] -z-10 animate-pulse" />

          {/* Trophy / Award Indicator */}
          <div className="mb-4 relative p-4 bg-slate-900 border border-amber-500/30 rounded-full">
            <Award className="w-10 h-10 text-yellow-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300 uppercase font-sans">
            {shield <= 0 ? 'Shield Collapsed' : 'Warp Cooldown Complete'}
          </h1>
          <p className="text-rose-400 text-xs font-mono uppercase tracking-widest mt-1.5 mb-6">
            {shield <= 0 ? '🚨 소행성 충돌로 방어용 실드가 고갈되었습니다!' : '⏱️ 웜홀 가속 비행 지속 시간이 종료되었습니다!'}
          </p>

          {/* New Record Alert */}
          {gameState.isNewRecord && (
            <div className="bg-yellow-400/10 border border-yellow-400/40 text-yellow-300 font-mono text-xs font-black py-1 px-4 rounded-full mb-6 animate-pulse">
              🏆 새로운 은하계 점수 기록 갱신! 🏆
            </div>
          )}

          {/* STATS DISCLOSURE CARD */}
          <div className="w-full max-w-xs bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono text-xs mb-8">
            <div className="flex justify-between items-center text-slate-400">
              <span>최종 별 점수:</span>
              <span className="text-yellow-300 text-lg font-black">{gameState.score}점</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-2">
              <span>최고 은하계 기록:</span>
              <span className="text-white font-extrabold">{gameState.highScore}점</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 border-t border-slate-800 pt-2">
              <span>누적 비행 거리:</span>
              <span className="text-sky-300">{(gameState.distance).toFixed(0)} 광년</span>
            </div>
          </div>

          {/* Restart Trigger buttons */}
          <button 
            onClick={handleRestart}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3 px-8 rounded-full text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
            id="btn_game_restart"
          >
            <RotateCcw className="w-4 h-4" />
            <span>한번 더 비행하기</span>
          </button>
        </div>
      )}

      {/* AUDIO INITIATOR OVERLAY FOR FIRST CLICK ACCORDING TO USER FLOW GESTURES */}
      {gameState.hasStarted && !hasInteracted && (
        <div 
          onClick={triggerAudioInitOnFirstClick}
          className="absolute inset-x-0 bottom-16 mx-auto max-w-xs bg-slate-900/90 border border-sky-400/40 rounded-xl p-3 flex items-center justify-between pointer-events-auto text-xs text-slate-300 cursor-pointer shadow-2xl animate-bounce z-10"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="font-semibold text-[11px]">배경 사운드를 활성화하려면 터치하세요!</span>
          </div>
          <span className="bg-sky-500 text-white font-black px-1.5 py-0.5 rounded text-[9px] uppercase">
            Click
          </span>
        </div>
      )}

      {/* INTERACTIVE COMPANION ON-SCREEN DIRECT TOUCH D-PADS (TOUCH SCHEMES ONLY) */}
      {gameState.hasStarted && !gameState.isGameOver && controlType === 'touch' && (
        <div className="absolute bottom-4 left-4 p-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 pointer-events-auto flex gap-1 z-10 transition-opacity">
          <button 
            onMouseDown={() => handleTouchStart({ x: -1, y: 0 })}
            onTouchStart={() => handleTouchStart({ x: -1, y: 0 })}
            onMouseUp={handleTouchEnd}
            onTouchEnd={handleTouchEnd}
            className="w-10 h-10 bg-slate-950/70 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-800 active:bg-sky-500 active:text-white flex items-center justify-center"
            title="Left"
          >
            <ChevronLeft className="w-5 h-5 pointer-events-none" />
          </button>
          <div className="flex flex-col gap-1">
            <button 
              onMouseDown={() => handleTouchStart({ x: 0, y: 1 })}
              onTouchStart={() => handleTouchStart({ x: 0, y: 1 })}
              onMouseUp={handleTouchEnd}
              onTouchEnd={handleTouchEnd}
              className="w-10 h-10 bg-slate-950/70 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-800 active:bg-sky-500 active:text-white flex items-center justify-center animate-pulse"
              title="Up"
            >
              <ChevronUp className="w-5 h-5 pointer-events-none" />
            </button>
            <button 
              onMouseDown={() => handleTouchStart({ x: 0, y: -1 })}
              onTouchStart={() => handleTouchStart({ x: 0, y: -1 })}
              onMouseUp={handleTouchEnd}
              onTouchEnd={handleTouchEnd}
              className="w-10 h-10 bg-slate-950/70 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-800 active:bg-sky-500 active:text-white flex items-center justify-center"
              title="Down"
            >
              <ChevronDown className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
          <button 
            onMouseDown={() => handleTouchStart({ x: 1, y: 0 })}
            onTouchStart={() => handleTouchStart({ x: 1, y: 0 })}
            onMouseUp={handleTouchEnd}
            onTouchEnd={handleTouchEnd}
            className="w-10 h-10 bg-slate-950/70 hover:bg-slate-800 text-sky-400 rounded-xl border border-slate-800 active:bg-sky-500 active:text-white flex items-center justify-center animate-pulse"
            title="Right"
          >
            <ChevronRight className="w-5 h-5 pointer-events-none" />
          </button>
        </div>
      )}

      {/* QUICK STATUS ANCHOR FOOTER RAIL */}
      {gameState.hasStarted && !gameState.isGameOver && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-full flex gap-4 text-[10px] text-slate-400 font-mono tracking-wider z-10 shadow-lg">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CONTROLS:</span>
            <span className="text-white font-bold">
              {controlType === 'keyboard' ? 'KEYBOARD [WASD / ARROWS]' : (controlType === 'mouse' ? 'GUIDED MOUSE GLIDER' : 'ON-SCREEN TOUCH D-PAD')}
            </span>
          </div>
          
          {/* CONTROL SWITCH PILL */}
          <button 
            onClick={() => setControlType(prev => prev === 'keyboard' ? 'mouse' : (prev === 'mouse' ? 'touch' : 'keyboard'))}
            className="text-sky-400 hover:text-white border-l border-slate-800 pl-4 font-bold tracking-tight uppercase cursor-pointer pointer-events-auto"
            title="Switch input mechanism"
          >
            [모드 변경]
          </button>
        </div>
      )}
    </div>
  );
}
