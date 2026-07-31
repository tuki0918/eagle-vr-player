import assert from "node:assert/strict";
import test from "node:test";

test("forwards the documented library path when Eagle switches libraries", async () => {
  let handlePluginCreate;
  let handleLibraryChanged;
  const eagleApi = {
    onPluginCreate(callback) {
      handlePluginCreate = callback;
    },
    onLibraryChanged(callback) {
      handleLibraryChanged = callback;
    },
  };
  globalThis.eagle = eagleApi;

  try {
    const moduleUrl = new URL("../src/eagleLifecycle.js", import.meta.url);
    moduleUrl.searchParams.set("test", String(Date.now()));
    const { subscribeToEagleLifecycle } = await import(moduleUrl.href);
    const events = [];
    const unsubscribe = subscribeToEagleLifecycle((event) => events.push(event));
    const plugin = { manifest: { name: "VR Player" } };

    handlePluginCreate(plugin);
    handleLibraryChanged("/Users/test/New.library");
    unsubscribe();

    assert.deepEqual(events, [
      {
        eagle: eagleApi,
        event: "create",
        plugin,
      },
      {
        eagle: eagleApi,
        event: "library-changed",
        plugin,
        libraryPath: "/Users/test/New.library",
      },
    ]);
  } finally {
    delete globalThis.eagle;
  }
});
