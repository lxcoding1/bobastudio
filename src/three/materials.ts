import * as THREE from 'three';

export function createToonGradientMap(): THREE.DataTexture {
  // 4-band crisp cel shading matching Panel A ("3D TOON")
  const colors = new Uint8Array([105, 165, 222, 255]);
  const gradientMap = new THREE.DataTexture(colors, 4, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

export interface ShopPalette {
  gradientMap: THREE.DataTexture;
  inkLineMaterial: THREE.LineBasicMaterial;
  wallTealDark: THREE.MeshToonMaterial;
  wallSageInner: THREE.MeshToonMaterial;
  counterCream: THREE.MeshToonMaterial;
  woodWarm: THREE.MeshToonMaterial;
  woodDark: THREE.MeshToonMaterial;
  coralAccent: THREE.MeshToonMaterial;
  peachMat: THREE.MeshToonMaterial;
  copperMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  darkInkSolid: THREE.MeshToonMaterial;
  plantGreen: THREE.MeshToonMaterial;
  screenMint: THREE.MeshToonMaterial;
  glassPane: THREE.MeshStandardMaterial;
}

export function createShopPalette(): ShopPalette {
  const gradientMap = createToonGradientMap();

  const inkLineMaterial = new THREE.LineBasicMaterial({
    color: 0x182827,
    transparent: true,
    opacity: 0.92,
  });

  const toon = (hex: number, emissive = 0x000000, emissiveIntensity = 0) =>
    new THREE.MeshToonMaterial({
      color: hex,
      gradientMap,
      emissive,
      emissiveIntensity,
    });

  return {
    gradientMap,
    inkLineMaterial,
    wallTealDark: toon(0x235958),
    wallSageInner: toon(0x8aa8a4),
    counterCream: toon(0xf5efe2),
    woodWarm: toon(0xc78f65),
    woodDark: toon(0x7c5338),
    coralAccent: toon(0xe06d53),
    peachMat: toon(0xe8a58c),
    copperMat: new THREE.MeshStandardMaterial({
      color: 0xd47d54,
      metalness: 0.72,
      roughness: 0.28,
    }),
    steelMat: new THREE.MeshStandardMaterial({
      color: 0xc8d4d2,
      metalness: 0.78,
      roughness: 0.24,
    }),
    darkInkSolid: toon(0x203130),
    plantGreen: toon(0x4b8e64),
    screenMint: toon(0x7bc2a8, 0x3b8c74, 0.35),
    glassPane: new THREE.MeshStandardMaterial({
      color: 0xdff2ef,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false,
    }),
  };
}

export function addInkEdges(
  mesh: THREE.Mesh,
  lineMat: THREE.LineBasicMaterial,
  thresholdAngle = 22,
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
  const lines = new THREE.LineSegments(edges, lineMat);
  mesh.add(lines);
  return lines;
}
