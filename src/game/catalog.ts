import type {
  DrinkRecipe,
  InventoryStock,
  MilkOption,
  PercentLevel,
  ResearchNode,
  RestockPack,
  ShopExpansionDef,
  StaffCandidate,
  StaffRole,
  TeaBase,
  TipJarMode,
  ToppingOption,
  UpgradeDefinition,
} from './types';

export const SHOP_OPEN_MINUTES = 9 * 60; // 09:00
export const SHOP_LAST_ORDER_MINUTES = 20 * 60 + 30; // 20:30
export const SHOP_CLOSE_MINUTES = 21 * 60; // 21:00
export const SIM_MINUTES_PER_SECOND = 4.0; // 4 mins/sec => 3 real mins per 12-hour day (9 AM - 9 PM)
export const DAILY_RENT = 35;
export const MAX_SIM_SPEED = 10;
export const MAX_STAFF_LEVEL = 5;

export interface StaffTrainingTier {
  level: number;
  title: string;
  costToNext: number;
  speedMult: number;
  wageDelta: number;
  perk: string;
}

export const STAFF_TRAINING_TIERS: readonly StaffTrainingTier[] = [
  { level: 1, title: 'Apprentice', costToNext: 35, speedMult: 1.18, wageDelta: 3, perk: 'Base station pacing' },
  { level: 2, title: 'Junior Pro', costToNext: 55, speedMult: 1.18, wageDelta: 4, perk: '+8% craft tips & smoother handoff' },
  { level: 3, title: 'Senior Artisan', costToNext: 80, speedMult: 1.18, wageDelta: 4, perk: '+16% craft tips & rush composure' },
  { level: 4, title: 'Lead Specialist', costToNext: 115, speedMult: 1.2, wageDelta: 5, perk: '+24% craft tips & fast station focus' },
  { level: 5, title: 'Master Barista', costToNext: 0, speedMult: 1.0, wageDelta: 0, perk: '+32% craft tips · Peak Mastery' },
];

export const TIP_JAR_PRESETS: Record<
  TipJarMode,
  { label: string; tipMult: number; patienceMult: number; hint: string }
> = {
  modest: {
    label: 'Modest (10%)',
    tipMult: 0.85,
    patienceMult: 1.08,
    hint: 'Gentle ask — +8% guest patience, slightly smaller tips',
  },
  classic: {
    label: 'Classic (15%)',
    tipMult: 1.0,
    patienceMult: 1.0,
    hint: 'Balanced counter standard — default tips & patience',
  },
  generous: {
    label: 'Artisan (20%)',
    tipMult: 1.25,
    patienceMult: 0.94,
    hint: '+25% higher tips, guests expect slightly snappier service',
  },
};

export type TimeOfDayLabel = 'Morning' | 'Afternoon' | 'Sunset' | 'Dusk' | 'Night';

export function getTimeOfDayPhase(simMinutes: number): {
  label: TimeOfDayLabel;
  progress: number;
} {
  const clamped = Math.max(SHOP_OPEN_MINUTES, Math.min(SHOP_CLOSE_MINUTES, simMinutes));
  const progress = (clamped - SHOP_OPEN_MINUTES) / (SHOP_CLOSE_MINUTES - SHOP_OPEN_MINUTES);
  let label: TimeOfDayLabel = 'Morning';
  if (simMinutes >= 19 * 60 + 45) {
    label = 'Night';
  } else if (simMinutes >= 18 * 60 + 15) {
    label = 'Dusk';
  } else if (simMinutes >= 16 * 60 + 15) {
    label = 'Sunset';
  } else if (simMinutes >= 12 * 60) {
    label = 'Afternoon';
  }
  return { label, progress };
}

export const TEA_BASE_META: Record<
  TeaBase,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock; unlockResearchId?: string }
> = {
  assam: {
    label: 'Assam Black',
    short: 'Assam',
    color: '#9c522b',
    stockKey: 'assamTea',
  },
  jasmine: {
    label: 'Jasmine Green',
    short: 'Jasmine',
    color: '#c9b44f',
    stockKey: 'jasmineTea',
  },
  oolong: {
    label: 'Roasted Oolong',
    short: 'Oolong',
    color: '#b87635',
    stockKey: 'oolongTea',
  },
  matcha: {
    label: 'Uji Matcha',
    short: 'Matcha',
    color: '#639b4f',
    stockKey: 'matchaPowder',
  },
  taro: {
    label: 'Velvet Taro',
    short: 'Taro',
    color: '#9d7cb8',
    stockKey: 'taroPaste',
  },
  passionfruit: {
    label: 'Passionfruit Nectar',
    short: 'Passion',
    color: '#f2a538',
    stockKey: 'passionfruitSyrup',
    unlockResearchId: 'res_fruit_tea',
  },
  strawberry: {
    label: 'Strawberry Purée',
    short: 'Berry',
    color: '#e35d75',
    stockKey: 'strawberryPuree',
    unlockResearchId: 'res_berry_cream',
  },
  thai_tea: {
    label: 'Spiced Thai Tea',
    short: 'Thai',
    color: '#d96528',
    stockKey: 'thaiTeaLeaf',
    unlockResearchId: 'res_thai_spice',
  },
  black_sesame: {
    label: 'Black Sesame',
    short: 'Sesame',
    color: '#4a484c',
    stockKey: 'blackSesame',
    unlockResearchId: 'res_sesame_craft',
  },
};

export const MILK_META: Record<
  MilkOption,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock | null; unlockResearchId?: string }
> = {
  none: {
    label: 'Clear Brew',
    short: 'No Milk',
    color: 'transparent',
    stockKey: null,
  },
  whole: {
    label: 'Fresh Milk',
    short: 'Milk',
    color: '#f7eedc',
    stockKey: 'freshMilk',
  },
  oat: {
    label: 'Oat Creamer',
    short: 'Oat',
    color: '#e6d6b8',
    stockKey: 'oatMilk',
  },
  brown_sugar: {
    label: 'Brown Sugar',
    short: 'Br. Sugar',
    color: '#5a2d18',
    stockKey: 'brownSugar',
  },
  cheese_foam: {
    label: 'Cheese Foam',
    short: 'Foam',
    color: '#fff5d6',
    stockKey: 'cheeseFoam',
  },
  coconut_cream: {
    label: 'Coconut Cream',
    short: 'Coconut',
    color: '#f7f3ea',
    stockKey: 'coconutCream',
    unlockResearchId: 'res_thai_spice',
  },
  salted_caramel: {
    label: 'Salted Caramel',
    short: 'Caramel',
    color: '#c67e3b',
    stockKey: 'saltedCaramel',
    unlockResearchId: 'res_sesame_craft',
  },
};

export const TOPPING_META: Record<
  ToppingOption,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock | null; unlockResearchId?: string }
> = {
  none: {
    label: 'No Topping',
    short: 'Plain',
    color: 'transparent',
    stockKey: null,
  },
  boba: {
    label: 'Tapioca Boba',
    short: 'Boba',
    color: '#251a18',
    stockKey: 'rawBoba',
  },
  crystal_boba: {
    label: 'Crystal Agar',
    short: 'Crystal',
    color: '#e9f2f0',
    stockKey: 'crystalBoba',
  },
  lychee_jelly: {
    label: 'Lychee Jelly',
    short: 'Lychee',
    color: '#f5ccd2',
    stockKey: 'lycheeJelly',
  },
  pudding: {
    label: 'Egg Pudding',
    short: 'Pudding',
    color: '#f2c15a',
    stockKey: 'eggPudding',
  },
  popping_boba: {
    label: 'Mango Popping',
    short: 'Popping',
    color: '#ffae33',
    stockKey: 'poppingBoba',
    unlockResearchId: 'res_fruit_tea',
  },
  aloe_vera: {
    label: 'Aloe Vera',
    short: 'Aloe',
    color: '#cfe8d5',
    stockKey: 'aloeVera',
    unlockResearchId: 'res_berry_cream',
  },
};

export const RESEARCH_PROJECTS: ResearchNode[] = [
  {
    id: 'res_fruit_tea',
    name: 'Tropical Fruit Lab',
    category: 'ingredient',
    cost: 55,
    minDay: 1,
    summary: 'Distills tangy Passionfruit Nectar and bursting Mango Popping Boba.',
    unlocksLabel: 'Passionfruit + Mango Popping · 2 Fruit Recipes ($7.90–$8.25)',
    starterGrants: { passionfruitSyrup: 8, poppingBoba: 8 },
  },
  {
    id: 'res_berry_cream',
    name: 'Berry & Botanical Studio',
    category: 'ingredient',
    cost: 65,
    minDay: 1,
    summary: 'Cold-presses Strawberry Purée paired with crisp Chilled Aloe Vera cubes.',
    unlocksLabel: 'Strawberry Purée + Aloe Vera · Strawberry Velvet Breeze ($8.60)',
    starterGrants: { strawberryPuree: 8, aloeVera: 8 },
  },
  {
    id: 'res_thai_spice',
    name: 'Bangkok Spice & Coconut',
    category: 'ingredient',
    cost: 75,
    minDay: 1,
    summary: 'Blends star-anise Spiced Thai Tea leaves with velvety Coconut Cream.',
    unlocksLabel: 'Spiced Thai Tea + Coconut Cream · 2 Creamy Recipes ($8.40–$8.50)',
    starterGrants: { thaiTeaLeaf: 8, coconutCream: 8 },
  },
  {
    id: 'res_sesame_craft',
    name: 'Artisan Roast & Caramel',
    category: 'ingredient',
    cost: 90,
    minDay: 1,
    summary: 'Stone-grinds Roasted Black Sesame and whips sea-salt Caramel drizzle.',
    unlocksLabel: 'Black Sesame + Salted Caramel · Roasted Black Sesame Cloud ($8.95)',
    starterGrants: { blackSesame: 8, saltedCaramel: 8 },
  },
  {
    id: 'res_wholesale_sync',
    name: 'Wholesale Pantry Contract',
    category: 'logistics',
    cost: 70,
    minDay: 1,
    summary: 'Connects staff Auto-Refill directly to wholesale distributors.',
    unlocksLabel: '-25% Staff Auto-Refill Cost · +40% Batch Refill Size',
    starterGrants: { cups: 12, rawBoba: 2 },
  },
];

export const PERCENT_OPTIONS: PercentLevel[] = [0, 25, 50, 75, 100];

export const DRINK_MENU: DrinkRecipe[] = [
  {
    id: 'classic_pearl',
    name: 'Classic Pearl Milk Tea',
    teaBase: 'assam',
    milk: 'whole',
    topping: 'boba',
    basePrice: 6.25,
    ingredientCost: 1.45,
    unlockDay: 1,
    description: 'Malted Assam steeped strong, silky milk, warm tapioca pearls.',
    liquidColor: '#b97745',
    milkColor: '#e2be8f',
    foamColor: null,
  },
  {
    id: 'brown_sugar_boba',
    name: 'Brown Sugar Boba Latte',
    teaBase: 'assam',
    milk: 'brown_sugar',
    topping: 'boba',
    basePrice: 7.0,
    ingredientCost: 1.65,
    unlockDay: 1,
    description: 'Caramelized brown sugar glaze tiger-striped with fresh milk & boba.',
    liquidColor: '#c9884f',
    milkColor: '#f6ebd7',
    foamColor: '#663419',
  },
  {
    id: 'jasmine_lychee',
    name: 'Jasmine Lychee Spark',
    teaBase: 'jasmine',
    milk: 'none',
    topping: 'lychee_jelly',
    basePrice: 5.75,
    ingredientCost: 1.25,
    unlockDay: 1,
    description: 'Crisp floral jasmine green tea topped with chilled lychee cubes.',
    liquidColor: '#d9c55b',
    milkColor: '#d9c55b',
    foamColor: null,
  },
  {
    id: 'matcha_cheese',
    name: 'Uji Matcha Cloud',
    teaBase: 'matcha',
    milk: 'cheese_foam',
    topping: 'crystal_boba',
    basePrice: 7.5,
    ingredientCost: 1.9,
    unlockDay: 1,
    description: 'Whisked Uji matcha crowned with salted cream cheese foam.',
    liquidColor: '#68a354',
    milkColor: '#82b86d',
    foamColor: '#fff6da',
  },
  {
    id: 'oolong_oat_pudding',
    name: 'Roasted Oolong Oat',
    teaBase: 'oolong',
    milk: 'oat',
    topping: 'pudding',
    basePrice: 6.75,
    ingredientCost: 1.55,
    unlockDay: 1,
    description: 'Charcoal-roasted oolong blended with oat milk and custard pudding.',
    liquidColor: '#bd7d3e',
    milkColor: '#dfc092',
    foamColor: null,
  },
  {
    id: 'taro_velvet_boba',
    name: 'Velvet Taro Boba',
    teaBase: 'taro',
    milk: 'whole',
    topping: 'boba',
    basePrice: 7.25,
    ingredientCost: 1.75,
    unlockDay: 2,
    description: 'Creamy roasted taro root paired with warm chewy tapioca pearls.',
    liquidColor: '#a884c7',
    milkColor: '#cbb2df',
    foamColor: null,
  },
  {
    id: 'matcha_oat_boba',
    name: 'Kyoto Matcha Boba',
    teaBase: 'matcha',
    milk: 'oat',
    topping: 'boba',
    basePrice: 7.4,
    ingredientCost: 1.85,
    unlockDay: 2,
    description: 'Earthy ceremonial matcha smoothed with creamy oat milk and boba.',
    liquidColor: '#6fa75b',
    milkColor: '#a2c789',
    foamColor: null,
  },
  {
    id: 'oolong_cheese_crystal',
    name: 'High Mountain Cheese Tea',
    teaBase: 'oolong',
    milk: 'cheese_foam',
    topping: 'crystal_boba',
    basePrice: 7.6,
    ingredientCost: 1.85,
    unlockDay: 3,
    description: 'Fragrant high-mountain oolong layered beneath whipped cheese foam.',
    liquidColor: '#c78b47',
    milkColor: '#d79e5e',
    foamColor: '#fff5d9',
  },
  {
    id: 'tropical_passion_pop',
    name: 'Tropical Passion Pop',
    teaBase: 'passionfruit',
    milk: 'none',
    topping: 'popping_boba',
    basePrice: 8.25,
    ingredientCost: 1.9,
    unlockDay: 1,
    unlockResearchId: 'res_fruit_tea',
    description: 'Bright passionfruit nectar over bursting mango juice pearls.',
    liquidColor: '#f2a538',
    milkColor: '#f2a538',
    foamColor: null,
  },
  {
    id: 'golden_mango_sparkler',
    name: 'Golden Mango Sparkler',
    teaBase: 'jasmine',
    milk: 'none',
    topping: 'popping_boba',
    basePrice: 7.9,
    ingredientCost: 1.7,
    unlockDay: 1,
    unlockResearchId: 'res_fruit_tea',
    description: 'Jasmine green tea lifted with sunny popping boba spheres.',
    liquidColor: '#e2bd4c',
    milkColor: '#e2bd4c',
    foamColor: null,
  },
  {
    id: 'strawberry_velvet_breeze',
    name: 'Strawberry Velvet Breeze',
    teaBase: 'strawberry',
    milk: 'cheese_foam',
    topping: 'aloe_vera',
    basePrice: 8.6,
    ingredientCost: 2.05,
    unlockDay: 1,
    unlockResearchId: 'res_berry_cream',
    description: 'Crushed strawberry purée, chilled aloe cubes & velvety foam cap.',
    liquidColor: '#e35d75',
    milkColor: '#ed8496',
    foamColor: '#fff5d9',
  },
  {
    id: 'bangkok_thai_boba',
    name: 'Bangkok Sunset Thai Boba',
    teaBase: 'thai_tea',
    milk: 'coconut_cream',
    topping: 'boba',
    basePrice: 8.4,
    ingredientCost: 1.95,
    unlockDay: 1,
    unlockResearchId: 'res_thai_spice',
    description: 'Spiced orange Thai tea swirled with coconut cream & warm boba.',
    liquidColor: '#d96528',
    milkColor: '#f5e7d5',
    foamColor: null,
  },
  {
    id: 'coconut_matcha_cream',
    name: 'Coconut Matcha Cream',
    teaBase: 'matcha',
    milk: 'coconut_cream',
    topping: 'crystal_boba',
    basePrice: 8.5,
    ingredientCost: 2.0,
    unlockDay: 1,
    unlockResearchId: 'res_thai_spice',
    description: 'Uji matcha poured slowly into chilled coconut cream & crystal pearls.',
    liquidColor: '#639b4f',
    milkColor: '#edf2df',
    foamColor: null,
  },
  {
    id: 'black_sesame_cloud',
    name: 'Roasted Black Sesame Cloud',
    teaBase: 'black_sesame',
    milk: 'salted_caramel',
    topping: 'pudding',
    basePrice: 8.95,
    ingredientCost: 2.15,
    unlockDay: 1,
    unlockResearchId: 'res_sesame_craft',
    description: 'Nutty stone-ground sesame ribbons with salted caramel & egg pudding.',
    liquidColor: '#565359',
    milkColor: '#9e8c82',
    foamColor: '#d99e62',
  },
];

export const RESTOCK_PACKS: RestockPack[] = [
  {
    id: 'pack_tea_leaf',
    name: 'Classic Tea Bundle',
    category: 'tea',
    cost: 16,
    summary: '+6 Assam, +6 Jasmine, +6 Oolong',
    grants: { assamTea: 6, jasmineTea: 6, oolongTea: 6 },
  },
  {
    id: 'pack_specialty_tea',
    name: 'Matcha & Taro Tins',
    category: 'tea',
    cost: 20,
    summary: '+6 Uji Matcha, +6 Velvet Taro',
    grants: { matchaPowder: 6, taroPaste: 6 },
  },
  {
    id: 'pack_dairy',
    name: 'Dairy & Foam Crate',
    category: 'dairy',
    cost: 18,
    summary: '+8 Fresh Milk, +6 Oat, +6 Br. Sugar, +6 Foam',
    grants: { freshMilk: 8, oatMilk: 6, brownSugar: 6, cheeseFoam: 6 },
  },
  {
    id: 'pack_boba',
    name: 'Tapioca & Toppings',
    category: 'topping',
    cost: 17,
    summary: '+3 Raw Boba Batches, +6 Crystal, +6 Lychee, +6 Pudding',
    grants: { rawBoba: 3, crystalBoba: 6, lycheeJelly: 6, eggPudding: 6 },
  },
  {
    id: 'pack_cups',
    name: 'Sealed Cups Sleeve',
    category: 'supplies',
    cost: 12,
    summary: '+24 Recyclable Boba Cups & Straws',
    grants: { cups: 24 },
  },
  {
    id: 'pack_exotic_fruit',
    name: 'Fruit & Aloe Crate',
    category: 'topping',
    cost: 20,
    summary: '+6 Passionfruit, +6 Strawberry, +6 Popping, +6 Aloe',
    unlockResearchId: 'res_fruit_tea',
    grants: { passionfruitSyrup: 6, strawberryPuree: 6, poppingBoba: 6, aloeVera: 6 },
  },
  {
    id: 'pack_artisan_blend',
    name: 'Spice, Roast & Coconut Crate',
    category: 'dairy',
    cost: 22,
    summary: '+6 Thai Tea, +6 Blk Sesame, +6 Coconut Cream, +6 Caramel',
    unlockResearchId: 'res_thai_spice',
    grants: { thaiTeaLeaf: 6, blackSesame: 6, coconutCream: 6, saltedCaramel: 6 },
  },
];

export const SHOP_UPGRADES: UpgradeDefinition[] = [
  {
    key: 'dualKettle',
    name: 'Dual Copper Boba Kettle',
    cost: 75,
    effect: 'Holds 20 pearl servings and cooks fresh boba 35% faster.',
  },
  {
    key: 'espressoInfuser',
    name: 'Pressurized Tea Infuser',
    cost: 65,
    effect: 'Brews 18 tea servings per batch and cuts steep time to 4s.',
  },
  {
    key: 'autoSealer',
    name: 'Pneumatic Cup Sealer',
    cost: 60,
    effect: 'Shakes & seals drinks in 0.45s instead of 1.1s.',
  },
  {
    key: 'bobaBot',
    name: 'Boba-Bot Delivery Rover',
    cost: 95,
    effect: 'Slows pearl staleness by 50% and speeds counter handoff.',
  },
  {
    key: 'loyaltySign',
    name: 'Sidewalk Menu Board',
    cost: 55,
    effect: 'Boosts customer patience +20% and attracts higher-tipping guests.',
  },
];

export const CUSTOMER_NAMES = [
  'Mina',
  'Kenji',
  'Chloe',
  'Tariq',
  'Sora',
  'Lucas',
  'Nadia',
  'Hana',
  'Devon',
  'Mei',
  'Julian',
  'Priya',
];

export const SHIRT_PALETTE = [
  '#d96b52',
  '#4e878c',
  '#d6a34a',
  '#6a7db8',
  '#8c6282',
  '#6c9c6b',
];

export const STAFF_ROLE_META: Record<
  StaffRole,
  { label: string; summary: string; badgeColor: string }
> = {
  barista: {
    label: 'Barista',
    summary: 'Auto-crafts & seals pending tickets using your pantry stock.',
    badgeColor: '#e06d53',
  },
  prep_chef: {
    label: 'Prep Cook',
    summary: 'Monitors the Boba Kettle & Tea Infuser and starts fresh batches.',
    badgeColor: '#2c8c72',
  },
  cashier: {
    label: 'Host & Cashier',
    summary: 'Calms guest patience decay and boosts tips across the counter.',
    badgeColor: '#d6a34a',
  },
};

export const STAFF_ROSTER: StaffCandidate[] = [
  {
    id: 'staff_lin',
    name: 'Lin',
    role: 'barista',
    hireCost: 48,
    dailyWage: 20,
    baseSpeed: 1.0,
    shirtColor: '#e06d53',
    hatType: 'none',
    appearance: {
      skinTone: '#f4cdb0',
      hairColor: '#4c2c1d',
      hairStyle: 'ponytail',
      accessory: 'glasses',
      heightScale: 0.97,
    },
    bio: 'Steady starter barista who crafts accurate milk teas on demand.',
  },
  {
    id: 'staff_mateo',
    name: 'Mateo',
    role: 'prep_chef',
    hireCost: 42,
    dailyWage: 18,
    baseSpeed: 1.05,
    shirtColor: '#4e878c',
    hatType: 'beanie',
    appearance: {
      skinTone: '#dfa882',
      hairColor: '#232022',
      hairStyle: 'curly',
      accessory: 'bandana',
      heightScale: 1.04,
    },
    bio: 'Keeps tapioca boiling and tea steeping before pots run dry.',
  },
  {
    id: 'staff_yuna',
    name: 'Yuna',
    role: 'cashier',
    hireCost: 40,
    dailyWage: 16,
    baseSpeed: 1.0,
    shirtColor: '#d6a34a',
    hatType: 'sunhat',
    appearance: {
      skinTone: '#f2d3ba',
      hairColor: '#7a4b2a',
      hairStyle: 'bob',
      accessory: 'apron_pin',
      heightScale: 0.95,
    },
    bio: 'Warm front-of-house host who keeps lines calm & tips generous.',
  },
  {
    id: 'staff_kai',
    name: 'Kai',
    role: 'barista',
    hireCost: 62,
    dailyWage: 26,
    baseSpeed: 1.25,
    shirtColor: '#6a7db8',
    hatType: 'none',
    appearance: {
      skinTone: '#c98e64',
      hairColor: '#1f2636',
      hairStyle: 'bun',
      accessory: 'headphones',
      heightScale: 1.07,
    },
    bio: 'Fast evening rush specialist with crisp shaking rhythm.',
  },
  {
    id: 'staff_nori',
    name: 'Nori',
    role: 'prep_chef',
    hireCost: 50,
    dailyWage: 21,
    baseSpeed: 1.12,
    shirtColor: '#6c9c6b',
    hatType: 'cap',
    appearance: {
      skinTone: '#e8bc96',
      hairColor: '#9c5433',
      hairStyle: 'short',
      accessory: 'glasses',
      heightScale: 1.01,
    },
    bio: 'Precision batch cook who monitors pearl freshness & double steeps.',
  },
];

export const SHOP_EXPANSIONS: ShopExpansionDef[] = [
  {
    level: 0,
    name: 'Neighborhood Kiosk',
    cost: 0,
    maxQueue: 5,
    maxStaffSlots: 2,
    spawnBoost: 1.0,
    tipBonus: 1.0,
    description: 'Cozy corner tea bar with 5 guest slots and room for 2 staff.',
  },
  {
    level: 1,
    name: 'Sunlit Bistro Patio',
    cost: 115,
    maxQueue: 7,
    maxStaffSlots: 3,
    spawnBoost: 1.18,
    tipBonus: 1.08,
    description: 'Adds an outdoor wooden deck with cafe tables, warm lanterns, 7 queue slots & 3 staff.',
  },
  {
    level: 2,
    name: 'Flagship Night Tea Bar',
    cost: 210,
    maxQueue: 9,
    maxStaffSlots: 4,
    spawnBoost: 1.35,
    tipBonus: 1.2,
    description: 'Unlocks a second service bar, glowing marquee sign, 9 queue slots & 4 staff.',
  },
];

