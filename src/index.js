let lastChange = 0;
let currentlySorting = false;

const EVENT_TIME_SPACING = 100;
const TIME_TO_REMOVE = 50;
const itemSelector = '.scroll-list-item';
const sectionSelector = '.scroll-list-section-body';

const {
  identity, countBy, each, find,
} = _;

function log(...args) {
  // eslint-disable-next-line
  console.log(...args);
}

function mapItems(predicate) {
  const items = document.querySelectorAll(itemSelector);
  return [...items].map(item => predicate(item));
}

function sortItems(order) {
  if (!order || Object.keys(order).length === 0 || order.length === 0) {
    return;
  }
  tinysort(itemSelector, {
    sortFunction: (a, b) => {
      const ai = order.indexOf(a.elm.dataset.itemId);
      const bi = order.indexOf(b.elm.dataset.itemId);
      return ai - bi;
    },
  });
}

function getPriorityOrder() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('order', (data) => {
      log('Priority Order', data.order);
      return resolve(data.order);
    });
  });
}

function savePriority(order) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ order }, () => resolve());
  });
}

function getCurrentOrder() {
  const order = mapItems(item => item.dataset.itemId);
  return Promise.resolve(order);
}

function makeSectionSortable(section) {
  Sortable.create(section, {
    draggable: itemSelector,
    onUpdate: () => getCurrentOrder().then(savePriority),
    onStart: () => { currentlySorting = true; },
    onEnd: () => { currentlySorting = false; },
  });
}

function makeItemsSortable() {
  const sections = document.querySelectorAll(sectionSelector);
  [...sections].forEach(makeSectionSortable);
  return Promise.resolve(true);
}

function removeDuplicates() {
  const items = mapItems(identity);
  const counts = countBy(items, item => item.dataset.itemId);
  each(counts, (n, id) => {
    if (n > 1) {
      const child = find(items, item => item.dataset.itemId === id);
      child.parentNode.removeChild(child);
    }
  });
  return Promise.resolve(true);
}

function now() {
  return +new Date();
}

function enoughTimeHasPassed() {
  return now() - lastChange > EVENT_TIME_SPACING;
}

function eventIsItem(e) {
  return e.target.className && e.target.className.indexOf(itemSelector.substring(1)) !== -1;
}

function updateItems(e) {
  if (!currentlySorting && enoughTimeHasPassed() && eventIsItem(e)) {
    lastChange = now();
    setTimeout(() => {
      removeDuplicates().then(getPriorityOrder).then(sortItems);
    }, TIME_TO_REMOVE);
  }
}

function listenForChanges() {
  document.addEventListener('DOMNodeInserted', updateItems, false);
  document.addEventListener('DOMNodeRemoved', updateItems, false);
}

getPriorityOrder()
  .then(sortItems)
  .then(makeItemsSortable)
  .then(listenForChanges);
