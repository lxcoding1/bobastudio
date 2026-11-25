import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ActorAppearance, CustomerEntity, RenderStyle, SimState } from '../game/types';
import {
  addInkEdges,
  createShopPalette,
  type ShopPalette,
} from './materials';
import {
  createContactShadowTexture,
  createCorkboardTexture,
  createGridFloorTexture,
  createPegboardTexture,
} from './textures';

export interface ProjectedAnchor {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface ShopSceneController {
  setRenderStyle: (style: RenderStyle) => void;
  updateAndRender: (
    state: SimState,
    dt: number,
  ) => {
    anchors: Map<string, ProjectedAnchor>;
  };
  handleClick: (clientX: number, clientY: number) => {
    kind: 'boba_pot' | 'tea_brewer' | 'counter' | 'customer' | 'none';
    customerId?: string;
  };
  resize: (width: number, height: number) => void;
  dispose: () => void;
  readonly isSoftwareGl: boolean;
  readonly renderer: THREE.WebGLRenderer;
}

interface CharacterRig {
  group: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  rightArm: THREE.Mesh;
  cupProp: THREE.Group;
  boxProp: THREE.Mesh;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

// Pre-allocated scratch colors for zero-GC day-to-night interpolation
const _colA = new THREE.Color();
const _colB = new THREE.Color();
const _bulbDayColor = new THREE.Color('#d8cfc0');
const _bulbNightColor = new THREE.Color('#ffcf75');
const _windowWarmEmissive = new THREE.Color('#ffb968');

interface LightingKeyframe {
  min: number;
  bg: string;
  hemiSky: string;
  hemiGround: string;
  hemiInt: number;
  sunColor: string;
  sunInt: number;
  sunPos: [number, number, number];
  beamColor: string;
  beamOpacity: number;
  shadowOpacity: number;
  lampInt: number;
  bulbEmissive: number;
  envInt: number;
  exposure: number;
}

const LIGHTING_KEYFRAMES: readonly LightingKeyframe[] = [
  {
    min: 540, // 9:00 AM Morning
    bg: '#efe8d8',
    hemiSky: '#dcedea',
    hemiGround: '#7b9794',
    hemiInt: 1.15,
    sunColor: '#ffd3b6',
    sunInt: 2.05,
    sunPos: [17, 19, 12],
    beamColor: '#f7b296',
    beamOpacity: 0.36,
    shadowOpacity: 0.22,
    lampInt: 0.25,
    bulbEmissive: 0.12,
    envInt: 1.0,
    exposure: 1.05,
  },
  {
    min: 750, // 12:30 PM Midday
    bg: '#f2ecdc',
    hemiSky: '#e8f4f2',
    hemiGround: '#87a29e',
    hemiInt: 1.24,
    sunColor: '#fff0d6',
    sunInt: 2.25,
    sunPos: [10, 25, 10],
    beamColor: '#f8c9a5',
    beamOpacity: 0.3,
    shadowOpacity: 0.2,
    lampInt: 0.15,
    bulbEmissive: 0.08,
    envInt: 1.05,
    exposure: 1.07,
  },
  {
    min: 960, // 4:00 PM Late Afternoon
    bg: '#eedbc5',
    hemiSky: '#f0dfcf',
    hemiGround: '#7b8a89',
    hemiInt: 1.12,
    sunColor: '#ffbe8f',
    sunInt: 2.1,
    sunPos: [15, 15, 16],
    beamColor: '#f7a479',
    beamOpacity: 0.4,
    shadowOpacity: 0.23,
    lampInt: 0.55,
    bulbEmissive: 0.35,
    envInt: 0.96,
    exposure: 1.05,
  },
  {
    min: 1065, // 5:45 PM Sunset / Golden Hour
    bg: '#dfae8e',
    hemiSky: '#f5c2a4',
    hemiGround: '#635c69',
    hemiInt: 1.0,
    sunColor: '#ff8e61',
    sunInt: 1.85,
    sunPos: [17, 10, 20],
    beamColor: '#f28258',
    beamOpacity: 0.44,
    shadowOpacity: 0.19,
    lampInt: 1.35,
    bulbEmissive: 0.9,
    envInt: 0.86,
    exposure: 1.04,
  },
  {
    min: 1140, // 7:00 PM Dusk
    bg: '#4b5a78',
    hemiSky: '#879ac4',
    hemiGround: '#394657',
    hemiInt: 0.78,
    sunColor: '#a2a7de',
    sunInt: 0.96,
    sunPos: [14, 14, 19],
    beamColor: '#9c7eb8',
    beamOpacity: 0.1,
    shadowOpacity: 0.12,
    lampInt: 2.25,
    bulbEmissive: 1.45,
    envInt: 0.72,
    exposure: 1.0,
  },
  {
    min: 1200, // 8:00 PM Cozy Night
    bg: '#1e2c3d',
    hemiSky: '#637fa8',
    hemiGround: '#293847',
    hemiInt: 0.66,
    sunColor: '#8eb5f0',
    sunInt: 0.74,
    sunPos: [12, 18, 17],
    beamColor: '#637fa8',
    beamOpacity: 0.0,
    shadowOpacity: 0.08,
    lampInt: 2.85,
    bulbEmissive: 1.9,
    envInt: 0.65,
    exposure: 1.02,
  },
];

export function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

const DEFAULT_PLAYER_APPEARANCE: ActorAppearance = {
  skinTone: '#f1c7a8',
  hairColor: '#26292e',
  hairStyle: 'short',
  accessory: 'bandana',
  heightScale: 1.0,
};

function createActorRig(
  palette: ShopPalette,
  shadowTex: THREE.CanvasTexture,
  shirtHex: string,
  apronHex: string | null,
  hatType: CustomerEntity['hatType'],
  appearance?: ActorAppearance,
): CharacterRig {
  const group = new THREE.Group();
  const traits: ActorAppearance = appearance ?? {
    skinTone: '#f1c7a8',
    hairColor: '#26292e',
    hairStyle: 'short',
    accessory: 'none',
    heightScale: 1.0,
  };

  // Ground contact shadow disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.04;
  group.add(shadowDisc);

  const body = new THREE.Group();
  const hScale = traits.heightScale;
  const wScale = 0.96 + (hScale - 0.95) * 0.4;
  body.scale.set(wScale, hScale, wScale);
  group.add(body);

  const pantsMat = new THREE.MeshToonMaterial({
    color: 0x2f3e42,
    gradientMap: palette.gradientMap,
  });
  const shirtMat = new THREE.MeshToonMaterial({
    color: shirtHex,
    gradientMap: palette.gradientMap,
  });
  const skinMat = new THREE.MeshToonMaterial({
    color: traits.skinTone,
    gradientMap: palette.gradientMap,
  });

  const legGeo = new THREE.BoxGeometry(0.18, 0.48, 0.18);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.12, 0.24, 0);
  addInkEdges(leftLeg, palette.inkLineMaterial, 28);
  body.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.12, 0.24, 0);
  addInkEdges(rightLeg, palette.inkLineMaterial, 28);
  body.add(rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.56, 0.32), shirtMat);
  torso.position.y = 0.74;
  torso.castShadow = true;
  addInkEdges(torso, palette.inkLineMaterial, 28);
  body.add(torso);

  if (apronHex) {
    const apronMat = new THREE.MeshToonMaterial({
      color: apronHex,
      gradientMap: palette.gradientMap,
    });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.06), apronMat);
    apron.position.set(0, 0.68, 0.17);
    addInkEdges(apron, palette.inkLineMaterial, 28);
    body.add(apron);

    if (traits.accessory === 'apron_pin') {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10),
        palette.copperMat,
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.set(-0.11, 0.84, 0.21);
      body.add(pin);
    }
  }

  const armGeo = new THREE.BoxGeometry(0.14, 0.44, 0.14);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.34, 0.72, 0);
  addInkEdges(leftArm, palette.inkLineMaterial, 28);
  body.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.34, 0.72, 0.08);
  addInkEdges(rightArm, palette.inkLineMaterial, 28);
  body.add(rightArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.36), skinMat);
  head.position.y = 1.24;
  head.castShadow = true;
  addInkEdges(head, palette.inkLineMaterial, 28);
  body.add(head);

  // Hair styles
  const hairMat = new THREE.MeshToonMaterial({
    color: traits.hairColor,
    gradientMap: palette.gradientMap,
  });
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.14, 0.39), hairMat);
  hair.position.y = 1.4;
  body.add(hair);

  if (traits.hairStyle === 'bob') {
    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.28, 0.14), hairMat);
    backHair.position.set(0, 1.24, -0.15);
    addInkEdges(backHair, palette.inkLineMaterial, 28);
    body.add(backHair);
  } else if (traits.hairStyle === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.14), hairMat);
    tail.position.set(0, 1.24, -0.24);
    tail.rotation.x = 0.25;
    addInkEdges(tail, palette.inkLineMaterial, 28);
    body.add(tail);
  } else if (traits.hairStyle === 'bun') {
    const bun = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.14, 10), hairMat);
    bun.position.set(0, 1.52, -0.06);
    addInkEdges(bun, palette.inkLineMaterial, 28);
    body.add(bun);
  } else if (traits.hairStyle === 'curly') {
    for (const px of [-0.14, 0, 0.14]) {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), hairMat);
      puff.position.set(px, 1.46, -0.02);
      body.add(puff);
    }
  }

  // Facial & neck accessories for distinct employee silhouettes
  if (traits.accessory === 'glasses') {
    const frameMat = palette.darkInkSolid;
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), frameMat);
    lensL.position.set(-0.09, 1.24, 0.19);
    const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), frameMat);
    lensR.position.set(0.09, 1.24, 0.19);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), frameMat);
    bridge.position.set(0, 1.25, 0.19);
    body.add(lensL, lensR, bridge);
  } else if (traits.accessory === 'headphones') {
    const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 10), palette.coralAccent);
    cupL.rotation.z = Math.PI / 2;
    cupL.position.set(-0.22, 1.24, 0);
    const cupR = cupL.clone();
    cupR.position.x = 0.22;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.07), palette.darkInkSolid);
    band.position.set(0, 1.47, 0);
    body.add(cupL, cupR, band);
  } else if (traits.accessory === 'bandana') {
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.36), palette.coralAccent);
    scarf.position.set(0, 1.03, 0.02);
    addInkEdges(scarf, palette.inkLineMaterial, 28);
    body.add(scarf);
  }

  // Hats matching reference characters
  if (hatType === 'sunhat') {
    const hatMat = new THREE.MeshToonMaterial({
      color: 0xe6c79c,
      gradientMap: palette.gradientMap,
    });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.05, 16), hatMat);
    brim.position.y = 1.44;
    addInkEdges(brim, palette.inkLineMaterial, 26);
    body.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.16, 14), hatMat);
    crown.position.y = 1.52;
    addInkEdges(crown, palette.inkLineMaterial, 26);
    body.add(crown);
  } else if (hatType === 'cap') {
    const capMat = new THREE.MeshToonMaterial({
      color: 0x2c6463,
      gradientMap: palette.gradientMap,
    });
    const dome = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.16, 0.4), capMat);
    dome.position.y = 1.45;
    addInkEdges(dome, palette.inkLineMaterial, 26);
    body.add(dome);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.22), capMat);
    visor.position.set(0, 1.39, 0.25);
    body.add(visor);
  } else if (hatType === 'beanie') {
    const beanieMat = new THREE.MeshToonMaterial({
      color: 0xd96b52,
      gradientMap: palette.gradientMap,
    });
    const beanie = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.22, 12), beanieMat);
    beanie.position.y = 1.48;
    addInkEdges(beanie, palette.inkLineMaterial, 26);
    body.add(beanie);
  }

  // Carried boba cup prop
  const cupProp = new THREE.Group();
  const cupMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.08, 0.26, 10),
    palette.counterCream,
  );
  cupMesh.position.y = 0.13;
  addInkEdges(cupMesh, palette.inkLineMaterial, 28);
  cupProp.add(cupMesh);
  const strawMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6),
    palette.coralAccent,
  );
  strawMesh.position.set(0.02, 0.28, 0);
  cupProp.add(strawMesh);
  cupProp.position.set(0.36, 0.62, 0.26);
  cupProp.visible = false;
  body.add(cupProp);

  // Carried supply parcel prop (for variety like reference)
  const boxProp = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.28, 0.3),
    new THREE.MeshToonMaterial({ color: 0xd7b38c, gradientMap: palette.gradientMap }),
  );
  boxProp.position.set(0, 0.72, 0.34);
  addInkEdges(boxProp, palette.inkLineMaterial, 28);
  boxProp.visible = false;
  body.add(boxProp);

  return { group, body, leftLeg, rightLeg, rightArm, cupProp, boxProp };
}

export function createShopScene(container: HTMLElement): ShopSceneController {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(container.clientHeight, 240);
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#efe8d8');
  scene.fog = new THREE.Fog('#efe8d8', 46, 92);

  // Studio environment reflections for copper/steel appliances
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Isometric Orthographic Camera framed above the bottom Drink Bench
  const frustumSize = 20.4;
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    120,
  );
  camera.position.set(22.2, 17.4, 22.2);
  camera.lookAt(0.2, -1.25, 0.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.2, -1.25, 0.2);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minZoom = 0.72;
  controls.maxZoom = 1.65;
  controls.minPolarAngle = 0.52;
  controls.maxPolarAngle = 1.04;
  controls.minAzimuthAngle = 0.42;
  controls.maxAzimuthAngle = 1.15;
  controls.update();

  // Lighting: Warm peach sun from (+X, +Y, +Z) shining toward (-X, -Y, -Z) + cool sage fill
  const hemiLight = new THREE.HemisphereLight('#dcedea', '#7b9794', 1.15);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#ffd3b6', 2.05);
  sunLight.position.set(17, 21, 13);
  sunLight.castShadow = !isSoftwareGl;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -14;
  sunLight.shadow.camera.right = 14;
  sunLight.shadow.camera.top = 14;
  sunLight.shadow.camera.bottom = -14;
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 55;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  const counterWarmLight = new THREE.PointLight('#ffe0ac', 0.4, 14, 1.45);
  counterWarmLight.position.set(1.55, 3.35, -1.1);
  scene.add(counterWarmLight);

  const kitchenWarmLight = new THREE.PointLight('#ffd496', 0.25, 13, 1.45);
  kitchenWarmLight.position.set(-4.8, 3.3, -1.2);
  scene.add(kitchenWarmLight);

  const porchWarmLight = new THREE.PointLight('#ffca7a', 0.25, 16, 1.4);
  porchWarmLight.position.set(8.6, 3.1, 2.2);
  scene.add(porchWarmLight);

  const palette = createShopPalette();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const shadowTex = createContactShadowTexture();

  // Shared emissive bulb material for shop pendants, porch lantern & patio lamps
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffebc2,
    emissive: 0xffb84d,
    emissiveIntensity: 0.2,
    roughness: 0.3,
  });

  // Pixel-art low-res render target pipeline (Mode B: "3D, PIXEL-ART RENDER")
  let renderStyle: RenderStyle = 'toon';
  const pixelScale = 3.5;
  const pixelTarget = new THREE.WebGLRenderTarget(
    Math.max(240, Math.floor(width / pixelScale)),
    Math.max(160, Math.floor(height / pixelScale)),
    {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
    },
  );
  const blitScene = new THREE.Scene();
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blitMat = new THREE.MeshBasicMaterial({
    map: pixelTarget.texture,
    toneMapped: false,
  });
  const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
  blitScene.add(blitQuad);

  // ========================
  // 1. FLOORS & ARCHITECTURAL SHELL
  // ========================
  const extFloorTex = createGridFloorTexture('#efe8d8', '#dad0bb', 8, 9, maxAniso);
  const extFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(76, 76),
    new THREE.MeshToonMaterial({ color: 0xffffff, map: extFloorTex, gradientMap: palette.gradientMap }),
  );
  extFloor.rotation.x = -Math.PI / 2;
  extFloor.receiveShadow = true;
  scene.add(extFloor);

  // Crisp architectural diagonal exterior shadow (matches left-side triangular shadow in reference)
  const extCastShadowMat = new THREE.MeshBasicMaterial({
    color: 0x3b6362,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const shadowShape = new THREE.Shape();
  shadowShape.moveTo(-7.5, -7.5);
  shadowShape.lineTo(-17.8, -1.8);
  shadowShape.lineTo(-17.8, 12.2);
  shadowShape.lineTo(-7.5, 7.5);
  shadowShape.closePath();
  const extCastShadow = new THREE.Mesh(new THREE.ShapeGeometry(shadowShape), extCastShadowMat);
  extCastShadow.rotation.x = -Math.PI / 2;
  extCastShadow.position.y = 0.012;
  scene.add(extCastShadow);

  // Peach sidewalk mat outside entrance doorway (+X = 8.4, Z = 2.8)
  const doormat = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.04, 4.4),
    palette.peachMat,
  );
  doormat.position.set(8.45, 0.02, 2.8);
  addInkEdges(doormat, palette.inkLineMaterial, 25);
  scene.add(doormat);

  // Interior Floors: Customer Warm Cream & Kitchen Cool Sage-Mint
  const custFloorTex = createGridFloorTexture('#f3ecde', '#dfd6c2', 6, 2, maxAniso);
  const custFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(6.1, 15.0),
    new THREE.MeshToonMaterial({ color: 0xffffff, map: custFloorTex, gradientMap: palette.gradientMap }),
  );
  custFloor.rotation.x = -Math.PI / 2;
  custFloor.position.set(4.45, 0.024, 0);
  custFloor.receiveShadow = true;
  scene.add(custFloor);

  const kitchenFloorTex = createGridFloorTexture('#b8cec7', '#9eb8af', 8, 2, maxAniso);
  const kitchenFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(8.9, 15.0),
    new THREE.MeshToonMaterial({ color: 0xffffff, map: kitchenFloorTex, gradientMap: palette.gradientMap }),
  );
  kitchenFloor.rotation.x = -Math.PI / 2;
  kitchenFloor.position.set(-3.05, 0.024, 0);
  kitchenFloor.receiveShadow = true;
  scene.add(kitchenFloor);

  // Signature warm peach sunlight wedge across upper-left wall & floor
  const sunBeamMat = new THREE.MeshBasicMaterial({
    color: 0xf7b296,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const wallBeamShape = new THREE.Shape();
  wallBeamShape.moveTo(-7.3, 4.65);
  wallBeamShape.lineTo(5.6, 4.65);
  wallBeamShape.lineTo(5.6, 1.3);
  wallBeamShape.lineTo(-7.3, 0.35);
  wallBeamShape.closePath();
  const wallBeam = new THREE.Mesh(new THREE.ShapeGeometry(wallBeamShape), sunBeamMat);
  wallBeam.rotation.y = Math.PI / 2;
  wallBeam.position.set(-7.33, 0, 0);
  scene.add(wallBeam);

  const floorBeamShape = new THREE.Shape();
  floorBeamShape.moveTo(-7.3, -7.3);
  floorBeamShape.lineTo(2.4, -7.3);
  floorBeamShape.lineTo(-4.8, 4.2);
  floorBeamShape.lineTo(-7.3, 4.2);
  floorBeamShape.closePath();
  const floorBeam = new THREE.Mesh(new THREE.ShapeGeometry(floorBeamShape), sunBeamMat);
  floorBeam.rotation.x = -Math.PI / 2;
  floorBeam.position.y = 0.036;
  scene.add(floorBeam);

  // Helper to build crisp cutaway walls
  const addWall = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    outerOnly = false,
  ) => {
    const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), palette.wallTealDark);
    outer.position.set(x, y, z);
    outer.castShadow = true;
    outer.receiveShadow = true;
    addInkEdges(outer, palette.inkLineMaterial, 22);
    scene.add(outer);

    if (!outerOnly) {
      const inner = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.06, w - 0.16), h - 0.14, Math.max(0.06, d - 0.16)),
        palette.wallSageInner,
      );
      inner.position.set(
        x + (w < d ? 0.1 : 0),
        y - 0.02,
        z + (d < w ? 0.1 : 0),
      );
      inner.receiveShadow = true;
      scene.add(inner);
    }
  };

  // Back-Left Wall (x = -7.5)
  addWall(0.32, 4.8, 15.32, -7.5, 2.4, 0);
  // Back-Right Wall (z = -7.5)
  addWall(15.32, 4.8, 0.32, 0, 2.4, -7.5);
  // Front-Left low cutaway wall (z = 7.5)
  addWall(15.32, 1.0, 0.32, 0, 0.5, 7.5, true);
  // Front-Right low cutaway wall split around doorway (z in [1.1, 4.5])
  addWall(0.32, 1.0, 8.6, 7.5, 0.5, -3.2, true);
  addWall(0.32, 1.0, 3.0, 7.5, 0.5, 6.0, true);
  // Glass doorway frame posts & open glass door leaves
  const postGeo = new THREE.BoxGeometry(0.28, 3.2, 0.28);
  const post1 = new THREE.Mesh(postGeo, palette.wallTealDark);
  post1.position.set(7.5, 1.6, 1.05);
  addInkEdges(post1, palette.inkLineMaterial, 24);
  scene.add(post1);
  const post2 = new THREE.Mesh(postGeo, palette.wallTealDark);
  post2.position.set(7.5, 1.6, 4.55);
  addInkEdges(post2, palette.inkLineMaterial, 24);
  scene.add(post2);
  const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 1.4), palette.glassPane);
  glassDoor.position.set(7.0, 1.5, 1.7);
  glassDoor.rotation.y = 0.55;
  addInkEdges(glassDoor, palette.inkLineMaterial, 24);
  scene.add(glassDoor);

  // ========================
  // 2. PREP WORKBENCH, BOBA KETTLE & TEA INFUSER (Back-Left Wall)
  // ========================
  const prepGroup = new THREE.Group();
  scene.add(prepGroup);

  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 6.8), palette.woodWarm);
  benchTop.position.set(-5.85, 1.15, -2.1);
  benchTop.castShadow = true;
  benchTop.receiveShadow = true;
  addInkEdges(benchTop, palette.inkLineMaterial, 22);
  prepGroup.add(benchTop);

  const legGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
  for (const lx of [-6.6, -5.1]) {
    for (const lz of [-5.2, -2.1, 1.0]) {
      const leg = new THREE.Mesh(legGeo, palette.darkInkSolid);
      leg.position.set(lx, 0.55, lz);
      prepGroup.add(leg);
    }
  }
  const lowerShelf = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 6.4), palette.woodDark);
  lowerShelf.position.set(-5.85, 0.34, -2.1);
  addInkEdges(lowerShelf, palette.inkLineMaterial, 25);
  prepGroup.add(lowerShelf);

  // Boba Kettle (Composite 5 parts) at (-5.75, 1.22, -2.2)
  const bobaKettleGroup = new THREE.Group();
  bobaKettleGroup.position.set(-5.75, 1.22, -2.2);
  const kettleBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.1), palette.darkInkSolid);
  kettleBase.position.y = 0.07;
  addInkEdges(kettleBase, palette.inkLineMaterial, 25);
  bobaKettleGroup.add(kettleBase);

  const kettlePot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.56, 16), palette.copperMat);
  kettlePot.position.y = 0.42;
  addInkEdges(kettlePot, palette.inkLineMaterial, 28);
  bobaKettleGroup.add(kettlePot);

  const bobaSurfaceMat = new THREE.MeshToonMaterial({
    color: 0x3b221a,
    gradientMap: palette.gradientMap,
  });
  const bobaSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 14), bobaSurfaceMat);
  bobaSurface.position.y = 0.68;
  bobaKettleGroup.add(bobaSurface);

  const kettleLedMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const kettleLed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), kettleLedMat);
  kettleLed.position.set(0.55, 0.08, 0);
  bobaKettleGroup.add(kettleLed);
  prepGroup.add(bobaKettleGroup);

  // Tea Infuser Tower (Composite 6 parts) at (-5.75, 1.22, -0.2)
  const brewerGroup = new THREE.Group();
  brewerGroup.position.set(-5.75, 1.22, -0.2);
  const brewerBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 1.25), palette.steelMat);
  brewerBody.position.y = 0.425;
  addInkEdges(brewerBody, palette.inkLineMaterial, 24);
  brewerGroup.add(brewerBody);

  const brewerCrown = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.14, 1.28), palette.wallTealDark);
  brewerCrown.position.y = 0.89;
  addInkEdges(brewerCrown, palette.inkLineMaterial, 24);
  brewerGroup.add(brewerCrown);

  const dripTray = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 1.1), palette.darkInkSolid);
  dripTray.position.set(0.58, 0.04, 0);
  addInkEdges(dripTray, palette.inkLineMaterial, 25);
  brewerGroup.add(dripTray);

  for (const gz of [-0.28, 0.28]) {
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10), palette.copperMat);
    spout.position.set(0.52, 0.56, gz);
    brewerGroup.add(spout);
  }
  const brewerLedMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  const brewerLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), brewerLedMat);
  brewerLed.position.set(0.49, 0.72, 0);
  brewerGroup.add(brewerLed);
  prepGroup.add(brewerGroup);

  // Retro Recipe Computer Monitor on Workbench (-5.85, 1.22, -4.2)
  const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.78), palette.counterCream);
  pcTower.position.set(-5.9, 1.56, -4.3);
  addInkEdges(pcTower, palette.inkLineMaterial, 24);
  prepGroup.add(pcTower);
  const pcScreen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.58), palette.screenMint);
  pcScreen.position.set(-5.5, 1.58, -4.3);
  prepGroup.add(pcScreen);
  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.62), palette.counterCream);
  keyboard.position.set(-5.22, 1.25, -4.3);
  addInkEdges(keyboard, palette.inkLineMaterial, 24);
  prepGroup.add(keyboard);

  // Coral Stool in front of Workbench
  const stoolGroup = new THREE.Group();
  stoolGroup.position.set(-4.3, 0.03, -4.0);
  const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 14), palette.coralAccent);
  stoolSeat.position.y = 0.82;
  addInkEdges(stoolSeat, palette.inkLineMaterial, 25);
  stoolGroup.add(stoolSeat);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.84, 6), palette.darkInkSolid);
    leg.position.set(Math.cos(angle) * 0.22, 0.41, Math.sin(angle) * 0.22);
    stoolGroup.add(leg);
  }
  prepGroup.add(stoolGroup);

  // Wall Pegboard, Shelves, Tins & Clock on Back-Left Wall
  const pegTex = createPegboardTexture(maxAniso);
  const pegboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.45, 3.6),
    new THREE.MeshToonMaterial({ color: 0xffffff, map: pegTex, gradientMap: palette.gradientMap }),
  );
  pegboard.position.set(-7.26, 2.85, -2.5);
  addInkEdges(pegboard, palette.inkLineMaterial, 25);
  scene.add(pegboard);

  // Wall Clock with animated hands
  const clockFrame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.1, 18),
    palette.darkInkSolid,
  );
  clockFrame.rotation.z = Math.PI / 2;
  clockFrame.position.set(-7.28, 3.85, 0.1);
  scene.add(clockFrame);
  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.11, 18),
    palette.counterCream,
  );
  clockFace.rotation.z = Math.PI / 2;
  clockFace.position.set(-7.26, 3.85, 0.1);
  scene.add(clockFace);
  const clockMinuteHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.26, 0.04),
    palette.darkInkSolid,
  );
  clockMinuteHand.position.set(-7.19, 3.92, 0.1);
  scene.add(clockMinuteHand);

  // Wall Shelves with Tea Tins
  for (const sy of [2.5, 3.45]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 2.8), palette.woodWarm);
    shelf.position.set(-7.05, sy, 2.1);
    addInkEdges(shelf, palette.inkLineMaterial, 24);
    scene.add(shelf);
    const tinColors = [0x639b4f, 0xe06d53, 0x9d7cb8, 0x2c6463];
    for (let j = 0; j < 4; j++) {
      const tinMat = new THREE.MeshToonMaterial({
        color: tinColors[(j + Math.round(sy)) % tinColors.length],
        gradientMap: palette.gradientMap,
      });
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 10), tinMat);
      tin.position.set(-7.05, sy + 0.22, 1.15 + j * 0.62);
      addInkEdges(tin, palette.inkLineMaterial, 26);
      scene.add(tin);
    }
  }

  // ========================
  // 3. BACK-RIGHT WALL: CORKBOARD, AC UNIT, PICKUP WINDOW
  // ========================
  const corkTex = createCorkboardTexture(maxAniso);
  const corkboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.65, 0.1),
    new THREE.MeshToonMaterial({ color: 0xffffff, map: corkTex, gradientMap: palette.gradientMap }),
  );
  corkboard.position.set(-1.6, 2.9, -7.27);
  addInkEdges(corkboard, palette.inkLineMaterial, 25);
  scene.add(corkboard);

  // Wall AC Unit
  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 0.48), palette.counterCream);
  acUnit.position.set(1.2, 3.95, -7.1);
  addInkEdges(acUnit, palette.inkLineMaterial, 24);
  scene.add(acUnit);

  // Serving / Pickup Window Frame
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.6, 0.24), palette.wallTealDark);
  windowFrame.position.set(4.1, 2.55, -7.3);
  addInkEdges(windowFrame, palette.inkLineMaterial, 24);
  scene.add(windowFrame);
  const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.25, 0.26), palette.glassPane);
  windowGlass.position.set(4.1, 2.55, -7.3);
  scene.add(windowGlass);
  const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.15, 12), palette.coralAccent);
  awning.rotation.z = Math.PI / 2;
  awning.position.set(4.1, 3.45, -7.08);
  addInkEdges(awning, palette.inkLineMaterial, 25);
  scene.add(awning);

  // ========================
  // 4. SERVICE COUNTER (Center-Right, separating Kitchen & Queue)
  // ========================
  const counterGroup = new THREE.Group();
  scene.add(counterGroup);

  const counterBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.15, 6.9), palette.wallTealDark);
  counterBody.position.set(1.55, 0.58, -1.1);
  counterBody.castShadow = true;
  counterBody.receiveShadow = true;
  addInkEdges(counterBody, palette.inkLineMaterial, 24);
  counterGroup.add(counterBody);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 7.1), palette.counterCream);
  counterTop.position.set(1.55, 1.21, -1.1);
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  addInkEdges(counterTop, palette.inkLineMaterial, 24);
  counterGroup.add(counterTop);

  // POS Cash Register on Counter
  const register = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.34, 0.72), palette.darkInkSolid);
  register.position.set(1.55, 1.45, -3.55);
  addInkEdges(register, palette.inkLineMaterial, 24);
  counterGroup.add(register);

  // Brass Order Bell
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), palette.copperMat);
  bell.position.set(1.85, 1.29, -1.55);
  counterGroup.add(bell);

  // Pneumatic Cup Sealer Machine on Counter
  const sealerBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.65, 0.62), palette.steelMat);
  sealerBase.position.set(1.55, 1.6, 0.35);
  addInkEdges(sealerBase, palette.inkLineMaterial, 24);
  counterGroup.add(sealerBase);
  const sealerLever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), palette.coralAccent);
  sealerLever.position.set(1.55, 1.98, 0.66);
  addInkEdges(sealerLever, palette.inkLineMaterial, 25);
  counterGroup.add(sealerLever);

  // Potted Plant at Counter End
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.36, 10), palette.peachMat);
  pot.position.set(1.55, 1.46, 1.85);
  addInkEdges(pot, palette.inkLineMaterial, 25);
  counterGroup.add(pot);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.08), palette.plantGreen);
    leaf.position.set(1.55 + Math.cos(a) * 0.14, 1.78, 1.85 + Math.sin(a) * 0.14);
    leaf.rotation.z = Math.cos(a) * 0.35;
    leaf.rotation.x = Math.sin(a) * 0.35;
    addInkEdges(leaf, palette.inkLineMaterial, 28);
    counterGroup.add(leaf);
  }

  // Grounded Desk/Counter Lamps & Wall Sconces (no floating mid-air ceiling cords)
  const addStandingLamp = (lx: number, ly: number, lz: number, parent: THREE.Object3D) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), palette.darkInkSolid);
    base.position.set(lx, ly + 0.03, lz);
    parent.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.62, 8), palette.copperMat);
    stem.position.set(lx, ly + 0.36, lz);
    parent.add(stem);

    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 12, 1, true), palette.wallTealDark);
    shade.position.set(lx, ly + 0.68, lz);
    addInkEdges(shade, palette.inkLineMaterial, 28);
    parent.add(shade);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lampBulbMat);
    bulb.position.set(lx, ly + 0.6, lz);
    parent.add(bulb);
  };
  addStandingLamp(1.55, 1.28, -4.25, counterGroup);
  addStandingLamp(-6.25, 1.22, -3.3, prepGroup);

  const addWallSconce = (wx: number, wy: number, wz: number, dirX: number, dirZ: number) => {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), palette.darkInkSolid);
    mount.position.set(wx, wy, wz);
    scene.add(mount);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(dirX !== 0 ? 0.28 : 0.06, 0.06, dirZ !== 0 ? 0.28 : 0.06), palette.copperMat);
    arm.position.set(wx + dirX * 0.14, wy, wz + dirZ * 0.14);
    scene.add(arm);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampBulbMat);
    globe.position.set(wx + dirX * 0.26, wy - 0.12, wz + dirZ * 0.26);
    addInkEdges(globe, palette.inkLineMaterial, 26);
    scene.add(globe);
  };
  addWallSconce(-7.28, 3.45, -4.75, 1, 0);
  addWallSconce(2.45, 3.2, -7.28, 0, 1);

  // Exterior Entrance Lantern on doorway post
  const lanternBracket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), palette.darkInkSolid);
  lanternBracket.position.set(7.72, 3.0, 1.05);
  scene.add(lanternBracket);
  const lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), lampBulbMat);
  lanternGlass.position.set(7.92, 2.8, 1.05);
  addInkEdges(lanternGlass, palette.inkLineMaterial, 25);
  scene.add(lanternGlass);

  // ========================
  // 4B. EXPANSION GEOMETRY (Level 1: Sunlit Bistro Patio, Level 2: Flagship Night Bar)
  // ========================
  const patioExpansionGroup = new THREE.Group();
  patioExpansionGroup.visible = false;
  scene.add(patioExpansionGroup);

  const patioDeck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 8.8), palette.woodWarm);
  patioDeck.position.set(10.0, 0.07, 1.3);
  patioDeck.receiveShadow = true;
  addInkEdges(patioDeck, palette.inkLineMaterial, 24);
  patioExpansionGroup.add(patioDeck);

  const addPatioBistroSet = (tx: number, tz: number, cupColor: THREE.MeshToonMaterial) => {
    const tablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.72, 10), palette.darkInkSolid);
    tablePost.position.set(tx, 0.48, tz);
    patioExpansionGroup.add(tablePost);
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 16), palette.counterCream);
    tableTop.position.set(tx, 0.86, tz);
    tableTop.castShadow = true;
    addInkEdges(tableTop, palette.inkLineMaterial, 26);
    patioExpansionGroup.add(tableTop);

    // Decorative boba cup on patio table
    const pCup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.22, 10), cupColor);
    pCup.position.set(tx + 0.12, 1.01, tz - 0.08);
    addInkEdges(pCup, palette.inkLineMaterial, 26);
    patioExpansionGroup.add(pCup);

    for (const sz of [-0.82, 0.82]) {
      const sSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12), palette.coralAccent);
      sSeat.position.set(tx, 0.52, tz + sz);
      addInkEdges(sSeat, palette.inkLineMaterial, 26);
      patioExpansionGroup.add(sSeat);
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42, 8), palette.darkInkSolid);
      sLeg.position.set(tx, 0.3, tz + sz);
      patioExpansionGroup.add(sLeg);
    }
  };
  addPatioBistroSet(10.1, -1.2, palette.peachMat);
  addPatioBistroSet(10.1, 4.4, palette.wallSageInner);

  // Patio planter + cozy lantern post
  const planter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 1.6), palette.wallTealDark);
  planter.position.set(11.75, 0.34, 1.2);
  addInkEdges(planter, palette.inkLineMaterial, 24);
  patioExpansionGroup.add(planter);
  for (let p = 0; p < 3; p++) {
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), palette.plantGreen);
    bush.position.set(11.75, 0.72, 0.72 + p * 0.48);
    addInkEdges(bush, palette.inkLineMaterial, 28);
    patioExpansionGroup.add(bush);
  }

  const patioPostA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.75, 8), palette.darkInkSolid);
  patioPostA.position.set(11.8, 1.45, 5.2);
  patioExpansionGroup.add(patioPostA);
  const patioLanternA = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), lampBulbMat);
  patioLanternA.position.set(11.8, 2.86, 5.2);
  addInkEdges(patioLanternA, palette.inkLineMaterial, 25);
  patioExpansionGroup.add(patioLanternA);

  // Level 2: Flagship Night Tea Bar & Marquee Expansion
  const flagshipExpansionGroup = new THREE.Group();
  flagshipExpansionGroup.visible = false;
  scene.add(flagshipExpansionGroup);

  // Glowing Shop Sign Box above Pickup Window
  const marqueeFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.72, 0.28), palette.wallTealDark);
  marqueeFrame.position.set(4.1, 4.2, -7.22);
  addInkEdges(marqueeFrame, palette.inkLineMaterial, 24);
  flagshipExpansionGroup.add(marqueeFrame);
  const marqueeFace = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.48, 0.3), lampBulbMat);
  marqueeFace.position.set(4.1, 4.2, -7.2);
  flagshipExpansionGroup.add(marqueeFace);

  // Secondary Express Tasting Bar & Pastry Dome on Customer Right Wing
  const expressBarBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 0.95), palette.wallTealDark);
  expressBarBody.position.set(4.2, 0.54, -5.6);
  expressBarBody.castShadow = true;
  addInkEdges(expressBarBody, palette.inkLineMaterial, 24);
  flagshipExpansionGroup.add(expressBarBody);
  const expressBarTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.1), palette.counterCream);
  expressBarTop.position.set(4.2, 1.12, -5.6);
  addInkEdges(expressBarTop, palette.inkLineMaterial, 24);
  flagshipExpansionGroup.add(expressBarTop);
  const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.44, 0.58), palette.glassPane);
  pastryCase.position.set(3.55, 1.4, -5.6);
  addInkEdges(pastryCase, palette.inkLineMaterial, 24);
  flagshipExpansionGroup.add(pastryCase);
  const espressoTower = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.54), palette.copperMat);
  espressoTower.position.set(4.8, 1.46, -5.6);
  addInkEdges(espressoTower, palette.inkLineMaterial, 24);
  flagshipExpansionGroup.add(espressoTower);

  // Second Patio Lantern + Festive Warm String-Light Bulbs
  const patioPostB = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.75, 8), palette.darkInkSolid);
  patioPostB.position.set(11.8, 1.45, -2.55);
  flagshipExpansionGroup.add(patioPostB);
  const patioLanternB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), lampBulbMat);
  patioLanternB.position.set(11.8, 2.86, -2.55);
  addInkEdges(patioLanternB, palette.inkLineMaterial, 25);
  flagshipExpansionGroup.add(patioLanternB);
  for (let b = 0; b < 6; b++) {
    const t = (b + 1) / 7;
    const bz = -2.55 + t * (5.2 - -2.55);
    const sag = Math.sin(t * Math.PI) * 0.25;
    const stringBulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampBulbMat);
    stringBulb.position.set(11.8, 2.78 - sag, bz);
    flagshipExpansionGroup.add(stringBulb);
  }

  // ========================
  // 5. FLOOR PROPS: BOBA-BOT ROVER, TROLLEY CART, STACKED BOXES, FAN
  // ========================
  // Boba-Bot Autonomous Rover (Composite 6 parts)
  const bobaBotGroup = new THREE.Group();
  const botShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  botShadow.rotation.x = -Math.PI / 2;
  botShadow.position.y = 0.04;
  bobaBotGroup.add(botShadow);

  const botChassis = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.36, 0.94), palette.wallTealDark);
  botChassis.position.y = 0.26;
  botChassis.castShadow = true;
  addInkEdges(botChassis, palette.inkLineMaterial, 24);
  bobaBotGroup.add(botChassis);

  const botCap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.84), palette.coralAccent);
  botCap.position.y = 0.5;
  addInkEdges(botCap, palette.inkLineMaterial, 24);
  bobaBotGroup.add(botCap);

  const botEyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), palette.screenMint);
  botEyeL.position.set(-0.16, 0.32, 0.48);
  bobaBotGroup.add(botEyeL);
  const botEyeR = botEyeL.clone();
  botEyeR.position.x = 0.16;
  bobaBotGroup.add(botEyeR);

  for (const wx of [-0.42, 0.42]) {
    for (const wz of [-0.3, 0.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), palette.darkInkSolid);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.12, wz);
      bobaBotGroup.add(wheel);
    }
  }
  scene.add(bobaBotGroup);

  // Rolling Supply Cart
  const cartGroup = new THREE.Group();
  cartGroup.position.set(-2.9, 0.03, 4.1);
  const cartShelfTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.72), palette.wallTealDark);
  cartShelfTop.position.y = 0.78;
  addInkEdges(cartShelfTop, palette.inkLineMaterial, 24);
  cartGroup.add(cartShelfTop);
  const cartShelfBot = cartShelfTop.clone();
  cartShelfBot.position.y = 0.26;
  cartGroup.add(cartShelfBot);
  const cartJar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 10), palette.coralAccent);
  cartJar.position.set(-0.2, 0.96, 0);
  addInkEdges(cartJar, palette.inkLineMaterial, 26);
  cartGroup.add(cartJar);
  scene.add(cartGroup);

  // Stacked Supply Crates near front-left cutaway wall (matching reference boxes!)
  const boxMatA = new THREE.MeshToonMaterial({ color: 0xdec4a6, gradientMap: palette.gradientMap });
  const boxMatB = new THREE.MeshToonMaterial({ color: 0xd0b08d, gradientMap: palette.gradientMap });
  const box1 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.82, 1.0), boxMatA);
  box1.position.set(-1.7, 0.44, 5.7);
  box1.castShadow = true;
  addInkEdges(box1, palette.inkLineMaterial, 24);
  scene.add(box1);
  const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.7, 0.85), boxMatB);
  box2.position.set(-0.55, 0.38, 5.85);
  box2.rotation.y = 0.22;
  addInkEdges(box2, palette.inkLineMaterial, 24);
  scene.add(box2);
  const box3 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.56, 0.72), boxMatA);
  box3.position.set(-1.65, 1.13, 5.68);
  box3.rotation.y = -0.18;
  addInkEdges(box3, palette.inkLineMaterial, 24);
  scene.add(box3);

  // Standing Pedestal Fan
  const fanGroup = new THREE.Group();
  fanGroup.position.set(-3.7, 0.03, 1.4);
  const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.08, 12), palette.darkInkSolid);
  fanBase.position.y = 0.04;
  fanGroup.add(fanBase);
  const fanPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.35, 8), palette.darkInkSolid);
  fanPole.position.y = 0.72;
  fanGroup.add(fanPole);
  const fanHead = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 14), palette.wallTealDark);
  fanHead.rotation.z = Math.PI / 2;
  fanHead.position.y = 1.45;
  addInkEdges(fanHead, palette.inkLineMaterial, 25);
  fanGroup.add(fanHead);
  scene.add(fanGroup);

  // ========================
  // 6. POOLED INSTANCED STEAM PUFFS (Zero GC in Loop!)
  // ========================
  const STEAM_COUNT = 20;
  const steamGeo = new THREE.IcosahedronGeometry(0.14, 1);
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const steamMesh = new THREE.InstancedMesh(steamGeo, steamMat, STEAM_COUNT);
  steamMesh.frustumCulled = false;
  scene.add(steamMesh);

  // ========================
  // 7. CHARACTER RIGS (Barista + Staff Pool + Customer Pool)
  // ========================
  const baristaRig = createActorRig(
    palette,
    shadowTex,
    '#2f726f',
    '#f3ecde',
    'cap',
    DEFAULT_PLAYER_APPEARANCE,
  );
  scene.add(baristaRig.group);

  const employeeRigs = new Map<string, CharacterRig>();
  const customerRigs = new Map<string, CharacterRig>();

  // ========================
  // 8. RAYCASTING INTERACTABLE PROXIES
  // ========================
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const proxyGroup = new THREE.Group();
  scene.add(proxyGroup);
  const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });

  const bobaProxy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), invisibleMat);
  bobaProxy.position.set(-5.75, 1.6, -2.2);
  bobaProxy.userData = { kind: 'boba_pot' };
  proxyGroup.add(bobaProxy);

  const brewerProxy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), invisibleMat);
  brewerProxy.position.set(-5.75, 1.6, -0.2);
  brewerProxy.userData = { kind: 'tea_brewer' };
  proxyGroup.add(brewerProxy);

  const counterProxy = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 6.8), invisibleMat);
  counterProxy.position.set(1.55, 1.1, -1.1);
  counterProxy.userData = { kind: 'counter' };
  proxyGroup.add(counterProxy);

  const setRenderStyle = (style: RenderStyle) => {
    renderStyle = style;
  };

  const resize = (newW: number, newH: number) => {
    const w = Math.max(newW, 1);
    const h = Math.max(newH, 1);
    const asp = w / h;
    camera.left = (-frustumSize * asp) / 2;
    camera.right = (frustumSize * asp) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    pixelTarget.setSize(
      Math.max(240, Math.floor(w / pixelScale)),
      Math.max(160, Math.floor(h / pixelScale)),
    );
  };

  const projectPoint = (wx: number, wy: number, wz: number, vpW: number, vpH: number): ProjectedAnchor => {
    _vec3.set(wx, wy, wz);
    _vec3.project(camera);
    const visible = _vec3.z >= -1 && _vec3.z <= 1;
    return {
      id: '',
      x: ((_vec3.x + 1) * 0.5) * vpW,
      y: ((-_vec3.y + 1) * 0.5) * vpH,
      visible,
    };
  };

  let steamTime = 0;

  const updateDayNightLighting = (simMinutes: number, expansionLevel: number) => {
    const kfs = LIGHTING_KEYFRAMES;
    let a = kfs[0];
    let b = kfs[kfs.length - 1];
    let alpha = 0;

    if (simMinutes <= kfs[0].min) {
      a = b = kfs[0];
    } else if (simMinutes >= kfs[kfs.length - 1].min) {
      a = b = kfs[kfs.length - 1];
    } else {
      for (let i = 0; i < kfs.length - 1; i++) {
        if (simMinutes >= kfs[i].min && simMinutes <= kfs[i + 1].min) {
          a = kfs[i];
          b = kfs[i + 1];
          alpha = (simMinutes - a.min) / (b.min - a.min);
          break;
        }
      }
    }

    const lerpNum = (v1: number, v2: number) => v1 + (v2 - v1) * alpha;

    // Sky & Fog
    _colA.set(a.bg);
    _colB.set(b.bg);
    _colA.lerp(_colB, alpha);
    (scene.background as THREE.Color).copy(_colA);
    if (scene.fog) {
      (scene.fog as THREE.Fog).color.copy(_colA);
    }

    // Hemisphere Fill
    _colA.set(a.hemiSky);
    _colB.set(b.hemiSky);
    hemiLight.color.copy(_colA.lerp(_colB, alpha));

    _colA.set(a.hemiGround);
    _colB.set(b.hemiGround);
    hemiLight.groundColor.copy(_colA.lerp(_colB, alpha));
    hemiLight.intensity = lerpNum(a.hemiInt, b.hemiInt);

    // Sun / Moon Key Light
    _colA.set(a.sunColor);
    _colB.set(b.sunColor);
    sunLight.color.copy(_colA.lerp(_colB, alpha));
    sunLight.intensity = lerpNum(a.sunInt, b.sunInt);
    sunLight.position.set(
      lerpNum(a.sunPos[0], b.sunPos[0]),
      lerpNum(a.sunPos[1], b.sunPos[1]),
      lerpNum(a.sunPos[2], b.sunPos[2]),
    );

    // Sunbeam wedge & architectural cast shadow
    _colA.set(a.beamColor);
    _colB.set(b.beamColor);
    sunBeamMat.color.copy(_colA.lerp(_colB, alpha));
    const beamOp = lerpNum(a.beamOpacity, b.beamOpacity);
    sunBeamMat.opacity = beamOp;
    wallBeam.visible = beamOp > 0.015;
    floorBeam.visible = beamOp > 0.015;
    extCastShadowMat.opacity = lerpNum(a.shadowOpacity, b.shadowOpacity);

    // Interior & Patio Warm Lights
    const lampInt = lerpNum(a.lampInt, b.lampInt);
    counterWarmLight.intensity = lampInt;
    kitchenWarmLight.intensity = lampInt * 0.85;
    porchWarmLight.intensity = lampInt * (expansionLevel >= 1 ? 1.18 : 0.88);

    const bulbEm = lerpNum(a.bulbEmissive, b.bulbEmissive);
    lampBulbMat.emissiveIntensity = bulbEm;
    const bulbMix = Math.min(1, bulbEm / 1.4);
    lampBulbMat.color.copy(_bulbDayColor).lerp(_bulbNightColor, bulbMix);

    palette.glassPane.emissive.copy(_windowWarmEmissive);
    palette.glassPane.emissiveIntensity = bulbMix * 0.28;

    scene.environmentIntensity = lerpNum(a.envInt, b.envInt);
    renderer.toneMappingExposure = lerpNum(a.exposure, b.exposure);
  };

  const updateAndRender = (state: SimState, dt: number) => {
    steamTime += dt;
    controls.update();

    // Update Day-to-Night Lighting & Shop Expansion visibility
    updateDayNightLighting(state.simMinutes, state.expansionLevel);
    patioExpansionGroup.visible = state.expansionLevel >= 1;
    flagshipExpansionGroup.visible = state.expansionLevel >= 2;

    // Update clock hand & fan spin
    clockMinuteHand.rotation.x = -(state.simMinutes / 60) * Math.PI * 2;
    fanHead.rotation.y = Math.sin(steamTime * 1.4) * 0.45;

    // Update kettle / brewer status LEDs & sealer lever
    kettleLedMat.color.setHex(
      state.bobaPot.isCooking
        ? 0xf59e0b
        : state.bobaPot.servingsLeft <= 2
          ? 0xef4444
          : 0x34d399,
    );
    brewerLedMat.color.setHex(
      state.teaBrewer.isCooking
        ? 0xf59e0b
        : state.teaBrewer.servingsLeft <= 2
          ? 0xef4444
          : 0x34d399,
    );

    const sealingOrder = state.orders.find((o) => o.status === 'sealing');
    sealerLever.rotation.x = sealingOrder
      ? Math.sin(sealingOrder.sealProgress * Math.PI) * 0.65
      : 0;

    // Sync Barista
    baristaRig.group.position.set(state.barista.x, 0, state.barista.z);
    baristaRig.group.rotation.y = state.barista.facing;
    const bMoving =
      Math.hypot(state.barista.x - state.barista.targetX, state.barista.z - state.barista.targetZ) >
      0.08;
    const bStride = bMoving ? Math.sin(state.barista.walkPhase) * 0.38 : 0;
    baristaRig.leftLeg.rotation.x = bStride;
    baristaRig.rightLeg.rotation.x = -bStride;
    baristaRig.body.position.y = bMoving
      ? Math.abs(Math.sin(state.barista.walkPhase)) * 0.05
      : Math.sin(steamTime * 2.5) * 0.015;
    baristaRig.cupProp.visible = Boolean(state.barista.holdingCupColor);

    // Sync Hired Employees (reuse rigs by ID, remove fired)
    const activeEmpIds = new Set(state.employees.map((e) => e.id));
    for (const [id, rig] of employeeRigs.entries()) {
      if (!activeEmpIds.has(id)) {
        scene.remove(rig.group);
        employeeRigs.delete(id);
      }
    }
    for (const emp of state.employees) {
      let rig = employeeRigs.get(emp.id);
      if (!rig) {
        const apronHex =
          emp.role === 'barista' ? '#235958' : emp.role === 'cashier' ? '#d6a34a' : '#f3ecde';
        rig = createActorRig(
          palette,
          shadowTex,
          emp.shirtColor,
          apronHex,
          emp.hatType,
          emp.appearance,
        );
        scene.add(rig.group);
        employeeRigs.set(emp.id, rig);
      }
      rig.group.visible = emp.onDuty;
      if (!emp.onDuty) continue;

      rig.group.position.set(emp.x, 0, emp.z);
      rig.group.rotation.y = emp.facing;
      const eMoving = Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) > 0.08;
      const eStride = eMoving ? Math.sin(emp.walkPhase) * 0.38 : 0;
      rig.leftLeg.rotation.x = eStride;
      rig.rightLeg.rotation.x = -eStride;
      rig.body.position.y = eMoving
        ? Math.abs(Math.sin(emp.walkPhase)) * 0.05
        : Math.sin(steamTime * 2.4 + emp.z) * 0.015;
      rig.cupProp.visible = Boolean(emp.holdingCupColor);
    }

    // Sync Boba-Bot
    bobaBotGroup.position.set(state.bobaBot.x, 0, state.bobaBot.z);
    bobaBotGroup.rotation.y = state.bobaBot.facing;
    botCap.position.y = 0.5 + Math.sin(steamTime * 4) * 0.012;

    // Sync Customers (reuse rigs by ID, dispose removed)
    const activeIds = new Set(state.customers.map((c) => c.id));
    for (const [id, rig] of customerRigs.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(rig.group);
        customerRigs.delete(id);
      }
    }

    for (const c of state.customers) {
      let rig = customerRigs.get(c.id);
      if (!rig) {
        rig = createActorRig(palette, shadowTex, c.shirtColor, null, c.hatType);
        rig.group.userData = { kind: 'customer', customerId: c.id };
        scene.add(rig.group);
        customerRigs.set(c.id, rig);
      }
      rig.group.position.set(c.x, 0, c.z);
      rig.group.rotation.y = c.facing;
      const walking = Math.hypot(c.x - c.targetX, c.z - c.targetZ) > 0.08;
      const stride = walking ? Math.sin(c.walkPhase) * 0.42 : 0;
      rig.leftLeg.rotation.x = stride;
      rig.rightLeg.rotation.x = -stride;
      rig.body.position.y = walking
        ? Math.abs(Math.sin(c.walkPhase)) * 0.05
        : Math.sin(steamTime * 2.2 + c.moodOffset) * 0.018;
      rig.cupProp.visible = c.carryProp === 'cup';
      rig.boxProp.visible = c.carryProp === 'box';
    }

    // Update Pooled Steam Puffs over Boba Kettle & Tea Infuser
    for (let i = 0; i < STEAM_COUNT; i++) {
      const isKettle = i < 12;
      const phase = ((steamTime * (isKettle && state.bobaPot.isCooking ? 0.9 : 0.42)) + i * 0.19) % 1;
      const originX = -5.75 + Math.sin(i * 2.1 + steamTime) * 0.16;
      const originZ = (isKettle ? -2.2 : -0.2) + Math.cos(i * 1.7 + steamTime) * 0.16;
      const y = (isKettle ? 1.98 : 2.18) + phase * 1.15;
      const s = Math.sin(phase * Math.PI) * (isKettle && state.bobaPot.isCooking ? 1.35 : 0.85);
      _vec3.set(originX, y, originZ);
      _quat.identity();
      _scale.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scale);
      steamMesh.setMatrixAt(i, _mat4);
    }
    steamMesh.instanceMatrix.needsUpdate = true;

    // Render Mode A (3D Toon) or Mode B (3D Pixel-Art Render)
    if (renderStyle === 'pixel') {
      renderer.setRenderTarget(pixelTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(blitScene, blitCamera);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }

    // Project World Anchors for PixiJS Overlay
    const vpW = container.clientWidth || width;
    const vpH = container.clientHeight || height;
    const anchors = new Map<string, ProjectedAnchor>();

    const bobaA = projectPoint(-5.75, 2.55, -2.2, vpW, vpH);
    bobaA.id = 'boba_pot';
    anchors.set('boba_pot', bobaA);

    const brewA = projectPoint(-5.75, 2.75, -0.2, vpW, vpH);
    brewA.id = 'tea_brewer';
    anchors.set('tea_brewer', brewA);

    for (const c of state.customers) {
      const a = projectPoint(c.x, 2.15, c.z, vpW, vpH);
      a.id = c.id;
      anchors.set(c.id, a);
    }

    for (const emp of state.employees) {
      if (!emp.onDuty) continue;
      const a = projectPoint(emp.x, 2.05, emp.z, vpW, vpH);
      a.id = emp.id;
      anchors.set(emp.id, a);
    }

    for (const ev of state.events) {
      const a = projectPoint(ev.worldX, ev.worldY + ev.age * 0.9, ev.worldZ, vpW, vpH);
      a.id = ev.id;
      anchors.set(ev.id, a);
    }

    return { anchors };
  };

  const handleClick = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    // Check customers first (with slight hit forgiveness via recursive children)
    const custRoots = Array.from(customerRigs.values()).map((r) => r.group);
    const custHits = raycaster.intersectObjects(custRoots, true);
    if (custHits.length > 0) {
      let cur: THREE.Object3D | null = custHits[0].object;
      while (cur) {
        if (cur.userData?.kind === 'customer') {
          return { kind: 'customer' as const, customerId: cur.userData.customerId as string };
        }
        cur = cur.parent;
      }
    }

    const stationHits = raycaster.intersectObjects(proxyGroup.children, false);
    if (stationHits.length > 0) {
      const kind = stationHits[0].object.userData.kind as 'boba_pot' | 'tea_brewer' | 'counter';
      return { kind };
    }
    return { kind: 'none' as const };
  };

  const dispose = () => {
    controls.dispose();
    pixelTarget.dispose();
    extFloorTex.dispose();
    custFloorTex.dispose();
    kitchenFloorTex.dispose();
    pegTex.dispose();
    corkTex.dispose();
    shadowTex.dispose();
    palette.gradientMap.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    setRenderStyle,
    updateAndRender,
    handleClick,
    resize,
    dispose,
    isSoftwareGl,
    renderer,
  };
}
