/* Persistência local: textos e enquadramento no localStorage,
   foto escolhida no IndexedDB (cabe imagens grandes). */
(function () {
  'use strict';
  var PREFIX = 'acrylicart:';
  var DB_NAME = 'acrylicart-thumb';
  var STORE = 'arquivos';

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB indisponível')); return; }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var r = fn(t.objectStore(STORE));
        t.oncomplete = function () { resolve(r && r.result); db.close(); };
        t.onerror = function () { reject(t.error); db.close(); };
      });
    });
  }

  window.Armazenamento = {
    get: function (k) {
      try { return JSON.parse(localStorage.getItem(PREFIX + k)); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem(PREFIX + k); } catch (e) {}
    },
    getArquivo: function (k) {
      return tx('readonly', function (s) { return s.get(k); }).catch(function () { return null; });
    },
    setArquivo: function (k, v) {
      return tx('readwrite', function (s) { return s.put(v, k); }).catch(function () {});
    },
    delArquivo: function (k) {
      return tx('readwrite', function (s) { return s.delete(k); }).catch(function () {});
    }
  };
})();
