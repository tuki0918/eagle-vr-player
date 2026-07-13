# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Product decisions

- The selected visual direction is `design-reference/option-1.png`: an immersive edge-to-edge VR canvas with minimal floating controls.
- Controls should fade away after a short idle period and return immediately on pointer, touch, or keyboard activity.
- View dragging must remain available while video playback is running.
- The plugin display name is `VR Player`.
- Focus mode keeps view dragging available, hides the main controls, and uses an unobtrusive lower-right exit control.
- Recenter feedback appears only after an explicit reset and then fades out automatically.
- More options contains tag settings and the keyboard shortcut reference, and dismisses on outside click or `Esc`.
- Keep tooltips on Recenter view and Focus mode; Play / Pause and Exit Focus do not use tooltips.
- The plugin icon uses a clear white `VR` wordmark with an integrated play symbol, a cyan 180-degree arc, and a violet 360-degree orbit. Do not include numeric `180` / `360` labels or a visible outer frame; keep the area outside the rounded tile transparent.
- Keep the editable 1024 × 1024 icon master as `logo-source.png`. The distributable `logo.png` and `dist/logo.png` must be 128 × 128 pixels for Eagle.
- VR still images are previewable alongside videos. Images default to VR180 and Mono when format tags are absent. While an image is open, playback, timeline seeking, and volume controls remain visible but disabled, with no time or `Still image` label.
