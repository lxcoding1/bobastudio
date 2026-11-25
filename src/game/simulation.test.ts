import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeOfDayPhase,
  MAX_SIM_SPEED,
  MAX_STAFF_LEVEL,
  SHOP_CLOSE_MINUTES,
  STAFF_ROSTER,
} from './catalog';
import {
  advanceToNextDay,
  buildEmployeeDrinkAttempt,
  buyRestockPack,
  buyShopExpansion,
  buyShopUpgrade,
  checkCanCraftDrink,
  createCustomerAndOrder,
  createInitialSimState,
  cycleSimSpeed,
  evaluateDrinkAgainstOrder,
  fireEmployee,
  formatShopClock,
  generateDailyReviews,
  getAvailableMenu,
  getEmployeeAccuracyChance,
  getEmployeeDailyPerformance,
  getExpansionDef,
  getUnlockedMilks,
  getUnlockedTeaBases,
  getUnlockedToppings,
  hireEmployee,
  replyToCustomerReview,
  reviewEmployee,
  setSimSpeed,
  setTipJarMode,
  startBrewTeaBatch,
  startCookBobaBatch,
  startSealingSelectedOrder,
  stepSimulation,
  tipEmployee,
  toggleEmployeeAutoRestock,
  toggleEmployeeDuty,
  trainEmployee,
  tryEmployeeAutoRestock,
  unlockResearch,
} from './simulation';

test('formats shop clock accurately', () => {
  assert.equal(formatShopClock(540), '9:00 AM');
  assert.equal(formatShopClock(750), '12:30 PM');
  assert.equal(formatShopClock(1080), '6:00 PM');
  assert.equal(formatShopClock(1260), '9:00 PM');
});

test('time of day transitions cleanly from morning through night', () => {
  assert.equal(getTimeOfDayPhase(540).label, 'Morning');
  assert.equal(getTimeOfDayPhase(780).label, 'Afternoon');
  assert.equal(getTimeOfDayPhase(1020).label, 'Sunset');
  assert.equal(getTimeOfDayPhase(1110).label, 'Dusk');
  assert.equal(getTimeOfDayPhase(1230).label, 'Night');
  assert.equal(getTimeOfDayPhase(540).progress, 0);
  assert.equal(getTimeOfDayPhase(SHOP_CLOSE_MINUTES).progress, 1);
});

test('spawns first customer and creates selectable order when playing', () => {
  const state = createInitialSimState(true);
  assert.equal(state.phase, 'playing');
  for (let i = 0; i < 60; i++) {
    stepSimulation(state, 0.05);
  }
  assert.ok(state.customers.length >= 1, 'Expected at least 1 customer after 3s');
  assert.ok(state.orders.length >= 1, 'Expected at least 1 order ticket');
  assert.equal(state.selectedOrderId, state.orders[0].id);
});

test('exact drink build scores 100% accuracy and pays tip bonus', () => {
  const state = createInitialSimState(true);
  const { order } = createCustomerAndOrder(state, 0);
  const build = {
    teaBase: order.recipe.teaBase,
    milk: order.recipe.milk,
    topping: order.recipe.topping,
    ice: order.ice,
    sweetness: order.sweetness,
  };
  const evalPerfect = evaluateDrinkAgainstOrder(order, build, 95, state.upgrades);
  assert.equal(evalPerfect.perfect, true);
  assert.equal(evalPerfect.accuracy, 1);
  assert.ok(evalPerfect.tipEarned > 0);
  assert.ok(evalPerfect.repDelta > 0);

  const evalWrong = evaluateDrinkAgainstOrder(
    order,
    { ...build, teaBase: order.recipe.teaBase === 'assam' ? 'taro' : 'assam', topping: 'none' },
    95,
    state.upgrades,
  );
  assert.equal(evalWrong.perfect, false);
  assert.ok(evalWrong.accuracy < 0.5);
  assert.ok(evalWrong.repDelta < 0);
});

test('crafting consumes inventory and completes sealing to earn cash', () => {
  const state = createInitialSimState(true);
  const { customer, order } = createCustomerAndOrder(state, 0);
  customer.state = 'waiting_drink';
  customer.x = customer.targetX;
  customer.z = customer.targetZ;
  state.customers.push(customer);
  state.orders.push(order);
  state.nextTicketNumber += 1;
  state.nextCustomerSeq += 1;
  state.selectedOrderId = order.id;

  state.currentBuild = {
    teaBase: order.recipe.teaBase,
    milk: order.recipe.milk,
    topping: order.recipe.topping,
    ice: order.ice,
    sweetness: order.sweetness,
  };

  const cupsBefore = state.inventory.cups;
  const cashBefore = state.cash;
  const check = checkCanCraftDrink(state, state.currentBuild);
  assert.equal(check.canCraft, true);

  const sealRes = startSealingSelectedOrder(state);
  assert.equal(sealRes.canCraft, true);
  assert.equal(state.inventory.cups, cupsBefore - 1);
  assert.equal(order.status, 'sealing');

  // Step through seal duration (1.05s)
  for (let i = 0; i < 30; i++) {
    stepSimulation(state, 0.05);
  }

  assert.equal(state.orders.some((o) => o.id === order.id), false);
  assert.ok(state.cash > cashBefore);
  assert.equal(state.totalServed, 1);
});

test('batch boba cooking and tea brewing replenish servings and freshness', () => {
  const state = createInitialSimState(true);
  state.employees.forEach((e) => {
    e.onDuty = false;
  });
  state.bobaPot.servingsLeft = 0;
  state.bobaPot.freshness = 10;
  const rawBefore = state.inventory.rawBoba;

  assert.equal(startCookBobaBatch(state), true);
  assert.equal(state.inventory.rawBoba, rawBefore - 1);
  assert.equal(state.bobaPot.isCooking, true);

  for (let i = 0; i < 200; i++) {
    stepSimulation(state, 0.05);
  }
  assert.equal(state.bobaPot.isCooking, false);
  assert.equal(state.bobaPot.servingsLeft, state.bobaPot.maxServings);
  assert.ok(state.bobaPot.freshness > 90);

  state.teaBrewer.servingsLeft = 0;
  assert.equal(startBrewTeaBatch(state), true);
  for (let i = 0; i < 150; i++) {
    stepSimulation(state, 0.05);
  }
  assert.equal(state.teaBrewer.servingsLeft, state.teaBrewer.maxServings);
});

test('restocking, upgrading, and day transition update state cleanly', () => {
  const state = createInitialSimState(true);
  const cupsBefore = state.inventory.cups;
  assert.equal(buyRestockPack(state, 'pack_cups'), true);
  assert.equal(state.inventory.cups, cupsBefore + 24);
  assert.equal(state.cash, 138);

  assert.equal(buyShopUpgrade(state, 'dualKettle'), true);
  assert.equal(state.upgrades.dualKettle, true);
  assert.equal(state.bobaPot.maxServings, 20);

  advanceToNextDay(state);
  assert.equal(state.day, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.simMinutes, 540);
});

test('starts with one employee, supports 5 training levels, tipping, reviewing & daily wages', () => {
  const state = createInitialSimState(true);
  // Starts with 1 employee (Lin)
  assert.equal(state.employees.length, 1);
  const lin = state.employees[0];
  assert.equal(lin.candidateId, 'staff_lin');
  assert.equal(lin.skillLevel, 1);

  state.cash = 800;
  // Hire Mateo into 2nd slot; base kiosk max staff slots = 2 so 3rd hire fails until expanded
  assert.equal(hireEmployee(state, 'staff_mateo'), true);
  assert.equal(state.employees.length, 2);
  assert.equal(hireEmployee(state, 'staff_yuna'), false);

  // Train Lin through Lv.2 -> Lv.5 max and verify speed increases cleanly
  const baseSpeed = lin.speed;
  for (let expectedLevel = 2; expectedLevel <= MAX_STAFF_LEVEL; expectedLevel++) {
    assert.equal(trainEmployee(state, lin.id), true);
    assert.equal(lin.skillLevel, expectedLevel);
  }
  assert.ok(lin.speed > baseSpeed * 1.7);
  // Cannot train past Lv.5
  assert.equal(trainEmployee(state, lin.id), false);

  // Tip & Review options update morale, tipsReceived, and lastReview
  lin.morale = 60;
  assert.equal(tipEmployee(state, lin.id, 15), true);
  assert.equal(lin.tipsReceived, 15);
  assert.equal(lin.morale, 84);
  assert.equal(reviewEmployee(state, lin.id, 5, 'Praise', 'Fast & friendly counter work!'), true);
  assert.equal(lin.lastReview?.rating, 5);
  assert.equal(lin.morale, 94);

  // Trigger prep_chef auto-brewing when tea runs low & auto-crafting waiting orders
  state.teaBrewer.servingsLeft = 2;
  const { customer, order } = createCustomerAndOrder(state, 0);
  customer.state = 'waiting_drink';
  order.patienceLeft = order.patienceMax - 3;
  state.customers.push(customer);
  state.orders.push(order);
  state.nextTicketNumber += 1;
  state.nextCustomerSeq += 1;
  state.selectedOrderId = order.id;

  const servedBefore = state.totalServed;
  for (let i = 0; i < 160; i++) {
    stepSimulation(state, 0.05);
  }
  assert.ok(state.totalServed > servedBefore, 'Staff barista should craft & serve orders automatically');
  assert.ok(lin.drinksCrafted >= 1);

  // Toggle duty & verify wages deducted in DaySummary
  assert.equal(toggleEmployeeDuty(state, lin.id), true);
  assert.equal(lin.onDuty, false);

  state.simMinutes = SHOP_CLOSE_MINUTES - 1;
  for (let i = 0; i < 10; i++) {
    stepSimulation(state, 0.05);
  }
  assert.equal(state.phase, 'day_end');
  assert.ok(state.lastDaySummary);
  assert.equal(state.lastDaySummary.wagesCost, 18); // Only Mateo onDuty ($18)

  assert.equal(fireEmployee(state, lin.id), true);
  assert.equal(state.employees.length, 1);
});

test('shop expansion unlocks larger queue and staff capacity sequentially', () => {
  const state = createInitialSimState(true);
  state.cash = 500;
  // Cannot skip directly to level 2
  assert.equal(buyShopExpansion(state, 2), false);
  assert.equal(buyShopExpansion(state, 1), true);
  assert.equal(state.expansionLevel, 1);
  assert.equal(state.maxStaffSlots, 3);
  assert.equal(getExpansionDef(1).maxQueue, 7);

  assert.equal(buyShopExpansion(state, 2), true);
  assert.equal(state.expansionLevel, 2);
  assert.equal(state.maxStaffSlots, 4);
  assert.equal(getExpansionDef(2).maxQueue, 9);
});

test('daily summary report generates customer reviews reflecting drink and wait satisfaction', () => {
  const visits = [
    {
      customerName: 'Kenji',
      archetype: 'student' as const,
      drinkName: 'Classic Pearl Milk Tea',
      accuracy: 1,
      waitRatio: 0.18,
      walkedOut: false,
      bobaFreshness: 95,
      staffName: 'Lin',
    },
    {
      customerName: 'Mina',
      archetype: 'critic' as const,
      drinkName: 'Uji Matcha Cloud',
      accuracy: 1,
      waitRatio: 0.78,
      walkedOut: false,
      bobaFreshness: 90,
      staffName: null,
    },
    {
      customerName: 'Devon',
      archetype: 'office' as const,
      drinkName: 'Brown Sugar Boba Latte',
      accuracy: 0.65,
      waitRatio: 0.4,
      walkedOut: false,
      bobaFreshness: 80,
      staffName: null,
    },
    {
      customerName: 'Chloe',
      archetype: 'foodie' as const,
      drinkName: 'Roasted Oolong Oat',
      accuracy: 0,
      waitRatio: 1,
      walkedOut: true,
      bobaFreshness: 75,
      staffName: null,
    },
  ];

  const reviews = generateDailyReviews(visits, 1, 4.1, () => 0.25);
  assert.equal(reviews.length, 4);

  const kenji = reviews.find((r) => r.customerName === 'Kenji');
  assert.ok(kenji);
  assert.equal(kenji.stars, 5);
  assert.equal(kenji.waitMood, 'Fast service');
  assert.equal(kenji.drinkMood, 'Perfect & fresh');

  const mina = reviews.find((r) => r.customerName === 'Mina');
  assert.ok(mina);
  assert.equal(mina.stars, 3);
  assert.equal(mina.waitMood, 'Slow line');

  const chloe = reviews.find((r) => r.customerName === 'Chloe');
  assert.ok(chloe);
  assert.equal(chloe.stars, 1);
  assert.equal(chloe.waitMood, 'Walked out');
  assert.equal(chloe.drinkMood, 'Left empty-handed');

  // Verify live simulation populates visitLog & reviews at finalizeDay
  const state = createInitialSimState(true);
  state.dayStats.visitLog.push(visits[0], visits[3]);
  state.simMinutes = SHOP_CLOSE_MINUTES - 1;
  for (let i = 0; i < 10; i++) {
    stepSimulation(state, 0.05);
  }
  assert.equal(state.phase, 'day_end');
  assert.ok(state.lastDaySummary);
  assert.equal(state.lastDaySummary.reviews.length, 2);

  // Verify customer review reply & voucher action updates reputation
  const repBefore = state.reputation;
  assert.equal(
    replyToCustomerReview(state, state.lastDaySummary.reviews[0].id, 'voucher'),
    true,
  );
  assert.ok(state.reputation > repBefore);
});

test('supports speed up to 10x, tip jar presets, and distinct employee appearances', () => {
  const state = createInitialSimState(true);
  assert.equal(setSimSpeed(state, 99), MAX_SIM_SPEED);
  assert.equal(state.speedMultiplier, 10);
  assert.equal(setSimSpeed(state, 0), 1);
  assert.equal(cycleSimSpeed(state), 2);
  assert.equal(cycleSimSpeed(state), 5);
  assert.equal(cycleSimSpeed(state), 10);
  assert.equal(cycleSimSpeed(state), 1);

  setSimSpeed(state, 10);
  const startMin = state.simMinutes;
  stepSimulation(state, 0.05); // 0.05 * 10 = 0.5 sim sec => +2.0 simMinutes
  assert.equal(state.simMinutes - startMin, 2.0);

  setTipJarMode(state, 'generous');
  assert.equal(state.tipJarMode, 'generous');

  // Verify all staff candidates have distinct hair styles and shirt colors
  const styles = new Set(STAFF_ROSTER.map((s) => s.appearance.hairStyle));
  const shirts = new Set(STAFF_ROSTER.map((s) => s.shirtColor));
  assert.equal(styles.size, STAFF_ROSTER.length);
  assert.equal(shirts.size, STAFF_ROSTER.length);
});

test('research system unlocks specialty ingredients and expands drink menu', () => {
  const state = createInitialSimState(true);
  state.cash = 350;
  const baseMenuCount = getAvailableMenu(1, state.unlockedResearch).length;
  assert.equal(getUnlockedTeaBases(state.unlockedResearch).includes('passionfruit'), false);
  assert.equal(getUnlockedToppings(state.unlockedResearch).includes('popping_boba'), false);

  assert.equal(unlockResearch(state, 'res_fruit_tea'), true);
  assert.equal(unlockResearch(state, 'res_fruit_tea'), false); // Cannot unlock twice
  assert.equal(state.inventory.passionfruitSyrup, 8);
  assert.equal(state.inventory.poppingBoba, 8);
  assert.equal(getUnlockedTeaBases(state.unlockedResearch).includes('passionfruit'), true);
  assert.equal(getUnlockedToppings(state.unlockedResearch).includes('popping_boba'), true);
  assert.ok(getAvailableMenu(1, state.unlockedResearch).length > baseMenuCount);

  assert.equal(unlockResearch(state, 'res_thai_spice'), true);
  assert.equal(getUnlockedMilks(state.unlockedResearch).includes('coconut_cream'), true);
  assert.equal(state.inventory.thaiTeaLeaf, 8);
  assert.equal(state.inventory.coconutCream, 8);
});

test('employee drink accuracy scales with training and allows occasional apprentice mistakes', () => {
  const state = createInitialSimState(true);
  const lin = state.employees[0];
  const { order } = createCustomerAndOrder(state, 0);

  const lv1Acc = getEmployeeAccuracyChance(lin, 1, false);
  assert.ok(lv1Acc < 0.85, `Expected Lv.1 accuracy < 85%, got ${lv1Acc}`);

  // When RNG exceeds lv1Acc (e.g. 0.92), Lv.1 barista makes a realistic slip
  const slippedBuild = buildEmployeeDrinkAttempt(lin, order, state, () => 0.92);
  const evalSlip = evaluateDrinkAgainstOrder(order, slippedBuild, 95, state.upgrades);
  assert.equal(evalSlip.perfect, false);

  // Train Lin to Lv.5 -> accuracy rises near 98.5%+
  state.cash = 500;
  for (let l = 2; l <= MAX_STAFF_LEVEL; l++) {
    trainEmployee(state, lin.id);
  }
  const lv5Acc = getEmployeeAccuracyChance(lin, 1, false);
  assert.ok(lv5Acc > 0.96, `Expected Lv.5 accuracy > 96%, got ${lv5Acc}`);

  const masterBuild = buildEmployeeDrinkAttempt(lin, order, state, () => 0.92);
  const evalMaster = evaluateDrinkAgainstOrder(order, masterBuild, 95, state.upgrades);
  assert.equal(evalMaster.perfect, true);
});

test('employees auto-refill low inventory and fulfill refill orders', () => {
  const state = createInitialSimState(true);
  state.cash = 200;
  assert.equal(hireEmployee(state, 'staff_mateo'), true);
  const mateo = state.employees.find((e) => e.candidateId === 'staff_mateo')!;
  const lin = state.employees[0];

  // Low cups triggers Mateo auto-refill
  state.inventory.cups = 2;
  assert.equal(tryEmployeeAutoRestock(state, mateo), true);
  assert.ok(state.inventory.cups >= 18);

  // Toggling autoRestock off pauses auto-refilling for that employee
  state.inventory.cups = 2;
  assert.equal(toggleEmployeeAutoRestock(state, mateo.id), true);
  assert.equal(mateo.autoRestock, false);
  assert.equal(tryEmployeeAutoRestock(state, mateo), false);

  // Wholesale research cuts refill cost by 25% & boosts cups batch size
  assert.equal(toggleEmployeeAutoRestock(state, mateo.id), true);
  assert.equal(unlockResearch(state, 'res_wholesale_sync'), true);
  const cashBeforeWholesaleRefill = state.cash;
  state.inventory.cups = 2;
  assert.equal(tryEmployeeAutoRestock(state, mateo), true);
  assert.equal(Number((cashBeforeWholesaleRefill - state.cash).toFixed(2)), 5.25);

  // Periodic refill order (seq = 5 => isRefill: true at 65% price) and barista fulfillment
  state.nextCustomerSeq = 5;
  const { customer: refillCust, order: refillOrder } = createCustomerAndOrder(state, 0);
  assert.equal(refillOrder.isRefill, true);
  assert.equal(refillOrder.price, Number((refillOrder.recipe.basePrice * 0.65).toFixed(2)));
  refillCust.state = 'waiting_drink';
  refillOrder.patienceLeft = refillOrder.patienceMax - 3;
  state.customers.push(refillCust);
  state.orders.push(refillOrder);
  state.selectedOrderId = refillOrder.id;

  const craftedBefore = lin.drinksCrafted;
  for (let i = 0; i < 160; i++) {
    stepSimulation(state, 0.05);
  }
  assert.ok(lin.drinksCrafted > craftedBefore, 'Barista should craft and serve refill orders');
});

test('computes daily employee performance log metrics and resets daily counters between days', () => {
  const state = createInitialSimState(true);
  const lin = state.employees[0];
  lin.dailyDrinksServed = 5;
  lin.dailyErrors = 1;
  lin.drinksCrafted = 12;

  const day1Perf = getEmployeeDailyPerformance(lin, 4);
  assert.equal(day1Perf.drinksServedToday, 5);
  assert.equal(day1Perf.errorsToday, 1);
  assert.equal(day1Perf.observedErrorRatePct, 20.0);
  assert.ok(day1Perf.rushErrorPenaltyPct > 0, 'Queue of 4 should report rush penalty');
  assert.ok(day1Perf.effectiveSpeed > lin.speed, '80% morale grants slight positive speed multiplier');
  assert.ok(day1Perf.reasonSummary.includes('Apprentice'));

  // Training & tipping improves speed and reduces expected error rate
  state.cash = 300;
  trainEmployee(state, lin.id);
  tipEmployee(state, lin.id, 15);
  const improvedPerf = getEmployeeDailyPerformance(lin, 1);
  assert.ok(improvedPerf.effectiveSpeed > day1Perf.effectiveSpeed);
  assert.ok(improvedPerf.expectedErrorRatePct < day1Perf.expectedErrorRatePct);

  // Next day resets daily counters while keeping career total
  advanceToNextDay(state);
  assert.equal(lin.dailyDrinksServed, 0);
  assert.equal(lin.dailyErrors, 0);
  assert.equal(lin.drinksCrafted, 12);
});


