const registry = {};

export const registerCallbacks = (id, callbacks) => {
  registry[id] = callbacks;
};

export const invokeCallback = (id, name, ...args) => {
  registry[id]?.[name]?.(...args);
};

export const clearCallbacks = (id) => {
  delete registry[id];
};
