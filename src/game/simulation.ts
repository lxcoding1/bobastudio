import {
  CUSTOMER_NAMES,
  DAILY_RENT,
  DRINK_MENU,
  MAX_SIM_SPEED,
  MAX_STAFF_LEVEL,
  MILK_META,
  PERCENT_OPTIONS,
  RESEARCH_PROJECTS,
  RESTOCK_PACKS,
  SHIRT_PALETTE,
  SHOP_CLOSE_MINUTES,
  SHOP_EXPANSIONS,
  SHOP_LAST_ORDER_MINUTES,
  SHOP_OPEN_MINUTES,
  SHOP_UPGRADES,
  SIM_MINUTES_PER_SECOND,
  STAFF_ROSTER,
  STAFF_TRAINING_TIERS,
  TEA_BASE_META,
  TIP_JAR_PRESETS,
  TOPPING_META,
} from './catalog';
import type {
  BatchPot,
  CustomerArchetype,
  CustomerEntity,
  CustomerReview,
  CustomerVisitRecord,
  DaySummary,
  DrinkBuild,
  DrinkRecipe,
  EmployeeReviewRecord,
  HiredEmployee,
  InventoryStock,
  MilkOption,
  OrderTicket,
  PercentLevel,
  ShopExpansionDef,
  ShopUpgrades,
  SimState,
  StaffCandidate,
  TeaBase,
  TipJarMode,
  ToppingOption,
} from './types';

export interface CraftCheckResult {
  canCraft: boolean;
  reason: string | null;
}

export interface ServeEvaluation {
  matchedBase: boolean;
  matchedMilk: boolean;
  matchedTopping: boolean;
  matchedIce: boolean;
  matchedSweetness: boolean;
  perfect: boolean;
  accuracy: number; // 0..1
  baseEarned: number;
  tipEarned: number;
  repDelta: number;
  feedbackLabel: string;
}

export function createInitialInventory(): InventoryStock {
  return {
    assamTea: 8,
    jasmineTea: 7,
    oolongTea: 6,
    matchaPowder: 6,
    taroPaste: 5,
    passionfruitSyrup: 0,
    strawberryPuree: 0,
    thaiTeaLeaf: 0,
    blackSesame: 0,
    freshMilk: 10,
    oatMilk: 6,
    brownSugar: 6,
    cheeseFoam: 6,
    coconutCream: 0,
    saltedCaramel: 0,
    rawBoba: 3,
    crystalBoba: 6,
    lycheeJelly: 6,
    eggPudding: 6,
    poppingBoba: 0,
    aloeVera: 0,
    cups: 28,
  };
}

export function createEmptyBuild(): DrinkBuild {
  return {
    teaBase: null,
    milk: 'none',
    topping: 'none',
    ice: 50,
    sweetness: 75,
  };
}

function buildEmployeeFromCandidate(
  cand: StaffCandidate,
  day: number,
  idx: number,
): HiredEmployee {
  const spawnX = cand.role === 'prep_chef' ? -3.8 : cand.role === 'cashier' ? 0.55 : -1.2;
  const spawnZ = cand.role === 'prep_chef' ? -1.4 : cand.role === 'cashier' ? -3.4 : -2.6 + idx * 1.1;
  return {
    id: `emp_${cand.id}_${day}_${idx}`,
    candidateId: cand.id,
    name: cand.name,
    role: cand.role,
    dailyWage: cand.dailyWage,
    skillLevel: 1,
    speed: cand.baseSpeed,
    morale: 80,
    tipsReceived: 0,
    x: spawnX,
    z: spawnZ,
    targetX: spawnX,
    targetZ: spawnZ,
    facing: Math.PI / 2,
    walkPhase: 0,
    task: cand.role === 'cashier' ? 'hosting' : 'idle',
    assignedOrderId: null,
    taskTimer: 0,
    holdingCupColor: null,
    shirtColor: cand.shirtColor,
    hatType: cand.hatType,
    appearance: { ...cand.appearance },
    onDuty: true,
    autoRestock: true,
    drinksCrafted: 0,
    accurateCrafts: 0,
    prepCount: 0,
    dailyDrinksServed: 0,
    dailyErrors: 0,
    dailyPrepCount: 0,
    lastReview: null,
  };
}

export function createInitialSimState(autostart = false): SimState {
  const bobaPot: BatchPot = {
    id: 'boba_pot',
    label: 'Boba Kettle',
    servingsLeft: 6,
    maxServings: 12,
    freshness: 92,
    isCooking: false,
    cookProgress: 0,
    cookDuration: 8,
  };

  const teaBrewer: BatchPot = {
    id: 'tea_brewer',
    label: 'Tea Infuser',
    servingsLeft: 8,
    maxServings: 12,
    freshness: 95,
    isCooking: false,
    cookProgress: 0,
    cookDuration: 6,
  };

  const starterEmployee = buildEmployeeFromCandidate(STAFF_ROSTER[0], 1, 0);

  return {
    phase: autostart ? 'playing' : 'title',
    outcome: 'none',
    endlessMode: false,
    day: 1,
    simMinutes: SHOP_OPEN_MINUTES,
    simElapsed: 0,
    speedMultiplier: 1,
    tipJarMode: 'classic',
    cash: 150,
    reputation: 4.0,
    totalServed: 0,
    streak: 0,
    bestStreak: 0,
    nextTicketNumber: 101,
    nextCustomerSeq: 1,
    spawnCooldown: 0.2,
    inventory: createInitialInventory(),
    bobaPot,
    teaBrewer,
    upgrades: {
      dualKettle: false,
      autoSealer: false,
      bobaBot: false,
      espressoInfuser: false,
      loyaltySign: false,
    },
    unlockedResearch: [],
    expansionLevel: 0,
    maxStaffSlots: SHOP_EXPANSIONS[0].maxStaffSlots,
    employees: [starterEmployee],
    customers: [],
    orders: [],
    selectedOrderId: null,
    currentBuild: createEmptyBuild(),
    barista: {
      x: 0.25,
      z: -1.1,
      targetX: 0.25,
      targetZ: -1.1,
      facing: Math.PI / 2,
      task: 'idle',
      walkPhase: 0,
      holdingCupColor: null,
    },
    bobaBot: {
      x: -2.2,
      z: 0.6,
      facing: 0,
      waypointIndex: 0,
      carryingCup: false,
    },
    dayStats: {
      drinksServed: 0,
      perfectDrinks: 0,
      walkouts: 0,
      revenue: 0,
      tipsEarned: 0,
      restockSpent: 0,
      upgradeSpent: 0,
      reputationStart: 4.0,
      visitLog: [],
    },
    lastDaySummary: null,
    events: [],
    bannerMessage: null,
  };
}

export function getExpansionDef(level: number): ShopExpansionDef {
  return SHOP_EXPANSIONS[Math.max(0, Math.min(SHOP_EXPANSIONS.length - 1, level))];
}

export function formatShopClock(simMinutes: number): string {
  const clamped = Math.max(0, Math.floor(simMinutes));
  const hours24 = Math.floor(clamped / 60) % 24;
  const mins = clamped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function getRushMultiplier(simMinutes: number): number {
  // Morning warmup -> Lunch rush 11:30-14:15 -> Afternoon chill -> Sunset/Evening rush 17:30-20:00
  if (simMinutes >= 11 * 60 + 30 && simMinutes <= 14 * 60 + 15) return 1.55;
  if (simMinutes >= 17 * 60 + 30 && simMinutes <= 20 * 60 + 10) return 1.6;
  if (simMinutes >= 15 * 60 + 30 && simMinutes < 17 * 60 + 30) return 1.25;
  if (simMinutes < 10 * 60) return 0.9;
  return 1.05;
}

export function getAvailableMenu(
  day: number,
  unlockedResearch: readonly string[] = [],
): DrinkRecipe[] {
  return DRINK_MENU.filter(
    (d) =>
      d.unlockDay <= day &&
      (!d.unlockResearchId || unlockedResearch.includes(d.unlockResearchId)),
  );
}

export function getUnlockedTeaBases(unlockedResearch: readonly string[] = []): TeaBase[] {
  return (Object.keys(TEA_BASE_META) as TeaBase[]).filter((key) => {
    const req = TEA_BASE_META[key].unlockResearchId;
    return !req || unlockedResearch.includes(req);
  });
}

export function getUnlockedMilks(unlockedResearch: readonly string[] = []): MilkOption[] {
  return (Object.keys(MILK_META) as MilkOption[]).filter((key) => {
    const req = MILK_META[key].unlockResearchId;
    return !req || unlockedResearch.includes(req);
  });
}

export function getUnlockedToppings(unlockedResearch: readonly string[] = []): ToppingOption[] {
  return (Object.keys(TOPPING_META) as ToppingOption[]).filter((key) => {
    const req = TOPPING_META[key].unlockResearchId;
    return !req || unlockedResearch.includes(req);
  });
}

export function getQueueSlotPosition(slot: number): { x: number; z: number } {
  if (slot < 4) {
    return {
      x: 3.15,
      z: -2.0 + slot * 1.35,
    };
  }
  if (slot < 7) {
    return {
      x: 4.6,
      z: -1.6 + (slot - 4) * 1.45,
    };
  }
  return {
    x: 6.05,
    z: -1.2 + (slot - 7) * 1.85,
  };
}

function deterministicPick<T>(arr: readonly T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

export function pickCustomerArchetype(day: number, seq: number, simMinutes: number): CustomerArchetype {
  const roll = (seq * 37 + day * 13 + Math.floor(simMinutes)) % 20;
  if (simMinutes >= 12 * 60 && roll === 19) return 'critic';
  if (roll % 5 === 0) return 'foodie';
  if (roll % 3 === 0) return 'office';
  return 'student';
}

export function createCustomerAndOrder(
  state: SimState,
  slot: number,
  seedOffset = 0,
): { customer: CustomerEntity; order: OrderTicket } {
  const seq = state.nextCustomerSeq + seedOffset;
  const menu = getAvailableMenu(state.day, state.unlockedResearch);
  const recipe = deterministicPick(menu, seq * 7 + state.day * 3);
  const archetype = pickCustomerArchetype(state.day, seq, state.simMinutes);
  const isRefill = seq >= 4 && seq % 5 === 0;

  let ice: PercentLevel = 50;
  let sweetness: PercentLevel = 75;
  if (archetype === 'foodie' || archetype === 'critic') {
    ice = deterministicPick(PERCENT_OPTIONS, seq * 3 + 1);
    sweetness = deterministicPick(PERCENT_OPTIONS, seq * 5 + 2);
  } else if (archetype === 'office') {
    ice = deterministicPick([25, 50, 75] as const, seq);
    sweetness = deterministicPick([25, 50, 75] as const, seq + 1);
  } else {
    ice = deterministicPick([50, 75, 100] as const, seq);
    sweetness = deterministicPick([75, 100] as const, seq + 2);
  }

  let basePatience = archetype === 'office' ? 42 : archetype === 'critic' ? 46 : 54;
  if (state.upgrades.loyaltySign) basePatience *= 1.2;
  if (state.upgrades.bobaBot) basePatience *= 1.1;
  if (isRefill) basePatience *= 0.88;
  // Slightly faster pace on later days
  basePatience = Math.max(28, basePatience - (state.day - 1) * 2.5);

  const hatOptions = ['none', 'sunhat', 'cap', 'beanie'] as const;
  const hatType = archetype === 'foodie' ? 'sunhat' : deterministicPick(hatOptions, seq + 1);
  const name = deterministicPick(CUSTOMER_NAMES, seq);
  const shirtColor = deterministicPick(SHIRT_PALETTE, seq);
  const slotPos = getQueueSlotPosition(slot);
  const customerId = `cust_${seq}`;
  const orderId = `ord_${state.nextTicketNumber}`;

  const customer: CustomerEntity = {
    id: customerId,
    name,
    archetype,
    state: 'entering',
    queueSlot: slot,
    x: 8.8,
    z: 2.8,
    targetX: slotPos.x,
    targetZ: slotPos.z,
    facing: -Math.PI / 2,
    shirtColor,
    hatType,
    carryProp: isRefill ? 'cup' : seq % 4 === 0 ? 'box' : 'none',
    walkPhase: 0,
    orderId,
    moodOffset: (seq % 7) * 0.4,
  };

  const order: OrderTicket = {
    id: orderId,
    ticketNumber: state.nextTicketNumber,
    customerId,
    customerName: name,
    archetype,
    recipe,
    ice,
    sweetness,
    price: isRefill ? Number((recipe.basePrice * 0.65).toFixed(2)) : recipe.basePrice,
    patienceMax: basePatience,
    patienceLeft: basePatience,
    createdAtSim: state.simMinutes,
    status: 'waiting',
    sealProgress: 0,
    assignedEmployeeId: null,
    isRefill,
  };

  return { customer, order };
}

export function checkCanCraftDrink(state: SimState, build: DrinkBuild): CraftCheckResult {
  if (!build.teaBase) {
    return { canCraft: false, reason: 'Select a Tea Base first' };
  }
  if (state.inventory.cups <= 0) {
    return { canCraft: false, reason: 'Out of Cups — Restock in Pantry [U]' };
  }
  if (state.teaBrewer.servingsLeft <= 0) {
    return { canCraft: false, reason: 'Tea Infuser empty — Brew Tea Pot!' };
  }
  const teaKey = TEA_BASE_META[build.teaBase].stockKey;
  if (state.inventory[teaKey] <= 0) {
    return {
      canCraft: false,
      reason: `Out of ${TEA_BASE_META[build.teaBase].short} — Restock [U]`,
    };
  }
  const milkKey = MILK_META[build.milk].stockKey;
  if (milkKey && state.inventory[milkKey] <= 0) {
    return {
      canCraft: false,
      reason: `Out of ${MILK_META[build.milk].short} — Restock [U]`,
    };
  }
  if (build.topping === 'boba') {
    if (state.bobaPot.servingsLeft <= 0) {
      return { canCraft: false, reason: 'Boba Kettle empty — Cook Boba Batch!' };
    }
  } else {
    const topKey = TOPPING_META[build.topping].stockKey;
    if (topKey && state.inventory[topKey] <= 0) {
      return {
        canCraft: false,
        reason: `Out of ${TOPPING_META[build.topping].short} — Restock [U]`,
      };
    }
  }
  return { canCraft: true, reason: null };
}

export function evaluateDrinkAgainstOrder(
  order: OrderTicket,
  build: DrinkBuild,
  bobaFreshness: number,
  upgrades: ShopUpgrades,
): ServeEvaluation {
  const matchedBase = build.teaBase === order.recipe.teaBase;
  const matchedMilk = build.milk === order.recipe.milk;
  const matchedTopping = build.topping === order.recipe.topping;
  const matchedIce = build.ice === order.ice;
  const matchedSweetness = build.sweetness === order.sweetness;

  let score = 0;
  if (matchedBase) score += 0.35;
  if (matchedMilk) score += 0.25;
  if (matchedTopping) score += 0.25;
  if (matchedIce) score += 0.075;
  if (matchedSweetness) score += 0.075;

  const perfect =
    matchedBase && matchedMilk && matchedTopping && matchedIce && matchedSweetness;

  const patienceRatio = Math.max(0, order.patienceLeft / order.patienceMax);
  const speedBonus = patienceRatio > 0.55 ? 0.65 : patienceRatio > 0.3 ? 0.25 : 0;
  const bobaFreshBonus =
    build.topping === 'boba' && bobaFreshness >= 60 ? 0.75 : 0;
  const archetypeMult =
    order.archetype === 'foodie' ? 1.35 : order.archetype === 'critic' ? 1.5 : 1.0;
  const signMult = upgrades.loyaltySign ? 1.25 : 1.0;

  let baseEarned = order.price;
  let tipEarned = 0;
  let repDelta = 0;
  let feedbackLabel = 'Served';

  if (perfect) {
    tipEarned = Number(((0.85 + speedBonus + bobaFreshBonus) * archetypeMult * signMult).toFixed(2));
    repDelta = order.archetype === 'critic' ? 0.28 : 0.09;
    feedbackLabel = bobaFreshBonus > 0 ? 'Perfect & Fresh!' : 'Perfect Craft!';
  } else if (score >= 0.75) {
    baseEarned = Number((order.price * 0.9).toFixed(2));
    tipEarned = Number((0.25 * signMult).toFixed(2));
    repDelta = 0.03;
    feedbackLabel = 'Close Match';
  } else if (score >= 0.45) {
    baseEarned = Number((order.price * 0.65).toFixed(2));
    repDelta = order.archetype === 'critic' ? -0.18 : -0.06;
    feedbackLabel = 'Mixed Order';
  } else {
    baseEarned = Number((order.price * 0.3).toFixed(2));
    repDelta = order.archetype === 'critic' ? -0.35 : -0.16;
    feedbackLabel = 'Wrong Drink!';
  }

  const accuracy = Number(score.toFixed(4));

  return {
    matchedBase,
    matchedMilk,
    matchedTopping,
    matchedIce,
    matchedSweetness,
    perfect,
    accuracy,
    baseEarned,
    tipEarned,
    repDelta,
    feedbackLabel,
  };
}

function triggerBobaPotCook(state: SimState, movePlayerBarista: boolean): boolean {
  if (state.bobaPot.isCooking) return false;
  if (state.inventory.rawBoba <= 0) {
    if (movePlayerBarista) {
      state.bannerMessage = 'Out of Raw Tapioca — Restock in Pantry [U]';
    }
    return false;
  }
  state.inventory.rawBoba -= 1;
  state.bobaPot.isCooking = true;
  state.bobaPot.cookProgress = 0;
  state.bobaPot.cookDuration = state.upgrades.dualKettle ? 5.2 : 8.0;
  if (movePlayerBarista) {
    state.barista.task = 'brewing';
    state.barista.targetX = -4.3;
    state.barista.targetZ = -2.2;
  }
  return true;
}

function triggerTeaBrewerCook(state: SimState, movePlayerBarista: boolean): boolean {
  if (state.teaBrewer.isCooking) return false;
  state.teaBrewer.isCooking = true;
  state.teaBrewer.cookProgress = 0;
  state.teaBrewer.cookDuration = state.upgrades.espressoInfuser ? 4.0 : 6.0;
  if (movePlayerBarista) {
    state.barista.task = 'brewing';
    state.barista.targetX = -4.3;
    state.barista.targetZ = -0.3;
  }
  return true;
}

export function startCookBobaBatch(state: SimState): boolean {
  return triggerBobaPotCook(state, true);
}

export function startBrewTeaBatch(state: SimState): boolean {
  return triggerTeaBrewerCook(state, true);
}

function consumeIngredientsForBuild(state: SimState, b: DrinkBuild): void {
  state.inventory.cups = Math.max(0, state.inventory.cups - 1);
  state.teaBrewer.servingsLeft = Math.max(0, state.teaBrewer.servingsLeft - 1);
  if (b.teaBase) {
    const teaKey = TEA_BASE_META[b.teaBase].stockKey;
    state.inventory[teaKey] = Math.max(0, state.inventory[teaKey] - 1);
  }
  const milkKey = MILK_META[b.milk].stockKey;
  if (milkKey) {
    state.inventory[milkKey] = Math.max(0, state.inventory[milkKey] - 1);
  }
  if (b.topping === 'boba') {
    state.bobaPot.servingsLeft = Math.max(0, state.bobaPot.servingsLeft - 1);
  } else {
    const topKey = TOPPING_META[b.topping].stockKey;
    if (topKey) {
      state.inventory[topKey] = Math.max(0, state.inventory[topKey] - 1);
    }
  }
}

export function startSealingSelectedOrder(state: SimState): CraftCheckResult {
  const order = state.orders.find((o) => o.id === state.selectedOrderId);
  if (!order) {
    return { canCraft: false, reason: 'Select a customer order first' };
  }
  if (order.status === 'sealing') {
    return { canCraft: false, reason: 'Already sealing this cup!' };
  }
  if (order.status === 'staff_crafting') {
    return { canCraft: false, reason: 'Staff is already crafting this ticket!' };
  }
  const check = checkCanCraftDrink(state, state.currentBuild);
  if (!check.canCraft) {
    state.bannerMessage = check.reason;
    return check;
  }

  // Consume ingredients up-front as cup is assembled & sealed
  const b = state.currentBuild;
  consumeIngredientsForBuild(state, b);

  order.status = 'sealing';
  order.sealProgress = 0;
  state.barista.task = 'sealing';
  state.barista.targetX = 0.35;
  state.barista.targetZ = 0.2;
  state.barista.holdingCupColor =
    b.teaBase ? TEA_BASE_META[b.teaBase].color : order.recipe.liquidColor;
  state.bannerMessage = null;

  return { canCraft: true, reason: null };
}

export function buyRestockPack(state: SimState, packId: string): boolean {
  const pack = RESTOCK_PACKS.find((p) => p.id === packId);
  if (!pack || state.cash < pack.cost) return false;
  state.cash = Number((state.cash - pack.cost).toFixed(2));
  state.dayStats.restockSpent = Number((state.dayStats.restockSpent + pack.cost).toFixed(2));
  for (const [key, qty] of Object.entries(pack.grants)) {
    const invKey = key as keyof InventoryStock;
    state.inventory[invKey] += qty ?? 0;
  }
  return true;
}

export function unlockResearch(state: SimState, researchId: string): boolean {
  if (state.unlockedResearch.includes(researchId)) return false;
  const node = RESEARCH_PROJECTS.find((r) => r.id === researchId);
  if (!node || state.day < node.minDay || state.cash < node.cost) return false;
  state.cash = Number((state.cash - node.cost).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + node.cost).toFixed(2));
  state.unlockedResearch.push(node.id);
  for (const [key, qty] of Object.entries(node.starterGrants)) {
    const invKey = key as keyof InventoryStock;
    state.inventory[invKey] += qty ?? 0;
  }
  state.bannerMessage = `Researched ${node.name}!`;
  pushEvent(state, {
    kind: 'batch',
    text: node.name,
    subtext: 'New Menu Unlocked!',
    color: '#218367',
    worldX: 0,
    worldY: 2.8,
    worldZ: 0,
  });
  return true;
}

export function buyShopUpgrade(state: SimState, key: keyof ShopUpgrades): boolean {
  if (state.upgrades[key]) return false;
  const def = SHOP_UPGRADES.find((u) => u.key === key);
  if (!def || state.cash < def.cost) return false;
  state.cash = Number((state.cash - def.cost).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + def.cost).toFixed(2));
  state.upgrades[key] = true;

  if (key === 'dualKettle') {
    state.bobaPot.maxServings = 20;
    state.bobaPot.cookDuration = 5.2;
  }
  if (key === 'espressoInfuser') {
    state.teaBrewer.maxServings = 18;
    state.teaBrewer.cookDuration = 4.0;
  }
  return true;
}

export function getEmployeeAccuracyChance(
  emp: HiredEmployee,
  activeQueueLen: number,
  isRefill = false,
): number {
  const baseByLevel = [0.74, 0.83, 0.9, 0.95, 0.985];
  const base = baseByLevel[Math.max(0, Math.min(4, emp.skillLevel - 1))];
  const moraleAdj = (emp.morale - 75) * 0.0022;
  const rushScale = Math.max(0.25, 1 - (emp.skillLevel - 1) * 0.2);
  const rushPenalty = activeQueueLen > 3 ? (activeQueueLen - 3) * 0.025 * rushScale : 0;
  const refillBonus = isRefill ? 0.04 : 0;
  return Math.max(0.55, Math.min(0.995, base + moraleAdj - rushPenalty + refillBonus));
}

export interface EmployeeDailyPerformance {
  baseSpeed: number;
  moraleMultiplier: number;
  effectiveSpeed: number;
  craftSeconds: number;
  drinksServedToday: number;
  errorsToday: number;
  prepActionsToday: number;
  observedErrorRatePct: number | null;
  expectedErrorRatePct: number;
  tierTitle: string;
  baseErrorPct: number;
  moraleSpeedPct: number;
  moraleErrorDeltaPct: number;
  rushErrorPenaltyPct: number;
  reasonSummary: string;
}

export function getEmployeeDailyPerformance(
  emp: HiredEmployee,
  activeQueueLen: number,
): EmployeeDailyPerformance {
  const baseByLevel = [0.74, 0.83, 0.9, 0.95, 0.985];
  const levelIdx = Math.max(0, Math.min(4, emp.skillLevel - 1));
  const baseAcc = baseByLevel[levelIdx];
  const moraleMultiplier = Number((0.9 + (emp.morale / 100) * 0.25).toFixed(2));
  const effectiveSpeed = Number((emp.speed * moraleMultiplier).toFixed(2));
  const craftSeconds = Number(Math.max(1.1, 3.6 / Math.max(0.25, effectiveSpeed)).toFixed(2));

  const moraleAdj = (emp.morale - 75) * 0.0022;
  const rushScale = Math.max(0.25, 1 - (emp.skillLevel - 1) * 0.2);
  const rushPenalty = activeQueueLen > 3 ? (activeQueueLen - 3) * 0.025 * rushScale : 0;
  const expectedAcc = getEmployeeAccuracyChance(emp, activeQueueLen, false);
  const expectedErrorRatePct = Number(((1 - expectedAcc) * 100).toFixed(1));

  const drinksServedToday = emp.dailyDrinksServed;
  const errorsToday = emp.dailyErrors;
  const observedErrorRatePct =
    drinksServedToday > 0 ? Number(((errorsToday / drinksServedToday) * 100).toFixed(1)) : null;

  const tierTitle = getTrainingTier(emp.skillLevel).title;
  const baseErrorPct = Number(((1 - baseAcc) * 100).toFixed(1));
  const moraleSpeedPct = Math.round((moraleMultiplier - 1) * 100);
  const moraleErrorDeltaPct = Number((-moraleAdj * 100).toFixed(1));
  const rushErrorPenaltyPct = Number((rushPenalty * 100).toFixed(1));

  const reasons: string[] = [];
  reasons.push(`Lv.${emp.skillLevel} ${tierTitle} (${emp.speed.toFixed(2)}× base speed)`);
  if (emp.morale >= 85) {
    reasons.push(`High morale (${emp.morale}%) boosts pace +${moraleSpeedPct}%`);
  } else if (emp.morale < 65) {
    reasons.push(`Low morale (${emp.morale}%) slows pace & adds error risk`);
  } else {
    reasons.push(`Steady morale (${emp.morale}%)`);
  }
  if (emp.role === 'barista') {
    if (rushPenalty > 0) {
      reasons.push(`Rush queue (${activeQueueLen} waiting) adds +${rushErrorPenaltyPct}% error risk`);
    } else if (emp.skillLevel <= 2) {
      reasons.push(`Early training (${baseErrorPct}% base slip rate — train or tip to sharpen)`);
    } else {
      reasons.push(`Seasoned craft precision (${baseErrorPct}% base slip rate)`);
    }
  } else if (emp.role === 'prep_chef') {
    reasons.push(`Back-of-house batch & refill pacing (${emp.dailyPrepCount} runs today)`);
  } else {
    reasons.push(
      `Slows queue patience decay by ${emp.skillLevel * 11}% (${emp.dailyPrepCount} hosted today)`,
    );
  }
  if (!emp.onDuty) {
    reasons.push('Currently off shift');
  }

  return {
    baseSpeed: emp.speed,
    moraleMultiplier,
    effectiveSpeed,
    craftSeconds,
    drinksServedToday,
    errorsToday,
    prepActionsToday: emp.dailyPrepCount,
    observedErrorRatePct,
    expectedErrorRatePct,
    tierTitle,
    baseErrorPct,
    moraleSpeedPct,
    moraleErrorDeltaPct,
    rushErrorPenaltyPct,
    reasonSummary: reasons.join(' · '),
  };
}

export function buildEmployeeDrinkAttempt(
  emp: HiredEmployee,
  order: OrderTicket,
  state: SimState,
  rng: () => number = Math.random,
): DrinkBuild {
  const exact: DrinkBuild = {
    teaBase: order.recipe.teaBase,
    milk: order.recipe.milk,
    topping: order.recipe.topping,
    ice: order.ice,
    sweetness: order.sweetness,
  };
  const chance = getEmployeeAccuracyChance(emp, state.orders.length, order.isRefill);
  if (rng() <= chance) {
    return exact;
  }

  // Realistic human barista slip: under rush or low training, mistaking ice/sweetness or grabbing adjacent topping/milk
  const mistakeRoll = rng();
  const pickAdjacentPercent = (current: PercentLevel): PercentLevel => {
    const idx = PERCENT_OPTIONS.indexOf(current);
    const delta = rng() < 0.5 ? -1 : 1;
    const nextIdx = Math.max(0, Math.min(PERCENT_OPTIONS.length - 1, idx + delta));
    if (nextIdx === idx) {
      return PERCENT_OPTIONS[idx === 0 ? 1 : idx - 1];
    }
    return PERCENT_OPTIONS[nextIdx];
  };

  if (mistakeRoll < 0.35) {
    return { ...exact, ice: pickAdjacentPercent(order.ice) };
  }
  if (mistakeRoll < 0.65) {
    return { ...exact, sweetness: pickAdjacentPercent(order.sweetness) };
  }
  if (mistakeRoll < 0.82) {
    const altToppings = getUnlockedToppings(state.unlockedResearch).filter(
      (t) =>
        t !== order.recipe.topping &&
        (t === 'none' ||
          (t === 'boba'
            ? state.bobaPot.servingsLeft > 0
            : (() => {
                const k = TOPPING_META[t].stockKey;
                return k ? state.inventory[k] > 0 : true;
              })())),
    );
    if (altToppings.length > 0) {
      const chosen = altToppings[Math.floor(rng() * altToppings.length) % altToppings.length];
      return { ...exact, topping: chosen };
    }
    return { ...exact, ice: pickAdjacentPercent(order.ice) };
  }
  const altMilks = getUnlockedMilks(state.unlockedResearch).filter((m) => {
    if (m === order.recipe.milk) return false;
    const k = MILK_META[m].stockKey;
    return !k || state.inventory[k] > 0;
  });
  if (altMilks.length > 0) {
    const chosen = altMilks[Math.floor(rng() * altMilks.length) % altMilks.length];
    return { ...exact, milk: chosen };
  }
  return { ...exact, sweetness: pickAdjacentPercent(order.sweetness) };
}

interface NeededRestockItem {
  key: keyof InventoryStock;
  label: string;
  qty: number;
  cost: number;
}

function findNeededAutoRestock(state: SimState): NeededRestockItem | null {
  const wholesale = state.unlockedResearch.includes('res_wholesale_sync');
  const qtyBoost = wholesale ? 1.4 : 1;
  const costMult = wholesale ? 0.75 : 1;

  if (state.inventory.cups <= 5) {
    return {
      key: 'cups',
      label: 'Cups',
      qty: Math.round(16 * qtyBoost),
      cost: Number((7 * costMult).toFixed(2)),
    };
  }
  if (state.inventory.rawBoba <= 1) {
    return {
      key: 'rawBoba',
      label: 'Raw Boba',
      qty: wholesale ? 3 : 2,
      cost: Number((6 * costMult).toFixed(2)),
    };
  }

  const menu = getAvailableMenu(state.day, state.unlockedResearch);
  const candidates: Array<{ key: keyof InventoryStock; label: string; stock: number }> = [];
  const seen = new Set<keyof InventoryStock>();

  for (const recipe of menu) {
    const teaMeta = TEA_BASE_META[recipe.teaBase];
    if (!seen.has(teaMeta.stockKey)) {
      seen.add(teaMeta.stockKey);
      candidates.push({
        key: teaMeta.stockKey,
        label: teaMeta.short,
        stock: state.inventory[teaMeta.stockKey],
      });
    }
    const milkMeta = MILK_META[recipe.milk];
    if (milkMeta.stockKey && !seen.has(milkMeta.stockKey)) {
      seen.add(milkMeta.stockKey);
      candidates.push({
        key: milkMeta.stockKey,
        label: milkMeta.short,
        stock: state.inventory[milkMeta.stockKey],
      });
    }
    const topMeta = TOPPING_META[recipe.topping];
    if (topMeta.stockKey && recipe.topping !== 'boba' && !seen.has(topMeta.stockKey)) {
      seen.add(topMeta.stockKey);
      candidates.push({
        key: topMeta.stockKey,
        label: topMeta.short,
        stock: state.inventory[topMeta.stockKey],
      });
    }
  }

  candidates.sort((a, b) => a.stock - b.stock);
  const lowest = candidates[0];
  if (lowest && lowest.stock <= 1) {
    return {
      key: lowest.key,
      label: lowest.label,
      qty: Math.round(5 * qtyBoost),
      cost: Number((6 * costMult).toFixed(2)),
    };
  }
  return null;
}

export function tryEmployeeAutoRestock(state: SimState, emp: HiredEmployee): boolean {
  if (!emp.onDuty || !emp.autoRestock) return false;
  const need = findNeededAutoRestock(state);
  if (!need || state.cash < need.cost) return false;
  state.cash = Number((state.cash - need.cost).toFixed(2));
  state.dayStats.restockSpent = Number((state.dayStats.restockSpent + need.cost).toFixed(2));
  state.inventory[need.key] += need.qty;
  emp.prepCount += 1;
  emp.dailyPrepCount += 1;
  pushEvent(state, {
    kind: 'batch',
    text: `Refilled ${need.label}`,
    subtext: `${emp.name} +${need.qty} (-$${need.cost.toFixed(2)})`,
    color: '#235958',
    worldX: emp.x,
    worldY: 2.5,
    worldZ: emp.z,
  });
  return true;
}

export function setSimSpeed(state: SimState, speed: number): number {
  const clamped = Math.max(1, Math.min(MAX_SIM_SPEED, Math.round(speed)));
  state.speedMultiplier = clamped;
  return clamped;
}

export function cycleSimSpeed(state: SimState): number {
  const presets = [1, 2, 5, 10];
  const next = presets.find((p) => p > state.speedMultiplier) ?? 1;
  state.speedMultiplier = next;
  return next;
}

export function getTrainingTier(level: number) {
  return STAFF_TRAINING_TIERS[Math.max(0, Math.min(STAFF_TRAINING_TIERS.length - 1, level - 1))];
}

export function getTrainingCost(skillLevel: number): number {
  if (skillLevel >= MAX_STAFF_LEVEL) return 0;
  return getTrainingTier(skillLevel).costToNext;
}

export function hireEmployee(state: SimState, candidateId: string): boolean {
  if (state.employees.length >= state.maxStaffSlots) return false;
  if (state.employees.some((e) => e.candidateId === candidateId)) return false;
  const cand = STAFF_ROSTER.find((c) => c.id === candidateId);
  if (!cand || state.cash < cand.hireCost) return false;

  state.cash = Number((state.cash - cand.hireCost).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + cand.hireCost).toFixed(2));

  const idx = state.employees.length;
  const emp = buildEmployeeFromCandidate(cand, state.day, idx);
  state.employees.push(emp);
  state.bannerMessage = `Hired ${cand.name} (${cand.role.replace('_', ' ')})!`;
  return true;
}

export function toggleEmployeeDuty(state: SimState, empId: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  emp.onDuty = !emp.onDuty;
  if (!emp.onDuty && emp.assignedOrderId) {
    const order = state.orders.find((o) => o.id === emp.assignedOrderId);
    if (order && order.status === 'staff_crafting') {
      order.status = 'waiting';
      order.sealProgress = 0;
      order.assignedEmployeeId = null;
      order.staffBuild = undefined;
    }
    emp.assignedOrderId = null;
    emp.task = 'idle';
    emp.holdingCupColor = null;
  }
  return true;
}

export function toggleEmployeeAutoRestock(state: SimState, empId: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  emp.autoRestock = !emp.autoRestock;
  state.bannerMessage = `${emp.name} auto-refill ${emp.autoRestock ? 'enabled' : 'paused'}`;
  return true;
}

export function trainEmployee(state: SimState, empId: string): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp || emp.skillLevel >= MAX_STAFF_LEVEL) return false;
  const tier = getTrainingTier(emp.skillLevel);
  const cost = tier.costToNext;
  if (cost <= 0 || state.cash < cost) return false;
  state.cash = Number((state.cash - cost).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + cost).toFixed(2));
  emp.skillLevel += 1;
  emp.speed = Number((emp.speed * tier.speedMult).toFixed(2));
  emp.dailyWage += tier.wageDelta;
  emp.morale = Math.min(100, emp.morale + 8);
  const nextTier = getTrainingTier(emp.skillLevel);
  state.bannerMessage = `${emp.name} promoted to Lv.${emp.skillLevel} (${nextTier.title})!`;
  return true;
}

export function tipEmployee(state: SimState, empId: string, amount: number): boolean {
  if (amount <= 0 || state.cash < amount) return false;
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  state.cash = Number((state.cash - amount).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + amount).toFixed(2));
  emp.tipsReceived = Number((emp.tipsReceived + amount).toFixed(2));
  const moraleGain = amount >= 15 ? 24 : 12;
  emp.morale = Math.min(100, emp.morale + moraleGain);
  state.bannerMessage = `Tipped ${emp.name} $${amount} — Morale ${emp.morale}%!`;
  pushEvent(state, {
    kind: 'serve',
    text: `+$${amount} Tip`,
    subtext: `${emp.name} (${emp.morale}% morale)`,
    color: '#218367',
    worldX: emp.x,
    worldY: 2.5,
    worldZ: emp.z,
  });
  return true;
}

export function reviewEmployee(
  state: SimState,
  empId: string,
  rating: number,
  tag: EmployeeReviewRecord['tag'],
  note: string,
): boolean {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return false;
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
  emp.lastReview = {
    rating: clampedRating,
    tag,
    note: note.trim() || `${tag} logged on Day ${state.day}.`,
    day: state.day,
  };
  const moraleDelta = clampedRating >= 4 ? 10 : clampedRating === 3 ? 4 : -4;
  emp.morale = Math.max(20, Math.min(100, emp.morale + moraleDelta));
  state.bannerMessage = `Saved Day ${state.day} review for ${emp.name} (${clampedRating}★ · ${tag})`;
  return true;
}

export function setTipJarMode(state: SimState, mode: TipJarMode): void {
  state.tipJarMode = mode;
  state.bannerMessage = `Counter Tip Jar set to ${TIP_JAR_PRESETS[mode].label}`;
}

export function replyToCustomerReview(
  state: SimState,
  reviewId: string,
  action: 'thanked' | 'voucher',
): boolean {
  const summary = state.lastDaySummary;
  if (!summary) return false;
  const rev = summary.reviews.find((r) => r.id === reviewId);
  if (!rev || (rev.responseStatus && rev.responseStatus !== 'none')) return false;
  if (action === 'voucher') {
    if (state.cash < 3) return false;
    state.cash = Number((state.cash - 3).toFixed(2));
    state.reputation = Number(Math.min(5, state.reputation + 0.06).toFixed(2));
    summary.reputationDelta = Number((summary.reputationDelta + 0.06).toFixed(2));
    rev.responseStatus = 'voucher';
    state.bannerMessage = `Sent a $3 tea voucher to ${rev.customerName} (+0.06★)!`;
  } else {
    state.reputation = Number(Math.min(5, state.reputation + 0.02).toFixed(2));
    summary.reputationDelta = Number((summary.reputationDelta + 0.02).toFixed(2));
    rev.responseStatus = 'thanked';
    state.bannerMessage = `Thanked ${rev.customerName} (+0.02★)`;
  }
  return true;
}

export function fireEmployee(state: SimState, empId: string): boolean {
  const idx = state.employees.findIndex((e) => e.id === empId);
  if (idx === -1) return false;
  const emp = state.employees[idx];
  if (emp.assignedOrderId) {
    const order = state.orders.find((o) => o.id === emp.assignedOrderId);
    if (order && order.status === 'staff_crafting') {
      order.status = 'waiting';
      order.sealProgress = 0;
      order.assignedEmployeeId = null;
    }
  }
  state.employees.splice(idx, 1);
  return true;
}

export function buyShopExpansion(state: SimState, targetLevel: number): boolean {
  if (targetLevel !== state.expansionLevel + 1) return false;
  const def = SHOP_EXPANSIONS.find((e) => e.level === targetLevel);
  if (!def || state.cash < def.cost) return false;
  state.cash = Number((state.cash - def.cost).toFixed(2));
  state.dayStats.upgradeSpent = Number((state.dayStats.upgradeSpent + def.cost).toFixed(2));
  state.expansionLevel = def.level;
  state.maxStaffSlots = def.maxStaffSlots;
  state.bannerMessage = `Expanded to ${def.name}!`;
  pushEvent(state, {
    kind: 'batch',
    text: def.name,
    subtext: `Queue ${def.maxQueue} · Staff ${def.maxStaffSlots}`,
    color: '#218367',
    worldX: 5.5,
    worldY: 2.8,
    worldZ: 2.0,
  });
  return true;
}

export function advanceToNextDay(state: SimState): void {
  state.day += 1;
  state.simMinutes = SHOP_OPEN_MINUTES;
  state.phase = 'playing';
  state.customers = [];
  state.orders = [];
  state.selectedOrderId = null;
  state.currentBuild = createEmptyBuild();
  state.spawnCooldown = 1.2;
  state.bobaPot.freshness = Math.max(state.bobaPot.freshness, 85);
  state.teaBrewer.freshness = 100;
  for (const emp of state.employees) {
    emp.assignedOrderId = null;
    emp.holdingCupColor = null;
    emp.taskTimer = 0;
    emp.task = emp.role === 'cashier' ? 'hosting' : 'idle';
    emp.dailyDrinksServed = 0;
    emp.dailyErrors = 0;
    emp.dailyPrepCount = 0;
  }
  state.dayStats = {
    drinksServed: 0,
    perfectDrinks: 0,
    walkouts: 0,
    revenue: 0,
    tipsEarned: 0,
    restockSpent: 0,
    upgradeSpent: 0,
    reputationStart: state.reputation,
    visitLog: [],
  };
  state.lastDaySummary = null;
  state.bannerMessage = `Day ${state.day} Open — Welcome!`;
}

function randomFrom<T>(arr: readonly T[], rng: () => number): T {
  const idx = Math.floor(rng() * arr.length) % arr.length;
  return arr[idx];
}

export function generateDailyReviews(
  visitLog: readonly CustomerVisitRecord[],
  day: number,
  reputation: number,
  rng: () => number = Math.random,
): CustomerReview[] {
  if (visitLog.length === 0) {
    const quietNotes = [
      'Stopped by right before close — excited to try a cup tomorrow!',
      'Cozy storefront glow tonight. Looking forward to grabbing boba earlier tomorrow.',
      'Heard good buzz from neighbors; planning to swing by at lunchtime.',
    ];
    const stars: 1 | 2 | 3 | 4 | 5 = reputation >= 4.2 ? 5 : reputation >= 3.5 ? 4 : 3;
    return [
      {
        id: `rev_${day}_quiet`,
        customerName: randomFrom(CUSTOMER_NAMES, rng),
        archetype: 'student',
        drinkName: 'Passerby Note',
        stars,
        drinkMood: 'Window shopper',
        waitMood: 'Quiet shift',
        quote: randomFrom(quietNotes, rng),
      },
    ];
  }

  // Shuffle visits using rng, then pick up to 4 prioritizing variety (walkout + top + mixed)
  const pool = [...visitLog];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const chosen: CustomerVisitRecord[] = [];
  const walkoutSample = pool.find((v) => v.walkedOut);
  const perfectSample = pool.find((v) => !v.walkedOut && v.accuracy >= 0.95);
  const imperfectSample = pool.find((v) => !v.walkedOut && v.accuracy < 0.85);

  for (const cand of [perfectSample, walkoutSample, imperfectSample]) {
    if (cand && chosen.length < 4 && !chosen.includes(cand)) {
      chosen.push(cand);
    }
  }
  for (const cand of pool) {
    if (chosen.length >= 4) break;
    if (!chosen.includes(cand)) {
      chosen.push(cand);
    }
  }

  const fastGreatQuotes = [
    (v: CustomerVisitRecord) =>
      `My ${v.drinkName} came out fast and tasted balanced right down to the last sip.`,
    (v: CustomerVisitRecord) =>
      `Zero wait at the counter and my ${v.drinkName} was spot-on!${v.staffName ? ` Shoutout to ${v.staffName}.` : ''}`,
    (v: CustomerVisitRecord) =>
      `Super quick service today — ${v.drinkName} had great tea aroma and chewy pearls.`,
  ];
  const slowGreatQuotes = [
    (v: CustomerVisitRecord) =>
      `The line took a bit longer than hoped, though the ${v.drinkName} was genuinely delicious.`,
    (v: CustomerVisitRecord) =>
      `Worth the wait for this ${v.drinkName}, even if the rush slowed the counter down.`,
    (v: CustomerVisitRecord) =>
      `Flavor on the ${v.drinkName} nailed my order! Would love slightly faster pickup next time.`,
  ];
  const fairGreatQuotes = [
    (v: CustomerVisitRecord) =>
      `Smooth counter pace and a really satisfying ${v.drinkName}. Will be back soon!`,
    (v: CustomerVisitRecord) =>
      `Reasonable wait during the rush and my ${v.drinkName} hit the exact sweetness I wanted.`,
    (v: CustomerVisitRecord) =>
      `Really happy with my ${v.drinkName}${v.staffName ? ` crafted by ${v.staffName}` : ''} — friendly vibe too.`,
  ];
  const mixedDrinkQuotes = [
    (v: CustomerVisitRecord) =>
      `Service moved ${v.waitRatio <= 0.45 ? 'quickly' : 'at an okay pace'}, though my ${v.drinkName} felt slightly off-recipe.`,
    (v: CustomerVisitRecord) =>
      `Appreciate getting my cup, yet the toppings/sweetness on the ${v.drinkName} weren't quite right.`,
    (v: CustomerVisitRecord) =>
      `Decent tea base, just wished my ${v.drinkName} matched my ice and milk request closer.`,
  ];
  const wrongDrinkQuotes = [
    (v: CustomerVisitRecord) =>
      `Wait wasn't bad, but my ${v.drinkName} tasted like the wrong tea mix altogether.`,
    (v: CustomerVisitRecord) =>
      `Pretty sure my ${v.drinkName} got swapped with another ticket — hope tomorrow goes smoother!`,
  ];
  const walkoutQuotes = [
    (v: CustomerVisitRecord) =>
      `Waited in line for a ${v.drinkName} until I ran out of time and had to leave.`,
    (v: CustomerVisitRecord) =>
      `Line stalled too long today — really wanted that ${v.drinkName}, had to head out empty-handed.`,
    (v: CustomerVisitRecord) =>
      `Looked cozy inside, but the wait time for my ${v.drinkName} was way too long.`,
  ];

  return chosen.map((v, idx) => {
    if (v.walkedOut) {
      return {
        id: `rev_${day}_${idx}`,
        customerName: v.customerName,
        archetype: v.archetype,
        drinkName: v.drinkName,
        stars: 1,
        drinkMood: 'Left empty-handed',
        waitMood: 'Walked out',
        quote: randomFrom(walkoutQuotes, rng)(v),
        staffName: v.staffName,
        responseStatus: 'none',
      };
    }

    const waitMood =
      v.waitRatio <= 0.35 ? 'Fast service' : v.waitRatio <= 0.68 ? 'Fair wait' : 'Slow line';
    const drinkMood =
      v.accuracy >= 0.95
        ? v.bobaFreshness >= 65
          ? 'Perfect & fresh'
          : 'Spot-on recipe'
        : v.accuracy >= 0.7
          ? 'Close to order'
          : v.accuracy >= 0.45
            ? 'Off recipe'
            : 'Wrong cup';

    let stars: 1 | 2 | 3 | 4 | 5 = 4;
    let quote: string;

    if (v.accuracy >= 0.95) {
      stars = v.waitRatio <= 0.45 ? 5 : v.waitRatio <= 0.72 ? 4 : 3;
      quote =
        v.waitRatio <= 0.35
          ? randomFrom(fastGreatQuotes, rng)(v)
          : v.waitRatio > 0.68
            ? randomFrom(slowGreatQuotes, rng)(v)
            : randomFrom(fairGreatQuotes, rng)(v);
    } else if (v.accuracy >= 0.7) {
      stars = v.waitRatio <= 0.45 ? 4 : 3;
      quote = randomFrom(mixedDrinkQuotes, rng)(v);
    } else if (v.accuracy >= 0.45) {
      stars = v.waitRatio <= 0.5 ? 3 : 2;
      quote = randomFrom(mixedDrinkQuotes, rng)(v);
    } else {
      stars = v.waitRatio <= 0.5 ? 2 : 1;
      quote = randomFrom(wrongDrinkQuotes, rng)(v);
    }

    return {
      id: `rev_${day}_${idx}`,
      customerName: v.customerName,
      archetype: v.archetype,
      drinkName: v.drinkName,
      stars,
      drinkMood,
      waitMood,
      quote,
      staffName: v.staffName,
      responseStatus: 'none',
    };
  });
}

function finalizeDay(state: SimState): void {
  const rent = DAILY_RENT;
  const wagesCost = state.employees
    .filter((e) => e.onDuty)
    .reduce((sum, e) => sum + e.dailyWage, 0);
  state.cash = Number((state.cash - rent - wagesCost).toFixed(2));
  const netProfit = Number(
    (
      state.dayStats.revenue +
      state.dayStats.tipsEarned -
      state.dayStats.restockSpent -
      state.dayStats.upgradeSpent -
      wagesCost -
      rent
    ).toFixed(2),
  );
  const reviews = generateDailyReviews(state.dayStats.visitLog, state.day, state.reputation);
  const summary: DaySummary = {
    day: state.day,
    drinksServed: state.dayStats.drinksServed,
    perfectDrinks: state.dayStats.perfectDrinks,
    walkouts: state.dayStats.walkouts,
    revenue: Number(state.dayStats.revenue.toFixed(2)),
    tipsEarned: Number(state.dayStats.tipsEarned.toFixed(2)),
    restockSpent: Number(state.dayStats.restockSpent.toFixed(2)),
    upgradeSpent: Number(state.dayStats.upgradeSpent.toFixed(2)),
    wagesCost,
    rentCost: rent,
    netProfit,
    reputationDelta: Number((state.reputation - state.dayStats.reputationStart).toFixed(2)),
    reviews,
  };
  state.lastDaySummary = summary;

  if (state.cash < -40) {
    state.phase = 'gameover';
    state.outcome = 'bankrupt';
    return;
  }

  if (!state.endlessMode && state.reputation >= 4.75 && state.cash >= 360) {
    state.phase = 'gameover';
    state.outcome = 'victory';
    return;
  }

  state.phase = 'day_end';
}

function pushEvent(
  state: SimState,
  event: Omit<SimState['events'][number], 'id' | 'age'>,
): void {
  state.events.push({
    ...event,
    id: `ev_${Math.round(state.simElapsed * 1000)}_${state.events.length}`,
    age: 0,
  });
  if (state.events.length > 16) {
    state.events.shift();
  }
}

function moveToward(
  currentX: number,
  currentZ: number,
  targetX: number,
  targetZ: number,
  speed: number,
  dt: number,
): { x: number; z: number; arrived: boolean; facing: number } {
  const dx = targetX - currentX;
  const dz = targetZ - currentZ;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.06) {
    return { x: targetX, z: targetZ, arrived: true, facing: Math.atan2(dx, dz) };
  }
  const step = Math.min(dist, speed * dt);
  return {
    x: currentX + (dx / dist) * step,
    z: currentZ + (dz / dist) * step,
    arrived: step >= dist - 0.01,
    facing: Math.atan2(dx, dz),
  };
}

const BOT_WAYPOINTS: ReadonlyArray<{ x: number; z: number }> = [
  { x: -2.2, z: -2.0 },
  { x: -2.2, z: 2.5 },
  { x: -0.4, z: 2.5 },
  { x: -0.4, z: -2.0 },
];

export function stepSimulation(state: SimState, rawDt: number): void {
  const clampedSpeed = Math.max(1, Math.min(MAX_SIM_SPEED, state.speedMultiplier));
  const dt = Math.min(rawDt, 0.05) * clampedSpeed;

  // Age visual events even on idle/title background
  for (let i = state.events.length - 1; i >= 0; i--) {
    state.events[i].age += Math.min(rawDt, 0.05);
    if (state.events[i].age > 1.8) {
      state.events.splice(i, 1);
    }
  }

  // Boba-Bot gentle patrol always runs for diorama life
  const botTarget = BOT_WAYPOINTS[state.bobaBot.waypointIndex];
  const botSpeed = state.upgrades.bobaBot ? 2.4 : 1.45;
  const botMove = moveToward(
    state.bobaBot.x,
    state.bobaBot.z,
    botTarget.x,
    botTarget.z,
    botSpeed,
    Math.min(rawDt, 0.05),
  );
  state.bobaBot.x = botMove.x;
  state.bobaBot.z = botMove.z;
  state.bobaBot.facing = botMove.facing;
  if (botMove.arrived) {
    state.bobaBot.waypointIndex = (state.bobaBot.waypointIndex + 1) % BOT_WAYPOINTS.length;
  }

  if (state.phase !== 'playing') {
    return;
  }

  state.simElapsed += dt;
  state.simMinutes += dt * SIM_MINUTES_PER_SECOND;

  // 1. Update Batch Pots (cooking + freshness decay)
  if (state.bobaPot.isCooking) {
    state.bobaPot.cookProgress += dt / state.bobaPot.cookDuration;
    if (state.bobaPot.cookProgress >= 1) {
      state.bobaPot.isCooking = false;
      state.bobaPot.cookProgress = 0;
      state.bobaPot.servingsLeft = state.bobaPot.maxServings;
      state.bobaPot.freshness = 100;
      pushEvent(state, {
        kind: 'batch',
        text: 'Fresh Boba Ready!',
        color: '#2a7b6f',
        worldX: -4.8,
        worldY: 2.3,
        worldZ: -2.2,
      });
    }
  } else if (state.bobaPot.servingsLeft > 0) {
    const decayRate = state.upgrades.bobaBot ? 0.32 : 0.65;
    state.bobaPot.freshness = Math.max(0, state.bobaPot.freshness - decayRate * dt);
  }

  if (state.teaBrewer.isCooking) {
    state.teaBrewer.cookProgress += dt / state.teaBrewer.cookDuration;
    if (state.teaBrewer.cookProgress >= 1) {
      state.teaBrewer.isCooking = false;
      state.teaBrewer.cookProgress = 0;
      state.teaBrewer.servingsLeft = state.teaBrewer.maxServings;
      state.teaBrewer.freshness = 100;
      pushEvent(state, {
        kind: 'batch',
        text: 'Tea Pot Brewed!',
        color: '#b87635',
        worldX: -4.8,
        worldY: 2.3,
        worldZ: -0.2,
      });
    }
  }

  // 2. Spawn customers during service hours
  const expansion = getExpansionDef(state.expansionLevel);
  const maxQueue = expansion.maxQueue;
  const activeGuests = state.customers.filter(
    (c) => c.state !== 'leaving_happy' && c.state !== 'leaving_angry',
  );
  if (state.simMinutes < SHOP_LAST_ORDER_MINUTES && activeGuests.length < maxQueue) {
    state.spawnCooldown -= dt;
    if (state.spawnCooldown <= 0) {
      const usedSlots = new Set(activeGuests.map((c) => c.queueSlot));
      let freeSlot = 0;
      while (usedSlots.has(freeSlot) && freeSlot < maxQueue) freeSlot++;
      if (freeSlot < maxQueue) {
        const { customer, order } = createCustomerAndOrder(state, freeSlot);
        state.customers.push(customer);
        state.orders.push(order);
        state.nextTicketNumber += 1;
        state.nextCustomerSeq += 1;
        if (!state.selectedOrderId) {
          state.selectedOrderId = order.id;
        }
        const rush = getRushMultiplier(state.simMinutes);
        const dayFactor = Math.max(0.62, 1 - (state.day - 1) * 0.1);
        state.spawnCooldown = Math.max(3.8, (10.5 * dayFactor) / (rush * expansion.spawnBoost));
      }
    }
  }

  // Compute on-duty cashier, tip jar & expansion bonuses
  const tipJarPreset = TIP_JAR_PRESETS[state.tipJarMode];
  const onDutyCashierLevels = state.employees
    .filter((e) => e.onDuty && e.role === 'cashier')
    .reduce((sum, e) => sum + e.skillLevel, 0);
  const patienceDecayMult =
    Math.max(0.4, 1 - onDutyCashierLevels * 0.11) / tipJarPreset.patienceMult;
  const staffTipMult =
    expansion.tipBonus * (1 + onDutyCashierLevels * 0.12) * tipJarPreset.tipMult;

  const completeServedOrder = (
    orderIdx: number,
    order: OrderTicket,
    evalResult: ServeEvaluation,
    staffEmp?: HiredEmployee,
  ): boolean => {
    const baristaSkillMult = staffEmp ? 1 + (staffEmp.skillLevel - 1) * 0.08 : 1;
    const adjustedTip = Number((evalResult.tipEarned * staffTipMult * baristaSkillMult).toFixed(2));
    const totalEarn = Number((evalResult.baseEarned + adjustedTip).toFixed(2));
    for (const c of state.employees) {
      if (c.onDuty && c.role === 'cashier') {
        c.prepCount += 1;
        c.dailyPrepCount += 1;
      }
    }
    state.cash = Number((state.cash + totalEarn).toFixed(2));
    state.reputation = Number(
      Math.max(0, Math.min(5, state.reputation + evalResult.repDelta)).toFixed(2),
    );
    state.totalServed += 1;
    state.dayStats.drinksServed += 1;
    state.dayStats.revenue = Number((state.dayStats.revenue + evalResult.baseEarned).toFixed(2));
    state.dayStats.tipsEarned = Number((state.dayStats.tipsEarned + adjustedTip).toFixed(2));
    if (evalResult.perfect) {
      state.dayStats.perfectDrinks += 1;
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
    } else {
      state.streak = 0;
    }

    const waitRatio = Math.max(
      0,
      Math.min(1, 1 - order.patienceLeft / Math.max(1, order.patienceMax)),
    );
    const staffName = staffEmp?.name;
    state.dayStats.visitLog.push({
      customerName: order.customerName,
      archetype: order.archetype,
      drinkName: order.recipe.name,
      accuracy: evalResult.accuracy,
      waitRatio,
      walkedOut: false,
      bobaFreshness: state.bobaPot.freshness,
      staffName: staffName ?? null,
    });

    const cust = state.customers.find((c) => c.id === order.customerId);
    if (cust) {
      cust.state = evalResult.accuracy >= 0.7 ? 'leaving_happy' : 'leaving_angry';
      cust.carryProp = 'cup';
      cust.targetX = 8.9;
      cust.targetZ = 3.1;
      pushEvent(state, {
        kind: evalResult.accuracy >= 0.7 ? 'serve' : 'fail',
        text: `+$${totalEarn.toFixed(2)}`,
        subtext: staffName ? `${staffName} · ${evalResult.feedbackLabel}` : evalResult.feedbackLabel,
        color: evalResult.perfect ? '#218367' : evalResult.accuracy >= 0.7 ? '#b87635' : '#c94c4c',
        worldX: cust.x,
        worldY: 2.6,
        worldZ: cust.z,
      });
    }

    const wasSelected = state.selectedOrderId === order.id;
    state.orders.splice(orderIdx, 1);
    if (wasSelected || !state.selectedOrderId) {
      state.selectedOrderId = state.orders[0]?.id ?? null;
    }

    if (!state.endlessMode && state.reputation >= 4.8 && state.cash >= 500) {
      state.phase = 'gameover';
      state.outcome = 'victory';
      return true;
    }
    return false;
  };

  // 3. Process sealing orders & waiting patience decay
  const sealDuration = state.upgrades.autoSealer ? 0.45 : 1.05;
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const order = state.orders[i];
    if (order.status === 'sealing') {
      order.sealProgress += dt / sealDuration;
      if (order.sealProgress >= 1) {
        const evalResult = evaluateDrinkAgainstOrder(
          order,
          state.currentBuild,
          state.bobaPot.freshness,
          state.upgrades,
        );
        state.currentBuild = createEmptyBuild();
        state.barista.holdingCupColor = null;
        state.barista.task = 'idle';
        state.barista.targetX = 0.25;
        state.barista.targetZ = -1.1;
        if (completeServedOrder(i, order, evalResult)) return;
      }
    } else if (order.status === 'waiting') {
      const cust = state.customers.find((c) => c.id === order.customerId);
      if (cust && cust.state !== 'entering') {
        order.patienceLeft -= dt * patienceDecayMult;
        if (order.patienceLeft <= 0) {
          cust.state = 'leaving_angry';
          cust.targetX = 9.0;
          cust.targetZ = 3.2;
          state.dayStats.walkouts += 1;
          state.dayStats.visitLog.push({
            customerName: order.customerName,
            archetype: order.archetype,
            drinkName: order.recipe.name,
            accuracy: 0,
            waitRatio: 1,
            walkedOut: true,
            bobaFreshness: state.bobaPot.freshness,
            staffName: null,
          });
          state.streak = 0;
          const penalty = order.archetype === 'critic' ? 0.35 : 0.18;
          state.reputation = Number(Math.max(0, state.reputation - penalty).toFixed(2));
          pushEvent(state, {
            kind: 'walkout',
            text: 'Walked Out!',
            subtext: `-${penalty.toFixed(2)} ★`,
            color: '#c94c4c',
            worldX: cust.x,
            worldY: 2.5,
            worldZ: cust.z,
          });
          state.orders.splice(i, 1);
          if (state.selectedOrderId === order.id) {
            state.selectedOrderId = state.orders[0]?.id ?? null;
          }
          if (state.reputation <= 0) {
            state.phase = 'gameover';
            state.outcome = 'reputation_lost';
            return;
          }
        }
      }
    }
  }

  // 3b. Step Autonomous Hired Staff
  const hasPrepChefOnDuty = state.employees.some((e) => e.onDuty && e.role === 'prep_chef');
  for (let eIdx = 0; eIdx < state.employees.length; eIdx++) {
    const emp = state.employees[eIdx];
    if (!emp.onDuty) continue;
    const moraleBoost = 0.9 + (emp.morale / 100) * 0.25;
    const effectiveSpeed = emp.speed * moraleBoost;

    if (emp.role === 'prep_chef') {
      const neededRestock = emp.autoRestock ? findNeededAutoRestock(state) : null;
      if (state.bobaPot.servingsLeft <= 4 && !state.bobaPot.isCooking && state.inventory.rawBoba > 0) {
        emp.task = 'prepping';
        emp.targetX = -4.25;
        emp.targetZ = -2.25;
        if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.35) {
          if (triggerBobaPotCook(state, false)) {
            emp.prepCount += 1;
            emp.dailyPrepCount += 1;
          }
        }
      } else if (state.teaBrewer.servingsLeft <= 4 && !state.teaBrewer.isCooking) {
        emp.task = 'prepping';
        emp.targetX = -4.25;
        emp.targetZ = -0.25;
        if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.35) {
          if (triggerTeaBrewerCook(state, false)) {
            emp.prepCount += 1;
            emp.dailyPrepCount += 1;
          }
        }
      } else if (neededRestock && state.cash >= neededRestock.cost) {
        emp.task = 'restocking';
        emp.targetX = -2.6;
        emp.targetZ = 4.1;
        if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.45) {
          tryEmployeeAutoRestock(state, emp);
          emp.task = 'idle';
        }
      } else if (state.bobaPot.isCooking) {
        emp.task = 'prepping';
        emp.targetX = -4.25;
        emp.targetZ = -2.25;
      } else if (state.teaBrewer.isCooking) {
        emp.task = 'prepping';
        emp.targetX = -4.25;
        emp.targetZ = -0.25;
      } else {
        emp.task = 'idle';
        emp.targetX = -3.8;
        emp.targetZ = -1.3;
      }
    } else if (emp.role === 'cashier') {
      emp.task = 'hosting';
      emp.targetX = 0.55;
      emp.targetZ = -3.45;
    } else if (emp.role === 'barista') {
      if (emp.task === 'restocking') {
        const neededRestock = emp.autoRestock ? findNeededAutoRestock(state) : null;
        if (!neededRestock || state.cash < neededRestock.cost) {
          emp.task = 'idle';
        } else {
          emp.targetX = -2.6;
          emp.targetZ = 4.1;
          if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.45) {
            tryEmployeeAutoRestock(state, emp);
            emp.task = 'idle';
          }
        }
      } else if (emp.task === 'crafting' && emp.assignedOrderId) {
        const ordIdx = state.orders.findIndex((o) => o.id === emp.assignedOrderId);
        const ord = ordIdx >= 0 ? state.orders[ordIdx] : null;
        if (!ord) {
          emp.task = 'idle';
          emp.assignedOrderId = null;
          emp.holdingCupColor = null;
          emp.targetX = -1.1;
          emp.targetZ = -2.2 + (eIdx % 2) * 1.4;
        } else {
          const totalDuration = Math.max(1.1, 3.6 / effectiveSpeed);
          emp.taskTimer += dt;
          ord.sealProgress = Math.min(1, emp.taskTimer / totalDuration);
          if (ord.sealProgress < 0.5) {
            emp.targetX = -3.6;
            emp.targetZ = -1.0 + (eIdx % 2) * 0.9;
            emp.holdingCupColor = null;
          } else {
            emp.targetX = 0.45;
            emp.targetZ = -0.35 - (eIdx % 2) * 1.3;
            emp.holdingCupColor = ord.recipe.liquidColor;
          }
          if (emp.taskTimer >= totalDuration) {
            const staffBuild: DrinkBuild = ord.staffBuild ?? {
              teaBase: ord.recipe.teaBase,
              milk: ord.recipe.milk,
              topping: ord.recipe.topping,
              ice: ord.ice,
              sweetness: ord.sweetness,
            };
            const evalResult = evaluateDrinkAgainstOrder(
              ord,
              staffBuild,
              state.bobaPot.freshness,
              state.upgrades,
            );
            emp.drinksCrafted += 1;
            emp.dailyDrinksServed += 1;
            if (evalResult.perfect) {
              emp.accurateCrafts += 1;
            } else {
              emp.dailyErrors += 1;
            }
            emp.task = 'idle';
            emp.assignedOrderId = null;
            emp.taskTimer = 0;
            emp.holdingCupColor = null;
            emp.targetX = -1.1;
            emp.targetZ = -2.2 + (eIdx % 2) * 1.4;
            if (completeServedOrder(ordIdx, ord, evalResult, emp)) return;
          }
        }
      } else {
        // Pick an unclaimed waiting order (respect player's active selected ticket unless untouched for > 1.5s)
        const waitingOrders = state.orders.filter((o) => o.status === 'waiting');
        let picked = false;
        const prioritized = [
          ...waitingOrders.filter((o) => o.id !== state.selectedOrderId),
          ...waitingOrders.filter(
            (o) =>
              o.id === state.selectedOrderId &&
              state.currentBuild.teaBase === null &&
              o.patienceLeft < o.patienceMax - 1.5,
          ),
        ];

        for (const candidateOrder of prioritized) {
          let staffBuild = buildEmployeeDrinkAttempt(emp, candidateOrder, state, Math.random);
          let check = checkCanCraftDrink(state, staffBuild);
          if (!check.canCraft) {
            const exactBuild: DrinkBuild = {
              teaBase: candidateOrder.recipe.teaBase,
              milk: candidateOrder.recipe.milk,
              topping: candidateOrder.recipe.topping,
              ice: candidateOrder.ice,
              sweetness: candidateOrder.sweetness,
            };
            const exactCheck = checkCanCraftDrink(state, exactBuild);
            if (exactCheck.canCraft) {
              staffBuild = exactBuild;
              check = exactCheck;
            }
          }
          if (check.canCraft) {
            consumeIngredientsForBuild(state, staffBuild);
            candidateOrder.status = 'staff_crafting';
            candidateOrder.sealProgress = 0;
            candidateOrder.assignedEmployeeId = emp.id;
            candidateOrder.staffBuild = staffBuild;
            emp.task = 'crafting';
            emp.assignedOrderId = candidateOrder.id;
            emp.taskTimer = 0;
            picked = true;
            break;
          }
        }

        if (!picked) {
          // If no prep chef is on duty (or idle barista sees critical low supply), assist with auto-refill & pot prep
          const neededRestock = emp.autoRestock ? findNeededAutoRestock(state) : null;
          if (!hasPrepChefOnDuty && neededRestock && state.cash >= neededRestock.cost) {
            emp.task = 'restocking';
            emp.targetX = -2.6;
            emp.targetZ = 4.1;
          } else if (
            !hasPrepChefOnDuty &&
            state.bobaPot.servingsLeft <= 2 &&
            !state.bobaPot.isCooking &&
            state.inventory.rawBoba > 0
          ) {
            emp.task = 'prepping';
            emp.targetX = -4.25;
            emp.targetZ = -2.25;
            if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.35) {
              if (triggerBobaPotCook(state, false)) {
                emp.prepCount += 1;
                emp.dailyPrepCount += 1;
              }
            }
          } else if (
            !hasPrepChefOnDuty &&
            state.teaBrewer.servingsLeft <= 2 &&
            !state.teaBrewer.isCooking
          ) {
            emp.task = 'prepping';
            emp.targetX = -4.25;
            emp.targetZ = -0.25;
            if (Math.hypot(emp.x - emp.targetX, emp.z - emp.targetZ) <= 0.35) {
              if (triggerTeaBrewerCook(state, false)) {
                emp.prepCount += 1;
                emp.dailyPrepCount += 1;
              }
            }
          } else {
            emp.task = 'idle';
            emp.targetX = -1.1;
            emp.targetZ = -2.2 + (eIdx % 2) * 1.4;
          }
        }
      }
    }

    const eMove = moveToward(emp.x, emp.z, emp.targetX, emp.targetZ, 2.9 * effectiveSpeed, dt);
    emp.x = eMove.x;
    emp.z = eMove.z;
    if (!eMove.arrived) {
      emp.facing = eMove.facing;
      emp.walkPhase += dt * 8.5;
    } else {
      emp.facing = emp.task === 'prepping' || emp.task === 'restocking' ? -Math.PI / 2 : Math.PI / 2;
    }
  }

  // 4. Move customers
  for (let i = state.customers.length - 1; i >= 0; i--) {
    const c = state.customers[i];
    const speed = c.state === 'leaving_angry' ? 3.2 : 2.3;
    const step = moveToward(c.x, c.z, c.targetX, c.targetZ, speed, dt);
    c.x = step.x;
    c.z = step.z;
    if (!step.arrived) {
      c.facing = step.facing;
      c.walkPhase += dt * 7.5;
    } else {
      if (c.state === 'entering') {
        c.state = 'waiting_drink';
        c.facing = -Math.PI / 2; // Face counter
      } else if (c.state === 'leaving_happy' || c.state === 'leaving_angry') {
        state.customers.splice(i, 1);
      }
    }
  }

  // 5. Move barista smoothly between stations
  const bMove = moveToward(
    state.barista.x,
    state.barista.z,
    state.barista.targetX,
    state.barista.targetZ,
    3.6,
    dt,
  );
  state.barista.x = bMove.x;
  state.barista.z = bMove.z;
  if (!bMove.arrived) {
    state.barista.facing = bMove.facing;
    state.barista.walkPhase += dt * 9.0;
  } else {
    state.barista.facing = state.barista.task === 'brewing' ? -Math.PI / 2 : Math.PI / 2;
    if (state.barista.task === 'brewing' && !state.bobaPot.isCooking && !state.teaBrewer.isCooking) {
      state.barista.task = 'idle';
      state.barista.targetX = 0.25;
      state.barista.targetZ = -1.1;
    }
  }

  // 6. Check End of Day
  if (
    state.simMinutes >= SHOP_CLOSE_MINUTES ||
    (state.simMinutes >= SHOP_LAST_ORDER_MINUTES && state.orders.length === 0 && activeGuests.length === 0)
  ) {
    if (state.simMinutes >= SHOP_CLOSE_MINUTES || activeGuests.length === 0) {
      finalizeDay(state);
    }
  }
}
