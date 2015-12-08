let lastChange = 0
let currentlySorting = false

const EVENT_TIME_SPACING = 100
const TIME_TO_REMOVE = 50

const {
  identity, countBy, each, find
} = _

function mapItems(predicate) {
  const items = document.getElementsByClassName('top-level-item')
  let results = []
  for (let i = 0; i < items.length; i++) {
    results.push(predicate(items[i]))
  }
  return results
}

function sortItems(order) {
  if (!order || Object.keys(order).length === 0 || order.length === 0) {
    return
  }
  tinysort('.top-level-item', {
    sortFunction: (a, b) => {
      const ai = order.indexOf(a.elm.dataset.itemId)
      const bi = order.indexOf(b.elm.dataset.itemId)
      return ai - bi
    }
  })
}

function getPriorityOrder() {
  return new Promise(resolve => {
    chrome.storage.sync.get('order', data => resolve(data.order))
  })
}

function savePriority(order) {
  return new Promise(resolve => {
    chrome.storage.sync.set({
      order
    }, () => resolve())
  })
}

function getCurrentOrder() {
  const order = mapItems(item => item.dataset.itemId)
  return Promise.resolve(order)
}

function makeItemsSortable() {
  const list = document.getElementsByClassName('scroll-list-section-body')[0]
  Sortable.create(list, {
    draggable: '.top-level-item',
    onUpdate: () => getCurrentOrder().then(savePriority),
    onStart: () => currentlySorting = true,
    onEnd: () => currentlySorting = false
  })
  return Promise.resolve(true)
}

function removeDuplicates() {
  const items = mapItems(identity)
  const counts = countBy(items, item => item.dataset.itemId)
  each(counts, (n, id) => {
    if (n > 1) {
      const child = find(items, item => item.dataset.itemId === id)
      child.parentNode.removeChild(child)
    }
  })
  return Promise.resolve(true)
}

function now() {
  return +new Date()
}

function enoughTimeHasPassed() {
  return now() - lastChange > EVENT_TIME_SPACING
}

function eventIsItem(e) {
  return e.target.className && e.target.className.indexOf('top-level-item') !== -1
}

function updateItems(e) {
  if (!currentlySorting && enoughTimeHasPassed() && eventIsItem(e)) {
    lastChange = now()
    setTimeout(() => {
      removeDuplicates().then(getPriorityOrder).then(sortItems)
    }, TIME_TO_REMOVE)
  }
}

function listenForChanges() {
  document.addEventListener('DOMNodeInserted', updateItems, false)
  document.addEventListener('DOMNodeRemoved', updateItems, false)
}

getPriorityOrder().then(sortItems).then(makeItemsSortable).then(listenForChanges)
