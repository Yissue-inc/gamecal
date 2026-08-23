;(function () {
  'use strict'

  var parentOrigin = window.location.origin
  var context = null
  var contextListeners = []

  function post(type, payload) {
    if (window.parent === window) return
    window.parent.postMessage({ type: type, payload: payload || {} }, parentOrigin)
  }

  window.GamerClockMiniGame = {
    ready: function (payload) { post('MINIGAME_READY', payload) },
    started: function (payload) { post('MINIGAME_STARTED', payload) },
    scoreChanged: function (payload) { post('MINIGAME_SCORE_CHANGED', payload) },
    completed: function (payload) { post('MINIGAME_COMPLETED', payload) },
    error: function (payload) { post('MINIGAME_ERROR', payload) },
    ctaClicked: function (payload) { post('MINIGAME_CTA_CLICKED', payload) },
    onContext: function (listener) {
      contextListeners.push(listener)
      if (context) listener(context)
    },
    getContext: function () { return context },
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== parentOrigin || event.source !== window.parent) return
    if (!event.data || event.data.type !== 'GAMECLOCK_CONTEXT') return
    context = event.data.payload || {}
    contextListeners.forEach(function (listener) { listener(context) })
  })

  ;[120, 500, 1200].forEach(function (delay) {
    window.setTimeout(function () { post('MINIGAME_READY') }, delay)
  })
})()
