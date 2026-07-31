# Eagle | VR Player

View VR180 and VR360 videos and images on your desktop without a headset. Load the media selected in Eagle and drag the view to look around.

![VR Player preview](docs/vr-player-preview.png)

## Features

- VR180 and VR360 video and image preview
- Optional AI-powered 3D Photo view for ordinary still images
- Side-by-side (SBS), top/bottom (TB), and Mono layouts
- Opens the selected Eagle item or a dropped video or image
- Reads VR format tags and optionally writes them to connected Eagle items
- Drag-to-look, first-drag video playback, mouse-wheel zoom, and looping
- Focus mode and auto-hiding controls

> [!NOTE]
> This player does not support stereoscopic rendering.

## 3D Photo Preview

When a still image is open, choose **3D Photo** to estimate a depth map and add
restrained parallax while dragging. The original file is not modified, and this
view does not change the item's VR projection or stereo tags.

Depth Anything V2 runs locally through Transformers.js. The model is downloaded
and cached on first use; later conversions reuse that model and recent depth
results. When WebGPU is unavailable, the player falls back to a WASM-compatible
model.

## Install for Development

1. Install dependencies:

   ```sh
   npm install
   ```

2. Build the plugin:

   ```sh
   npm run build
   ```

3. In Eagle, open **Plugins → Developer Options** and load the `dist` directory.
4. Select a video or image in Eagle and launch **VR Player**.

The build automatically includes `manifest.json` and the distributable `logo.png` in `dist`.

## Controls

| Action | Control |
| --- | --- |
| Look around | Drag the video |
| Zoom | Mouse wheel |
| Play / Pause | `Space` |
| Mute / Unmute | `M` |
| Toggle loop playback | `L` |
| Reset view | `R` |
| Seek backward / forward | `←` / `→` (5 seconds) |
| Enter focus mode | `F` |
| Exit focus mode | `Esc` |

Controls hide after approximately 0.5 seconds while playing and 1.5 seconds otherwise. Pointer, touch, or keyboard input reveals them, and hovering over the controls keeps them visible.

## VR Format Tags

VR Player reads these VR format tags from connected Eagle items:

```text
vr:projection=VR180
vr:projection=VR360
vr:mode=SBS
vr:mode=TB
vr:mode=Mono
```

**Write format tags** is off by default and remembered between sessions. When enabled, VR Player immediately writes the current projection and layout to the connected Eagle item, then writes both again whenever another item connects or either setting changes. It replaces only `vr:projection=` and `vr:mode=` and preserves all other tags, including custom `vr:*` tags.

> [!NOTE]
> Dropped files play locally. If a file's path exactly matches an item in the current Eagle library, VR Player connects it and can read or write its VR format tags. Otherwise, it remains unlinked.

## Local Preview

Run the development server to preview the interface with the bundled coastal panorama:

```sh
npm run dev
```

Open `/?media=image` on the development server to exercise the still-image state.
