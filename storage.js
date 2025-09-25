// Simple wrapper for Firefox storage (promisified)
const Storage = (() => {
  function get(keys) {
    return new Promise(resolve => {
      browser.storage.local.get(keys).then(resolve);
    });
  }
  function set(obj) {
    return new Promise(resolve => {
      browser.storage.local.set(obj).then(resolve);
    });
  }
  return { get, set };
})();