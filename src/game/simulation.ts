import {
  CUSTOMER_NAMES,
  DAILY_RENT,
  DRINK_MENU,
  MILK_META,
  PERCENT_OPTIONS,
  RESTOCK_PACKS,
  SHIRT_PALETTE,
  SHOP_CLOSE_MINUTES,
  SHOP_LAST_ORDER_MINUTES,
  SHOP_OPEN_MINUTES,
  SHOP_UPGRADES,
  SIM_MINUTES_PER_SECOND,
  TEA_BASE_META,
  TOPPING_META,
} from './catalog';
import type {
  BatchPot,
  CustomerArchetype,
  CustomerEntity,
  DaySummary,
  DrinkBuild,
  DrinkRecipe,
  InventoryStock,
  OrderTicket,
  PercentLevel,
  SimState,
  ShopUpgrades,
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
    freshMilk: 10,
    oatMilk: 6,
    brownSugar: 6,
    cheeseFoam: 6,
    rawBoba: 3,
    crystalBoba: 6,
    lycheeJelly: 6,
    eggPudding: 6,
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

  return {
    phase: autostart ? 'playing' : 'title',
    outcome: 'none',
    endlessMode: false,
    day: 1,
    simMinutes: SHOP_OPEN_MINUTES,
    simElapsed: 0,
    speedMultiplier: 1,
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
    },
    lastDaySummary: null,
    events: [],
    bannerMessage: null,
  };
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
  // Morning warmup 09:00-11:30 -> Lunch rush 11:30-14:15 -> Afternoon chill -> Evening rush 16:00-17:30
  if (simMinutes >= 11 * 60 + 30 && simMinutes <= 14 * 60 + 15) return 1.55;
  if (simMinutes >= 16 * 60 && simMinutes <= 17 * 60 + 20) return 1.45;
  if (simMinutes < 10 * 60) return 0.9;
  return 1.05;
}

export function getAvailableMenu(day: number): DrinkRecipe[] {
  return DRINK_MENU.filter((d) => d.unlockDay <= day);
}

export function getQueueSlotPosition(slot: number): { x: number; z: number } {
  return {
    x: 3.15 + Math.floor(slot / 4) * 1.25,
    z: -2.0 + (slot % 4) * 1.35,
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
  const menu = getAvailableMenu(state.day);
  const recipe = deterministicPick(menu, seq * 7 + state.day * 3);
  const archetype = pickCustomerArchetype(state.day, seq, state.simMinutes);

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
  // Slightly faster pace on later days
  basePatience = Math.max(30, basePatience - (state.day - 1) * 2.5);

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
    carryProp: seq % 4 === 0 ? 'box' : 'none',
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
    price: recipe.basePrice,
    patienceMax: basePatience,
    patienceLeft: basePatience,
    createdAtSim: state.simMinutes,
    status: 'waiting',
    sealProgress: 0,
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

export function startCookBobaBatch(state: SimState): boolean {
  if (state.bobaPot.isCooking) return false;
  if (state.inventory.rawBoba <= 0) {
    state.bannerMessage = 'Out of Raw Tapioca — Restock in Pantry [U]';
    return false;
  }
  state.inventory.rawBoba -= 1;
  state.bobaPot.isCooking = true;
  state.bobaPot.cookProgress = 0;
  state.bobaPot.cookDuration = state.upgrades.dualKettle ? 5.2 : 8.0;
  state.barista.task = 'brewing';
  state.barista.targetX = -4.3;
  state.barista.targetZ = -2.2;
  return true;
}

export function startBrewTeaBatch(state: SimState): boolean {
  if (state.teaBrewer.isCooking) return false;
  state.teaBrewer.isCooking = true;
  state.teaBrewer.cookProgress = 0;
  state.teaBrewer.cookDuration = state.upgrades.espressoInfuser ? 4.0 : 6.0;
  state.barista.task = 'brewing';
  state.barista.targetX = -4.3;
  state.barista.targetZ = -0.3;
  return true;
}

export function startSealingSelectedOrder(state: SimState): CraftCheckResult {
  const order = state.orders.find((o) => o.id === state.selectedOrderId);
  if (!order) {
    return { canCraft: false, reason: 'Select a customer order first' };
  }
  if (order.status === 'sealing') {
    return { canCraft: false, reason: 'Already sealing this cup!' };
  }
  const check = checkCanCraftDrink(state, state.currentBuild);
  if (!check.canCraft) {
    state.bannerMessage = check.reason;
    return check;
  }

  // Consume ingredients up-front as cup is assembled & sealed
  const b = state.currentBuild;
  state.inventory.cups -= 1;
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
  state.dayStats = {
    drinksServed: 0,
    perfectDrinks: 0,
    walkouts: 0,
    revenue: 0,
    tipsEarned: 0,
    restockSpent: 0,
    upgradeSpent: 0,
    reputationStart: state.reputation,
  };
  state.lastDaySummary = null;
  state.bannerMessage = `Day ${state.day} Open — Welcome!`;
}

function finalizeDay(state: SimState): void {
  const rent = DAILY_RENT;
  state.cash = Number((state.cash - rent).toFixed(2));
  const netProfit = Number(
    (
      state.dayStats.revenue +
      state.dayStats.tipsEarned -
      state.dayStats.restockSpent -
      state.dayStats.upgradeSpent -
      rent
    ).toFixed(2),
  );
  const summary: DaySummary = {
    day: state.day,
    drinksServed: state.dayStats.drinksServed,
    perfectDrinks: state.dayStats.perfectDrinks,
    walkouts: state.dayStats.walkouts,
    revenue: Number(state.dayStats.revenue.toFixed(2)),
    tipsEarned: Number(state.dayStats.tipsEarned.toFixed(2)),
    restockSpent: Number(state.dayStats.restockSpent.toFixed(2)),
    upgradeSpent: Number(state.dayStats.upgradeSpent.toFixed(2)),
    rentCost: rent,
    netProfit,
    reputationDelta: Number((state.reputation - state.dayStats.reputationStart).toFixed(2)),
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
  const dt = Math.min(rawDt, 0.05) * state.speedMultiplier;

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
  const maxQueue = 5;
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
        state.spawnCooldown = Math.max(4.5, (10.5 * dayFactor) / rush);
      }
    }
  }

  // 3. Process sealing orders & complete serves
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
        const totalEarn = Number((evalResult.baseEarned + evalResult.tipEarned).toFixed(2));
        state.cash = Number((state.cash + totalEarn).toFixed(2));
        state.reputation = Number(
          Math.max(0, Math.min(5, state.reputation + evalResult.repDelta)).toFixed(2),
        );
        state.totalServed += 1;
        state.dayStats.drinksServed += 1;
        state.dayStats.revenue = Number((state.dayStats.revenue + evalResult.baseEarned).toFixed(2));
        state.dayStats.tipsEarned = Number(
          (state.dayStats.tipsEarned + evalResult.tipEarned).toFixed(2),
        );
        if (evalResult.perfect) {
          state.dayStats.perfectDrinks += 1;
          state.streak += 1;
          state.bestStreak = Math.max(state.bestStreak, state.streak);
        } else {
          state.streak = 0;
        }

        const cust = state.customers.find((c) => c.id === order.customerId);
        if (cust) {
          cust.state = evalResult.accuracy >= 0.7 ? 'leaving_happy' : 'leaving_angry';
          cust.carryProp = 'cup';
          cust.targetX = 8.9;
          cust.targetZ = 3.1;
          pushEvent(state, {
            kind: evalResult.accuracy >= 0.7 ? 'serve' : 'fail',
            text: `+$${totalEarn.toFixed(2)}`,
            subtext: evalResult.feedbackLabel,
            color: evalResult.perfect ? '#218367' : evalResult.accuracy >= 0.7 ? '#b87635' : '#c94c4c',
            worldX: cust.x,
            worldY: 2.6,
            worldZ: cust.z,
          });
        }

        state.orders.splice(i, 1);
        state.selectedOrderId = state.orders[0]?.id ?? null;
        state.currentBuild = createEmptyBuild();
        state.barista.holdingCupColor = null;
        state.barista.task = 'idle';
        state.barista.targetX = 0.25;
        state.barista.targetZ = -1.1;

        if (!state.endlessMode && state.reputation >= 4.8 && state.cash >= 500) {
          state.phase = 'gameover';
          state.outcome = 'victory';
          return;
        }
      }
    } else {
      // Waiting order patience decay
      const cust = state.customers.find((c) => c.id === order.customerId);
      if (cust && cust.state !== 'entering') {
        order.patienceLeft -= dt;
        if (order.patienceLeft <= 0) {
          cust.state = 'leaving_angry';
          cust.targetX = 9.0;
          cust.targetZ = 3.2;
          state.dayStats.walkouts += 1;
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
