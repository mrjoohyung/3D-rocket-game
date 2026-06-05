/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Spaceship {
  x: number;
  y: number;
  z: number;
  roll: number;  // Rotation around Z axis (steering tilt)
  pitch: number; // Rotation around X axis (diving / climbing tilt)
  yaw: number;   // Rotation around Y axis
  shield: number; // Health / shield percentage (0 to 100)
}

export interface CollectibleStar {
  id: string;
  x: number;
  y: number;
  z: number;
  spin: number;       // Current rotation angle for rendering
  spinSpeed: number;  // Speed of rotation
  type: 'gold' | 'cyan' | 'pink' | 'rainbow'; // Different types of stars with different points
  points: number;
  pulseScale: number; // Subtle hover pulsing
}

export interface SpaceDust {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
}

export interface CosmicAsteroid {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: 'grey' | 'red';
  rollSpeed: number;
  rotation: number;
  vx: number;
  vy: number;
}

export interface GameParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;      // Current remaining frames
  maxLife: number;   // Total dynamic life frames
}

export interface GameState {
  score: number;
  highScore: number;
  speed: number;        // Ship speed through warp (influences tunnel Z scroll)
  targetSpeed: number;  // Smoothly interpolate speed
  distance: number;     // Meters traveled
  isGameOver: boolean;
  isPaused: boolean;
  hasStarted: boolean;
  isNewRecord: boolean;
  streakCount: number;  // Combined stars in quick succession
  streakTimer: number;  // Decay timer for combo streak
}
