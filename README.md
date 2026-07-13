# Eagle | VR Player

An Eagle window plugin for previewing VR180 and VR360 video on the desktop. Load the video selected in Eagle, drag the image to look around, and verify projection and stereo layout without putting on a headset.

![VR Player preview](docs/vr-player-preview.png)

## Features

- VR180 and VR360 projection modes
- Side-by-side (SBS), top/bottom (TB), and monoscopic video layouts
- Automatically loads the video currently selected in Eagle
- Drag-and-drop support for opening another local video
- View dragging during playback and mouse-wheel zoom
- Automatic format detection from Eagle tags
- Optional format-tag writing, disabled by default and remembered between sessions
- Focus mode for uninterrupted playback and view control
- Controls that fade out when the player is idle
- Recenter feedback that fades out automatically

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
4. Select a video in Eagle and launch **VR Player**.

The build automatically includes `manifest.json` and the distributable `logo.png` in `dist`.

## Controls

| Action | Control |
| --- | --- |
| Look around | Drag the video |
| Zoom | Mouse wheel |
| Play / Pause | `Space` |
| Recenter view | `R` |
| Seek backward / forward | `←` / `→` (5 seconds) |
| Enter focus mode | `F` |
| Exit focus mode | `Esc` |

The controls hide after approximately 2.5 seconds of inactivity and return on pointer, touch, or keyboard input.

## Format Tags

VR Player reads the following Eagle tags when an item loads:

```text
vr:projection=VR180
vr:projection=VR360
vr:mode=SBS
vr:mode=TB
vr:mode=Mono
```

Enable **Write format tags** under **More options** to synchronize the current projection and layout back to the selected Eagle item. This option is off by default.

## Local Preview

Run the development server to preview the interface with the bundled coastal panorama:

```sh
npm run dev
```
