import type {
  DrinkRecipe,
  InventoryStock,
  MilkOption,
  PercentLevel,
  RestockPack,
  TeaBase,
  ToppingOption,
  UpgradeDefinition,
} from './types';

export const SHOP_OPEN_MINUTES = 9 * 60; // 09:00
export const SHOP_LAST_ORDER_MINUTES = 17 * 60 + 30; // 17:30
export const SHOP_CLOSE_MINUTES = 18 * 60; // 18:00
export const SIM_MINUTES_PER_SECOND = 3.0; // 3 mins/sec => 3 real mins per 9-hour day
export const DAILY_RENT = 35;

export const TEA_BASE_META: Record<
  TeaBase,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock }
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
};

export const MILK_META: Record<
  MilkOption,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock | null }
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
};

export const TOPPING_META: Record<
  ToppingOption,
  { label: string; short: string; color: string; stockKey: keyof InventoryStock | null }
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
};

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
