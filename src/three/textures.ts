import * as THREE from 'three';

export function createGridFloorTexture(
  baseHex: string,
  lineHex: string,
  tiles = 8,
  repeat = 1,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle paper/terrazzo speckling matching the illustration grain
  ctx.fillStyle = lineHex;
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 420; i++) {
    const x = ((i * 73) % 509) + 1;
    const y = ((i * 137) % 509) + 1;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  const step = size / tiles;
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  for (let i = 0; i <= tiles; i++) {
    const p = Math.round(i * step);
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPegboardTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c99973';
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#6f4e37';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  ctx.fillStyle = '#4c3424';
  for (let y = 14; y < 120; y += 14) {
    for (let x = 14; x < 246; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCorkboardTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b4825c';
  ctx.fillRect(0, 0, 256, 160);

  // Dark teal frame
  ctx.strokeStyle = '#1f4443';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 150);

  // Pinned boba recipe cards
  const cards = [
    { x: 24, y: 24, w: 62, h: 48, bg: '#f6efe0', pin: '#d95f49' },
    { x: 98, y: 20, w: 58, h: 58, bg: '#e3ece8', pin: '#245a59' },
    { x: 168, y: 28, w: 62, h: 44, bg: '#fbe5d6', pin: '#d69c3e' },
    { x: 34, y: 88, w: 72, h: 46, bg: '#f6efe0', pin: '#245a59' },
    { x: 128, y: 92, w: 94, h: 44, bg: '#e8f1eb', pin: '#d95f49' },
  ];
  for (const c of cards) {
    ctx.fillStyle = c.bg;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#1d2d2c';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);

    ctx.fillStyle = '#5f7674';
    ctx.fillRect(c.x + 8, c.y + 16, c.w - 16, 4);
    ctx.fillRect(c.x + 8, c.y + 25, c.w - 24, 4);

    ctx.fillStyle = c.pin;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.1,
    size / 2,
    size / 2,
    size * 0.5,
  );
  grad.addColorStop(0, 'rgba(22, 39, 38, 0.5)');
  grad.addColorStop(0.65, 'rgba(22, 39, 38, 0.2)');
  grad.addColorStop(1, 'rgba(22, 39, 38, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
