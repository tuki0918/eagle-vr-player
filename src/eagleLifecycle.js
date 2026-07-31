const eagleApi = globalThis.eagle;
const listeners = new Set();

let pluginCreated = false;
let pluginContext = null;

function notifyListeners(event, details = {}) {
  for (const listener of listeners) {
    listener({ eagle: eagleApi, event, plugin: pluginContext, ...details });
  }
}

if (eagleApi?.onPluginCreate) {
  eagleApi.onPluginCreate((plugin) => {
    pluginCreated = true;
    pluginContext = plugin;
    notifyListeners("create");
  });

  eagleApi.onPluginRun?.(() => {
    if (pluginCreated) notifyListeners("run");
  });

  eagleApi.onLibraryChanged?.((libraryPath) => {
    if (pluginCreated) notifyListeners("library-changed", { libraryPath });
  });
}

export function subscribeToEagleLifecycle(listener) {
  if (!eagleApi?.onPluginCreate) return () => {};

  listeners.add(listener);

  // React may mount after Eagle has already dispatched plugin-create.
  if (pluginCreated) {
    listener({ eagle: eagleApi, event: "mounted", plugin: pluginContext });
  }

  return () => listeners.delete(listener);
}
