import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceToNextDay,
  buyRestockPack,
  buyShopUpgrade,
  checkCanCraftDrink,
  createCustomerAndOrder,
  createInitialSimState,
  evaluateDrinkAgainstOrder,
  formatShopClock,
  startBrewTeaBatch,
  startCookBobaBatch,
  startSealingSelectedOrder,
  stepSimulation,
} from './simulation';

test('formats shop clock accurately', () => {
  assert.equal(formatShopClock(540), '9:00 AM');
  assert.equal(formatShopClock(750), '12:30 PM');
  assert.equal(formatShopClock(1080), '6:00 PM');
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
