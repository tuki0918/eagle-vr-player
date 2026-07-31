import assert from "node:assert/strict";
import test from "node:test";

import { getEagleItemMediaSource } from "../src/eagleMediaSource.js";

test("accepts Eagle file URLs with encoded reserved characters", () => {
  const fileURL =
    "file:///Users/test/VR.library/images/ABC.info/VR%20%231%3F%20100%25%20caf%C3%A9.mp4";

  assert.equal(
    getEagleItemMediaSource({
      filePath:
        "/Users/test/VR.library/images/ABC.info/VR #1? 100% café.mp4",
      fileURL,
    }),
    fileURL,
  );
});

test("accepts Windows drive and UNC file URLs from Eagle", () => {
  const windowsFileURL =
    "file:///C:/Users/test/VR.library/images/ABC.info/panorama.mp4";
  const uncFileURL =
    "file://server/share/VR.library/images/ABC.info/panorama.mp4";

  assert.equal(
    getEagleItemMediaSource({
      filePath:
        "C:\\Users\\test\\VR.library\\images\\ABC.info\\panorama.mp4",
      fileURL: windowsFileURL,
    }),
    windowsFileURL,
  );
  assert.equal(
    getEagleItemMediaSource({
      filePath:
        "\\\\server\\share\\VR.library\\images\\ABC.info\\panorama.mp4",
      fileURL: uncFileURL,
    }),
    uncFileURL,
  );
});

test("rejects missing, remote, or ambiguous Eagle file URLs", () => {
  const filePath =
    "/Users/test/VR.library/images/ABC.info/panorama.mp4";

  assert.equal(getEagleItemMediaSource(), null);
  assert.equal(getEagleItemMediaSource({ filePath }), null);
  assert.equal(getEagleItemMediaSource({ filePath, fileURL: "" }), null);
  assert.equal(
    getEagleItemMediaSource({
      filePath,
      fileURL: "https://example.com/panorama.mp4",
    }),
    null,
  );
  assert.equal(
    getEagleItemMediaSource({
      filePath,
      fileURL: "file:///Users/test/panorama.mp4?alternate=true",
    }),
    null,
  );
  assert.equal(
    getEagleItemMediaSource({
      filePath,
      fileURL: "file:///Users/test/panorama.mp4#alternate",
    }),
    null,
  );
  assert.equal(
    getEagleItemMediaSource({
      filePath,
      fileURL: "not a URL",
    }),
    null,
  );
});
