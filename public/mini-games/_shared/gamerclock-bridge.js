;(function () {
  'use strict'

  var parentOrigin = window.location.origin
  var context = null
  var contextListeners = []

  function post(type, payload) {
    if (window.parent === window) return
    window.parent.postMessage({ type: type, payload: payload || {} }, parentOrigin)
  }

  function onContext(listener) {
    contextListeners.push(listener)
    if (context) listener(context)
    return function () {
      contextListeners = contextListeners.filter(function (item) { return item !== listener })
    }
  }

  window.GamerClockMiniGame = {
    ready: function (payload) { post('MINIGAME_READY', payload) },
    started: function (payload) { post('MINIGAME_STARTED', payload) },
    scoreChanged: function (payload) { post('MINIGAME_SCORE_CHANGED', payload) },
    completed: function (payload) { post('MINIGAME_COMPLETED', payload) },
    error: function (payload) { post('MINIGAME_ERROR', payload) },
    ctaClicked: function (payload) { post('MINIGAME_CTA_CLICKED', payload) },
    onContext: onContext,
    getContext: function () { return context },
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== parentOrigin || event.source !== window.parent) return
    if (!event.data || event.data.type !== 'GAMECLOCK_CONTEXT') return
    context = event.data.payload || {}
    contextListeners.forEach(function (listener) { listener(context) })
  })

  // An iframe can finish loading before its React parent installs the message
  // listener. Fixed pulses lose that race on a slow mount, and the parent is
  // then stuck on its loading veil over a game that is already running.
  // Keep pulsing until context arrives — the parent only sends it once it is
  // listening, so the arrival of context is the proof that the race is over.
  var readyTimer = window.setInterval(function () {
    if (context) { window.clearInterval(readyTimer); return }
    post('MINIGAME_READY')
  }, 400)
  // Give up after 20s so a standalone/unparented page does not pulse forever.
  window.setTimeout(function () { window.clearInterval(readyTimer) }, 20000)
  post('MINIGAME_READY')
})()
