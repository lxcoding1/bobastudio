export type TeaBase =
  | 'assam'
  | 'jasmine'
  | 'oolong'
  | 'matcha'
  | 'taro'
  | 'passionfruit'
  | 'strawberry'
  | 'thai_tea'
  | 'black_sesame';
export type MilkOption =
  | 'none'
  | 'whole'
  | 'oat'
  | 'brown_sugar'
  | 'cheese_foam'
  | 'coconut_cream'
  | 'salted_caramel';
export type ToppingOption =
  | 'none'
  | 'boba'
  | 'crystal_boba'
  | 'lychee_jelly'
  | 'pudding'
  | 'popping_boba'
  | 'aloe_vera';
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
  unlockResearchId?: string;
  description: string;
  liquidColor: string;
  milkColor: string;
  foamColor: string | null;
}

export interface ResearchNode {
  id: string;
  name: string;
  category: 'ingredient' | 'logistics';
  cost: number;
  minDay: number;
  summary: string;
  unlocksLabel: string;
  starterGrants: Partial<InventoryStock>;
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

export type HairStyle = 'short' | 'bob' | 'ponytail' | 'bun' | 'curly';
export type StaffAccessory = 'none' | 'glasses' | 'headphones' | 'bandana' | 'apron_pin';

export interface ActorAppearance {
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
  accessory: StaffAccessory;
  heightScale: number;
}

export type StaffRole = 'barista' | 'prep_chef' | 'cashier';

export interface StaffCandidate {
  id: string;
  name: string;
  role: StaffRole;
  hireCost: number;
  dailyWage: number;
  baseSpeed: number;
  shirtColor: string;
  hatType: CustomerEntity['hatType'];
  appearance: ActorAppearance;
  bio: string;
}

export interface EmployeeReviewRecord {
  rating: number; // 1..5
  tag: 'Praise' | 'Speed Focus' | 'Guest Care';
  note: string;
  day: number;
}

export interface HiredEmployee {
  id: string;
  candidateId: string;
  name: string;
  role: StaffRole;
  dailyWage: number;
  skillLevel: number; // 1..5
  speed: number;
  morale: number; // 0..100
  tipsReceived: number;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  facing: number;
  walkPhase: number;
  task: 'idle' | 'prepping' | 'crafting' | 'serving' | 'hosting' | 'restocking';
  assignedOrderId: string | null;
  taskTimer: number;
  holdingCupColor: string | null;
  shirtColor: string;
  hatType: CustomerEntity['hatType'];
  appearance: ActorAppearance;
  onDuty: boolean;
  autoRestock: boolean;
  drinksCrafted: number;
  accurateCrafts: number;
  prepCount: number;
  dailyDrinksServed: number;
  dailyErrors: number;
  dailyPrepCount: number;
  lastReview: EmployeeReviewRecord | null;
}

export interface ShopExpansionDef {
  level: number;
  name: string;
  cost: number;
  maxQueue: number;
  maxStaffSlots: number;
  spawnBoost: number;
  tipBonus: number;
  description: string;
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
  status: 'waiting' | 'sealing' | 'staff_crafting';
  sealProgress: number;
  assignedEmployeeId: string | null;
  staffBuild?: DrinkBuild;
  isRefill?: boolean;
}

export interface InventoryStock {
  assamTea: number;
  jasmineTea: number;
  oolongTea: number;
  matchaPowder: number;
  taroPaste: number;
  passionfruitSyrup: number;
  strawberryPuree: number;
  thaiTeaLeaf: number;
  blackSesame: number;
  freshMilk: number;
  oatMilk: number;
  brownSugar: number;
  cheeseFoam: number;
  coconutCream: number;
  saltedCaramel: number;
  rawBoba: number;
  crystalBoba: number;
  lycheeJelly: number;
  eggPudding: number;
  poppingBoba: number;
  aloeVera: number;
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

export interface CustomerVisitRecord {
  customerName: string;
  archetype: CustomerArchetype;
  drinkName: string;
  accuracy: number; // 0..1
  waitRatio: number; // 0 (instant) .. 1 (full patience elapsed)
  walkedOut: boolean;
  bobaFreshness: number;
  staffName: string | null;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  archetype: CustomerArchetype;
  drinkName: string;
  stars: 1 | 2 | 3 | 4 | 5;
  drinkMood: string;
  waitMood: string;
  quote: string;
  staffName?: string | null;
  responseStatus?: 'none' | 'thanked' | 'voucher';
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
  wagesCost: number;
  rentCost: number;
  netProfit: number;
  reputationDelta: number;
  reviews: CustomerReview[];
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

export type TipJarMode = 'modest' | 'classic' | 'generous';

export interface SimState {
  phase: GamePhase;
  outcome: 'none' | 'victory' | 'bankrupt' | 'reputation_lost';
  endlessMode: boolean;
  day: number;
  simMinutes: number; // 540 = 09:00, 1260 = 21:00
  simElapsed: number;
  speedMultiplier: number; // 1..10
  tipJarMode: TipJarMode;
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
  unlockedResearch: string[];
  expansionLevel: number; // 0 = Base Kiosk, 1 = Patio Lounge, 2 = Flagship Night Bar
  maxStaffSlots: number;
  employees: HiredEmployee[];
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
    visitLog: CustomerVisitRecord[];
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
  unlockResearchId?: string;
  grants: Partial<InventoryStock>;
}

export interface UpgradeDefinition {
  key: keyof ShopUpgrades;
  name: string;
  cost: number;
  effect: string;
}
