export const CONFIG = {
  player: {
    speed: 4.6,         
    speedBoostFactor: 1.45,
    boostSeconds: 7,
    radius: 0.35,       
    eyeHeight: 1.65,
    startPos: { x: 0, z: 8 },
    startYaw: 0,        
    mouseSensitivity: 0.0022,
  },

  camera: { fov: 75, near: 0.05, far: 260 },

  weapons: [
    {
      id: 'pistol', name: 'PISTOLA', file: 'assets/models/pistol.glb',
      startAmmo: 12, maxAmmo: 48, cooldown: 0.28, damage: 1,
      // Parámetros del viewmodel (calibrados con la geometría del modelo)
      view: { scale: 0.010, pos: [0.072, -0.29, -0.17], idleTime: 0.35, fire: [0.03, 0.34],
              expectBox: { min: [-2.4, -1.7, 3.7], max: [1.9, 20.8, 42.9] } },
      flash: { pos: [0.2, 19.0, 45.0], size: 13 },
      pickupAmount: 6,
    },
    {
      id: 'carbine', name: 'CARABINA', file: 'assets/models/carbine.glb',
      startAmmo: 15, maxAmmo: 60, cooldown: 0.22, damage: 1,
      view: { scale: 0.35, pos: [0.09, -0.19, -0.28], idleTime: 0.25, fire: [0.0, 0.28],
              expectBox: { min: [-4.0, -7.1, -34.2], max: [3.6, 24.9, 66.7] } },
      flash: { pos: [0.0, 14.5, 70.0], size: 26 },
      pickupAmount: 8,
    },
  ],

  zombie: {
    file: 'assets/models/zombie.glb',
    height: 1.9,             
    modelUnits: 787,
    hp: 2,                   
    radius: 0.42,            
    hitRadius: 0.55,        
    hitHeightStanding: 1.95,
    hitHeightSitting: 1.25,
    contactDistance: 0.85,   
    types: {
      normal: { speed: 2.3, detect: 13, tint: 0xffffff, scale: 1.0 },
      runner: { speed: 3.5, detect: 17, tint: 0xffb0a0, scale: 0.96 },
    },
  },

  pickupRadius: 1.3,

  extraction: { x: 0, z: -124, radius: 4.5 },

  nav: { minX: -33, maxX: 33, minZ: -133, maxZ: 15, cell: 0.75, inflate: 0.55 },
};

CONFIG.lighting = {
  background: 0x0b0e14,
  fogDensity: 0.022,
  ambient: 1.6,     
  moon: 1.6,         
  exposure: 1.1,
  flashlight: 90,    
};
