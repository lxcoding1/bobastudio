export type TeaBase = 'assam' | 'jasmine' | 'oolong' | 'matcha' | 'taro';
export type MilkOption = 'none' | 'whole' | 'oat' | 'brown_sugar' | 'cheese_foam';
export type ToppingOption = 'none' | 'boba' | 'crystal_boba' | 'lychee_jelly' | 'pudding';
export type PercentLevel = 0 | 25 | 50 | 75 | 100;

export type RenderStyle = 'toon' | 'pixel';
export type GamePhase = 'title' | 'playing' | 'day_end' | 'paused' | 'gameover';

export interface DrinkRecipe {
  id: string;
  name: string;
  teaBase: TeaBase;
  milk: MilkOption;
  topping: ToppingOption;
  basePrice: number;
  ingredientCost: number;
  unlockDay: number;
  description: string;
  liquidColor: string;
  milkColor: string;
  foamColor: string | null;
}

export interface DrinkBuild {
  teaBase: TeaBase | null;
  milk: MilkOption;
  topping: ToppingOption;
  ice: PercentLevel;
  sweetness: PercentLevel;
}

export type CustomerArchetype = 'student' | 'office' | 'foodie' | 'critic';

export type CustomerWalkState =
  | 'entering'
  | 'queuing'
  | 'ordering'
  | 'waiting_drink'
  | 'leaving_happy'
  | 'leaving_angry';

export interface CustomerEntity {
  id: string;
  name: string;
  archetype: CustomerArchetype;
  state: CustomerWalkState;
  queueSlot: number;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  facing: number;
  shirtColor: string;
  hatType: 'none' | 'sunhat' | 'cap' | 'beanie';
  carryProp: 'none' | 'box' | 'cup';
  walkPhase: number;
  orderId: string | null;
  moodOffset: number;
}

export interface OrderTicket {
  id: string;
  ticketNumber: number;
  customerId: string;
  customerName: string;
  archetype: CustomerArchetype;
  recipe: DrinkRecipe;
  ice: PercentLevel;
  sweetness: PercentLevel;
  price: number;
  patienceMax: number;
  patienceLeft: number;
  createdAtSim: number;
  status: 'waiting' | 'sealing';
  sealProgress: number;
}

export interface InventoryStock {
  assamTea: number;
  jasmineTea: number;
  oolongTea: number;
  matchaPowder: number;
  taroPaste: number;
  freshMilk: number;
  oatMilk: number;
  brownSugar: number;
  cheeseFoam: number;
  rawBoba: number;
  crystalBoba: number;
  lycheeJelly: number;
  eggPudding: number;
  cups: number;
}

export interface BatchPot {
  id: 'boba_pot' | 'tea_brewer';
  label: string;
  servingsLeft: number;
  maxServings: number;
  freshness: number; // 0..100
  isCooking: boolean;
  cookProgress: number; // 0..1
  cookDuration: number; // seconds
}

export interface ShopUpgrades {
  dualKettle: boolean;
  autoSealer: boolean;
  bobaBot: boolean;
  espressoInfuser: boolean;
  loyaltySign: boolean;
}

export interface DaySummary {
  day: number;
  drinksServed: number;
  perfectDrinks: number;
  walkouts: number;
  revenue: number;
  tipsEarned: number;
  restockSpent: number;
  upgradeSpent: number;
  rentCost: number;
  netProfit: number;
  reputationDelta: number;
}

export interface FloatingEvent {
  id: string;
  kind: 'serve' | 'fail' | 'batch' | 'walkout';
  text: string;
  subtext?: string;
  color: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  age: number;
}

export interface SimState {
  phase: GamePhase;
  outcome: 'none' | 'victory' | 'bankrupt' | 'reputation_lost';
  endlessMode: boolean;
  day: number;
  simMinutes: number; // 540 = 09:00, 1080 = 18:00
  simElapsed: number;
  speedMultiplier: 1 | 2;
  cash: number;
  reputation: number; // 0.0 .. 5.0
  totalServed: number;
  streak: number;
  bestStreak: number;
  nextTicketNumber: number;
  nextCustomerSeq: number;
  spawnCooldown: number;
  inventory: InventoryStock;
  bobaPot: BatchPot;
  teaBrewer: BatchPot;
  upgrades: ShopUpgrades;
  customers: CustomerEntity[];
  orders: OrderTicket[];
  selectedOrderId: string | null;
  currentBuild: DrinkBuild;
  barista: {
    x: number;
    z: number;
    targetX: number;
    targetZ: number;
    facing: number;
    task: 'idle' | 'brewing' | 'sealing' | 'serving';
    walkPhase: number;
    holdingCupColor: string | null;
  };
  bobaBot: {
    x: number;
    z: number;
    facing: number;
    waypointIndex: number;
    carryingCup: boolean;
  };
  dayStats: {
    drinksServed: number;
    perfectDrinks: number;
    walkouts: number;
    revenue: number;
    tipsEarned: number;
    restockSpent: number;
    upgradeSpent: number;
    reputationStart: number;
  };
  lastDaySummary: DaySummary | null;
  events: FloatingEvent[];
  bannerMessage: string | null;
}

export interface RestockPack {
  id: string;
  name: string;
  category: 'tea' | 'dairy' | 'topping' | 'supplies';
  cost: number;
  summary: string;
  grants: Partial<InventoryStock>;
}

export interface UpgradeDefinition {
  key: keyof ShopUpgrades;
  name: string;
  cost: number;
  effect: string;
}
