# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product decisions

- The current implementation is the source of truth for the visual direction: an immersive edge-to-edge VR canvas with minimal floating controls.
- Controls should begin fading away after approximately 0.5 seconds of inactivity during video playback and 1.5 seconds while paused, stopped, or viewing an image. They return immediately on pointer, touch, or keyboard activity.
- Keep controls visible while the pointer is over the top bar, playback controls, or their popovers; restart the idle countdown after the pointer leaves.
- View dragging must remain available while video playback is running.
- The plugin display name is `VR Player`.
- Focus mode keeps view dragging available, hides the main controls, and uses an unobtrusive lower-right exit control.
- Reset-view feedback appears only after an explicit reset and then fades out automatically.
- More options contains tag settings and a keyboard shortcut reference that is collapsed by default. When expanded, the shortcut list uses a fixed-height 174px scroll area. More options dismisses on outside click or `Esc`.
- Keep tooltips on Reset view, Loop playback, and Focus mode; Play / Pause, Mute / Unmute, and Exit Focus do not use tooltips.
- The plugin icon uses a clear white `VR` wordmark with an integrated play symbol, a cyan 180-degree arc, and a violet 360-degree orbit. Do not include numeric `180` / `360` labels or a visible outer frame; keep the area outside the rounded tile transparent.
- Keep the editable 1024 × 1024 icon master as `logo-source.png`. The distributable `logo.png` and `dist/logo.png` must be 128 × 128 pixels for Eagle.
- VR still images are previewable alongside videos. Images default to VR180 and Mono when format tags are absent. While an image is open, playback, timeline seeking, and volume controls remain visible but disabled, with no time or `Still image` label.
- In video mode, beginning the first view drag starts playback. This drag-to-play behavior is available only at initial load; after playback is manually controlled or paused, later view drags must not resume it.
- Loop playback is toggled from a transport button positioned immediately to the left of volume or with `L`. It defaults to off and is disabled for still images. The icon shows the current state: repeat-off while disabled and the regular repeat icon while enabled, without using an active accent color. Mute / Unmute uses `M`.
- Disable Tab and Shift+Tab focus traversal in the player. Pressing Tab clears any focused control so global keyboard shortcuts remain available.
- Keep media details out of More options. Show an info icon immediately beside the filename; its popover contains format, resolution, duration for video, and file size.
- Center the `Drag to look around` hint both horizontally and vertically within the VR canvas at every viewport size.
