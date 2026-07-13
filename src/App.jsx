import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair } from "@phosphor-icons/react/Crosshair";
import { DotsThree } from "@phosphor-icons/react/DotsThree";
import { FileVideo } from "@phosphor-icons/react/FileVideo";
import { HandGrabbing } from "@phosphor-icons/react/HandGrabbing";
import { Pause } from "@phosphor-icons/react/Pause";
import { Play } from "@phosphor-icons/react/Play";
import { SpeakerHigh } from "@phosphor-icons/react/SpeakerHigh";
import { SpeakerSlash } from "@phosphor-icons/react/SpeakerSlash";
import * as THREE from "three";
import { subscribeToEagleLifecycle } from "./eagleLifecycle.js";
import { buildFormatTags, detectFormatFromTags } from "./formatTags.js";
import { detectMediaType } from "./mediaType.js";

const DEMO_DURATION = 236;
const IDLE_DELAY = 500;
const RECENTER_FEEDBACK_DURATION = 900;
const WRITE_TAGS_SETTING_KEY = "eagle-vr-player.write-format-tags.v1";
const IS_IMAGE_DEMO =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get("media") === "image";

function getInitialWriteTagsSetting() {
  try {
    return window.localStorage.getItem(WRITE_TAGS_SETTING_KEY) === "true";
  } catch {
    return false;
  }
}

function createViewportGeometry(projection) {
  const isVr180 = projection === "VR180";
  const geometry = new THREE.SphereGeometry(
    100,
    72,
    48,
    0,
    isVr180 ? Math.PI : Math.PI * 2,
  );
  geometry.scale(-1, 1, 1);
  geometry.userData.projection = projection;
  return geometry;
}

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function FormatIcon({ type }) {
  if (type === "VR180") {
    return (
      <svg className="format-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 17a8 8 0 0 1 16 0" />
        <path d="M4 17h16" />
        <path d="M12 9v8" />
      </svg>
    );
  }

  if (type === "VR360") {
    return (
      <svg className="format-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" />
        <path d="M4.5 12h15M12 4.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M12 4.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5" />
      </svg>
    );
  }

  return (
    <svg className="format-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      {type === "SBS" && <path d="M12 5v14" />}
      {type === "TB" && <path d="M3.5 12h17" />}
    </svg>
  );
}

function FocusModeIcon() {
  return (
    <svg className="focus-mode-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  );
}

function ShortcutTooltip({ id, label, shortcut }) {
  return (
    <span className="shortcut-tooltip" id={id} role="tooltip">
      <span>{label}</span>
      <kbd>{shortcut}</kbd>
    </span>
  );
}

function FormatToggleGroup({ label, value, onChange, options, tabbable }) {
  return (
    <div className="format-toggle-group" role="radiogroup" aria-label={label}>
      {options.map((option, optionIndex) => {
        const isSelected = value === option.value;
        return (
          <button
            className={`format-toggle-button${isSelected ? " is-selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            tabIndex={tabbable && isSelected ? 0 : -1}
            key={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowRight" || event.key === "ArrowDown"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!direction && event.key !== "Home" && event.key !== "End") return;

              event.preventDefault();
              event.stopPropagation();
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? options.length - 1
                    : (optionIndex + direction + options.length) % options.length;
              onChange(options[nextIndex].value);
              event.currentTarget.parentElement?.children[nextIndex]?.focus();
            }}
          >
            <FormatIcon type={option.icon} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function VrViewport({
  videoRef,
  mediaSource,
  mediaType,
  projection,
  stereo,
  recenterSignal,
  onInteraction,
  onDragStateChange,
  onFirstDrag,
  onImageLoaded,
  onMediaError,
}) {
  const hostRef = useRef(null);
  const cameraRef = useRef(null);
  const sphereRef = useRef(null);
  const textureRef = useRef(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const projectionRef = useRef(projection);
  const stereoRef = useRef(stereo);
  const interactionRef = useRef(onInteraction);
  const dragStateRef = useRef(onDragStateChange);
  const firstDragRef = useRef(onFirstDrag);
  const imageLoadedRef = useRef(onImageLoaded);
  const mediaErrorRef = useRef(onMediaError);

  useEffect(() => {
    projectionRef.current = projection;
    stereoRef.current = stereo;
    interactionRef.current = onInteraction;
    dragStateRef.current = onDragStateChange;
    firstDragRef.current = onFirstDrag;
    imageLoadedRef.current = onImageLoaded;
    mediaErrorRef.current = onMediaError;
  }, [onDragStateChange, onFirstDrag, onImageLoaded, onInteraction, onMediaError, projection, stereo]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    let sourceVideo = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(76, 1, 0.1, 220);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "vr-canvas";
    renderer.domElement.setAttribute(
      "aria-label",
      `${mediaType === "image" ? "VR image" : "VR video"}. Drag to look around.`,
    );
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.dataset.mediaType = mediaType;
    renderer.domElement.dataset.projection = projectionRef.current;
    renderer.domElement.dataset.geometryCoverage = projectionRef.current === "VR180" ? "180" : "360";
    host.appendChild(renderer.domElement);

    const geometry = createViewportGeometry(projectionRef.current);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);
    sphereRef.current = sphere;
    scene.add(sphere);

    const configureStereo = (texture) => {
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
      if (stereoRef.current === "SBS") {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.repeat.x = 0.5;
      } else if (stereoRef.current === "Top/Bottom") {
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.repeat.y = 0.5;
        texture.offset.y = 0.5;
      }
      texture.needsUpdate = true;
    };

    const attachVideoTexture = () => {
      if (
        disposed ||
        !sourceVideo ||
        sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !sourceVideo.videoWidth ||
        !sourceVideo.videoHeight
      ) {
        return;
      }

      const videoTexture = new THREE.VideoTexture(sourceVideo);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      configureStereo(videoTexture);
      textureRef.current = videoTexture;
      material.map = videoTexture;
      material.needsUpdate = true;
      renderer.domElement.dataset.videoTexture = "ready";
    };

    const loadTexture = () => {
      if (mediaType === "video" && mediaSource && videoRef.current) {
        sourceVideo = videoRef.current;
        if (
          sourceVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          sourceVideo.videoWidth &&
          sourceVideo.videoHeight
        ) {
          attachVideoTexture();
        } else {
          renderer.domElement.dataset.videoTexture = "waiting";
          sourceVideo.addEventListener("loadeddata", attachVideoTexture, { once: true });
        }
        return;
      }

      const textureSource = mediaType === "image" && mediaSource
        ? mediaSource
        : "./assets/coastal-panorama.png";
      new THREE.TextureLoader().load(
        textureSource,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          configureStereo(texture);
          textureRef.current = texture;
          material.map = texture;
          material.needsUpdate = true;
          renderer.domElement.dataset.imageTexture = "ready";

          if (mediaType === "image" && mediaSource) {
            const image = texture.image;
            imageLoadedRef.current?.({
              width: image?.naturalWidth || image?.width || 0,
              height: image?.naturalHeight || image?.height || 0,
            });
          }
        },
        undefined,
        () => {
          if (!disposed) mediaErrorRef.current?.("This image format cannot be decoded.");
        },
      );
    };

    loadTexture();

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };

    const render = () => {
      const phi = THREE.MathUtils.degToRad(90 - pitchRef.current);
      const theta = THREE.MathUtils.degToRad(yawRef.current);
      const target = new THREE.Vector3(
        100 * Math.sin(phi) * Math.sin(theta),
        100 * Math.cos(phi),
        100 * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    renderer.setAnimationLoop(render);

    const drag = { active: false, x: 0, y: 0 };
    const pointerDown = (event) => {
      if (event.button !== 0) return;
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add("is-dragging");
      dragStateRef.current(true);
      firstDragRef.current();
      interactionRef.current();
    };
    const pointerMove = (event) => {
      if (!drag.active) return;
      const sensitivity = 0.115 * (camera.fov / 76);
      const nextYaw = yawRef.current + (event.clientX - drag.x) * sensitivity;
      yawRef.current =
        projectionRef.current === "VR180" ? THREE.MathUtils.clamp(nextYaw, -90, 90) : nextYaw;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + (event.clientY - drag.y) * sensitivity,
        -82,
        82,
      );
      renderer.domElement.dataset.yaw = yawRef.current.toFixed(2);
      renderer.domElement.dataset.pitch = pitchRef.current.toFixed(2);
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const pointerUp = (event) => {
      if (!drag.active) return;
      drag.active = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
      renderer.domElement.classList.remove("is-dragging");
      dragStateRef.current(false);
      interactionRef.current();
    };
    const wheel = (event) => {
      event.preventDefault();
      camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.035, 40, 100);
      camera.updateProjectionMatrix();
      interactionRef.current();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });

    return () => {
      disposed = true;
      sourceVideo?.removeEventListener("loadeddata", attachVideoTexture);
      observer.disconnect();
      renderer.setAnimationLoop(null);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      sphereRef.current?.geometry.dispose();
      material.dispose();
      textureRef.current?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sphereRef.current = null;
    };
  }, [mediaSource, mediaType, videoRef]);

  useEffect(() => {
    yawRef.current = 0;
    pitchRef.current = 0;
    const canvas = hostRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.dataset.yaw = "0.00";
      canvas.dataset.pitch = "0.00";
    }
    if (cameraRef.current) {
      cameraRef.current.fov = 76;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [recenterSignal]);

  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere || sphere.geometry.userData.projection === projection) return;

    const previousGeometry = sphere.geometry;
    sphere.geometry = createViewportGeometry(projection);
    previousGeometry.dispose();

    if (projection === "VR180") {
      yawRef.current = THREE.MathUtils.clamp(yawRef.current, -90, 90);
    }
    const canvas = hostRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.dataset.projection = projection;
      canvas.dataset.geometryCoverage = projection === "VR180" ? "180" : "360";
      canvas.dataset.yaw = yawRef.current.toFixed(2);
    }
  }, [projection]);

  useEffect(() => {
    const texture = textureRef.current;
    if (!texture) return;
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    if (stereo === "SBS") {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.repeat.x = 0.5;
      texture.offset.x = 0;
    } else if (stereo === "Top/Bottom") {
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.y = 0.5;
      texture.offset.y = 0.5;
    }
    texture.needsUpdate = true;
    const canvas = hostRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.dataset.stereo = stereo;
      canvas.dataset.textureRepeat = `${texture.repeat.x},${texture.repeat.y}`;
      canvas.dataset.textureOffset = `${texture.offset.x},${texture.offset.y}`;
    }
  }, [stereo]);

  return <div ref={hostRef} className="vr-viewport" />;
}

export function App() {
  const videoRef = useRef(null);
  const idleTimerRef = useRef(null);
  const controlsHoveredRef = useRef(false);
  const demoStartRef = useRef(0);
  const demoOffsetRef = useRef(84);
  const dropDepthRef = useRef(0);
  const droppedObjectUrlRef = useRef(null);
  const hasRequestedInitialEagleItemRef = useRef(false);
  const selectedEagleItemRef = useRef(null);
  const tagWriteQueueRef = useRef(Promise.resolve());
  const moreOptionsRef = useRef(null);
  const recenterFeedbackTimerRef = useRef(null);
  const dragPlaybackPendingRef = useRef(!IS_IMAGE_DEMO);
  const [item, setItem] = useState(
    IS_IMAGE_DEMO
      ? { name: "coastal-panorama.png", width: 4096, height: 2048 }
      : { name: "Coastal_Walk_8K.mp4", width: 7680, height: 3840 },
  );
  const [mediaSource, setMediaSource] = useState(
    IS_IMAGE_DEMO ? "./assets/coastal-panorama.png" : "",
  );
  const [mediaType, setMediaType] = useState(IS_IMAGE_DEMO ? "image" : "video");
  const [sourceError, setSourceError] = useState("");
  const [projection, setProjection] = useState("VR180");
  const [stereo, setStereo] = useState(IS_IMAGE_DEMO ? "Mono" : "SBS");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(IS_IMAGE_DEMO ? 0 : 84);
  const [duration, setDuration] = useState(IS_IMAGE_DEMO ? 0 : DEMO_DURATION);
  const [volume, setVolume] = useState(0.78);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [showRecenterFeedback, setShowRecenterFeedback] = useState(false);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [writeTagsEnabled, setWriteTagsEnabled] = useState(getInitialWriteTagsSetting);
  const [eagleItemRevision, setEagleItemRevision] = useState(0);
  const [tagWriteStatus, setTagWriteStatus] = useState("No Eagle item is connected.");
  const playbackDisabled = mediaType === "image";

  useEffect(() => {
    try {
      window.localStorage.setItem(WRITE_TAGS_SETTING_KEY, String(writeTagsEnabled));
    } catch {
      // Keep the in-memory setting when persistent storage is unavailable.
    }
  }, [writeTagsEnabled]);

  const releaseDroppedSource = useCallback(() => {
    if (!droppedObjectUrlRef.current) return;
    URL.revokeObjectURL(droppedObjectUrlRef.current);
    droppedObjectUrlRef.current = null;
  }, []);

  useEffect(() => () => releaseDroppedSource(), [releaseDroppedSource]);

  useEffect(() => () => window.clearTimeout(recenterFeedbackTimerRef.current), []);

  const revealControls = useCallback(() => {
    if (focusMode) {
      setControlsVisible(false);
      window.clearTimeout(idleTimerRef.current);
      return;
    }
    setControlsVisible(true);
    window.clearTimeout(idleTimerRef.current);
    if (!isDragging && !isOptionsOpen && !controlsHoveredRef.current) {
      idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), IDLE_DELAY);
    }
  }, [focusMode, isDragging, isOptionsOpen]);

  const holdControlsVisible = useCallback(() => {
    controlsHoveredRef.current = true;
    setControlsVisible(true);
    window.clearTimeout(idleTimerRef.current);
  }, []);

  const handleControlsPointerMove = useCallback(
    (event) => {
      event.stopPropagation();
      holdControlsVisible();
    },
    [holdControlsVisible],
  );

  const resumeControlsIdleTimer = useCallback(() => {
    controlsHoveredRef.current = false;
    window.clearTimeout(idleTimerRef.current);
    if (!focusMode && !isDragging && !isOptionsOpen) {
      idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), IDLE_DELAY);
    }
  }, [focusMode, isDragging, isOptionsOpen]);

  const handlePlayerPointerActivity = useCallback(
    (event) => {
      controlsHoveredRef.current =
        event.target instanceof Element && Boolean(event.target.closest(".control-surface"));
      revealControls();
    },
    [revealControls],
  );

  useEffect(() => {
    if (!isOptionsOpen) return;
    setControlsVisible(true);
    window.clearTimeout(idleTimerRef.current);
  }, [isOptionsOpen]);

  useEffect(() => {
    if (!isOptionsOpen) return undefined;

    const closeOptionsOutside = (event) => {
      if (!moreOptionsRef.current?.contains(event.target)) {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOptionsOutside);
    return () => document.removeEventListener("pointerdown", closeOptionsOutside);
  }, [isOptionsOpen]);

  const loadDroppedFile = useCallback(
    (file) => {
      if (!file) return;
      const nextMediaType = detectMediaType(file);

      if (!nextMediaType) {
        setSourceError("Drop a supported video or image file to load it.");
        revealControls();
        return;
      }

      videoRef.current?.pause();
      releaseDroppedSource();
      selectedEagleItemRef.current = null;
      setEagleItemRevision((revision) => revision + 1);
      const objectUrl = URL.createObjectURL(file);
      droppedObjectUrlRef.current = objectUrl;
      setItem({ name: file.name, width: 0, height: 0 });
      setMediaSource(objectUrl);
      setMediaType(nextMediaType);
      dragPlaybackPendingRef.current = nextMediaType === "video";
      if (nextMediaType === "image") {
        setProjection("VR180");
        setStereo("Mono");
      }
      setSourceError("");
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setRecenterSignal((value) => value + 1);
      setTagWriteStatus("Dropped files are not linked to Eagle tags.");
      revealControls();
    },
    [releaseDroppedSource, revealControls],
  );

  const handleDragEnter = (event) => {
    if (!Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    dropDepthRef.current += 1;
    setIsDropActive(true);
  };

  const handleDragOver = (event) => {
    if (!Array.from(event.dataTransfer.types || []).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) setIsDropActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dropDepthRef.current = 0;
    setIsDropActive(false);
    loadDroppedFile(event.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    revealControls();
    return () => window.clearTimeout(idleTimerRef.current);
  }, [revealControls]);

  useEffect(() => {
    let active = true;
    const loadSelectedItem = async ({ eagle: eagleApi }) => {
      try {
        if (!eagleApi?.item || !active || hasRequestedInitialEagleItemRef.current) return;
        hasRequestedInitialEagleItemRef.current = true;
        setSourceError("");
        const selected = eagleApi.item.getSelected
          ? await eagleApi.item.getSelected()
          : await eagleApi.item.get({ isSelected: true });
        if (!active) return;
        const selectedItem = selected?.[0];
        if (!selectedItem) {
          selectedEagleItemRef.current = null;
          setEagleItemRevision((revision) => revision + 1);
          setTagWriteStatus("No Eagle item is selected.");
          setSourceError("Select a video or image in Eagle, then open the player again.");
          return;
        }
        const ext = selectedItem.ext?.toLowerCase();
        const nextMediaType = detectMediaType({ ext });
        if (!nextMediaType) {
          selectedEagleItemRef.current = null;
          setEagleItemRevision((revision) => revision + 1);
          setSourceError(`.${ext || "unknown"} is not a supported video or image format.`);
          return;
        }
        selectedEagleItemRef.current = selectedItem;
        setEagleItemRevision((revision) => revision + 1);
        const detectedFormat = detectFormatFromTags(selectedItem.tags);
        if (nextMediaType === "image") {
          setProjection(detectedFormat.projection || "VR180");
          setStereo(detectedFormat.stereo || "Mono");
        } else {
          if (detectedFormat.projection) setProjection(detectedFormat.projection);
          if (detectedFormat.stereo) setStereo(detectedFormat.stereo);
        }
        const detectedLabels = [detectedFormat.projection, detectedFormat.stereo].filter(Boolean);
        setTagWriteStatus(
          detectedLabels.length > 0
            ? `Detected ${detectedLabels.join(" · ")}`
            : "No format tags detected.",
        );
        setItem({
          name: `${selectedItem.name}.${selectedItem.ext}`,
          width: selectedItem.width || 0,
          height: selectedItem.height || 0,
        });
        releaseDroppedSource();
        videoRef.current?.pause();
        setIsPlaying(false);
        setDuration(0);
        dragPlaybackPendingRef.current = nextMediaType === "video";
        setMediaType(nextMediaType);
        setMediaSource(selectedItem.fileURL || `file://${selectedItem.filePath}`);
        setCurrentTime(0);
      } catch (error) {
        console.error("Failed to load the selected Eagle item", error);
        setSourceError("The selected media could not be loaded.");
      }
    };

    const unsubscribe = subscribeToEagleLifecycle(loadSelectedItem);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [releaseDroppedSource]);

  useEffect(() => {
    if (mediaSource || !isPlaying) return undefined;
    demoStartRef.current = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - demoStartRef.current) / 1000;
      setCurrentTime((demoOffsetRef.current + elapsed) % DEMO_DURATION);
    }, 200);
    return () => {
      const elapsed = (performance.now() - demoStartRef.current) / 1000;
      demoOffsetRef.current = (demoOffsetRef.current + elapsed) % DEMO_DURATION;
      window.clearInterval(interval);
    };
  }, [isPlaying, mediaSource]);

  const queueFormatTagWrite = useCallback(
    (nextProjection, nextStereo) => {
      const eagleItem = selectedEagleItemRef.current;
      if (!eagleItem?.save) {
        setTagWriteStatus("No Eagle item is available to update.");
        return;
      }

      setTagWriteStatus("Saving format tags…");
      tagWriteQueueRef.current = tagWriteQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (selectedEagleItemRef.current !== eagleItem) return;
          eagleItem.tags = buildFormatTags(eagleItem.tags, nextProjection, nextStereo);
          await eagleItem.save();
          if (selectedEagleItemRef.current === eagleItem) {
            setTagWriteStatus("Saved to Eagle.");
          }
        })
        .catch((error) => {
          console.error("Failed to update Eagle format tags", error);
          if (selectedEagleItemRef.current === eagleItem) {
            setTagWriteStatus("Format tags could not be saved.");
          }
        });
    },
    [],
  );

  useEffect(() => {
    if (!writeTagsEnabled) return;
    queueFormatTagWrite(projection, stereo);
  }, [eagleItemRevision, projection, queueFormatTagWrite, stereo, writeTagsEnabled]);

  const changeProjection = useCallback(
    (nextProjection) => {
      if (nextProjection === projection) {
        revealControls();
        return;
      }
      setProjection(nextProjection);
      revealControls();
    },
    [projection, revealControls],
  );

  const changeStereo = useCallback(
    (nextStereo) => {
      if (nextStereo === stereo) {
        revealControls();
        return;
      }
      setStereo(nextStereo);
      revealControls();
    },
    [revealControls, stereo],
  );

  const togglePlayback = useCallback(async () => {
    revealControls();
    if (playbackDisabled) return;
    dragPlaybackPendingRef.current = false;
    const video = videoRef.current;
    if (mediaSource && video) {
      if (video.paused) {
        try {
          setShowRecenterFeedback(false);
          await video.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Playback could not start", error);
          setSourceError("Playback could not be started.");
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
      return;
    }
    setIsPlaying((playing) => {
      const nextPlaying = !playing;
      if (nextPlaying) setShowRecenterFeedback(false);
      return nextPlaying;
    });
  }, [mediaSource, playbackDisabled, revealControls]);

  const startPlaybackFromInitialDrag = useCallback(async () => {
    if (mediaType !== "video" || !dragPlaybackPendingRef.current) return;
    dragPlaybackPendingRef.current = false;

    const video = videoRef.current;
    if (mediaSource && video) {
      if (!video.paused) return;
      try {
        setShowRecenterFeedback(false);
        await video.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Playback could not start from the initial drag", error);
        setSourceError("Playback could not be started.");
      }
      return;
    }

    setShowRecenterFeedback(false);
    setIsPlaying(true);
  }, [mediaSource, mediaType]);

  const handleFirstViewportDrag = useCallback(() => {
    setHasDragged(true);
    void startPlaybackFromInitialDrag();
  }, [startPlaybackFromInitialDrag]);

  const seek = (nextTime) => {
    if (playbackDisabled) return;
    const value = Number(nextTime);
    setCurrentTime(value);
    demoOffsetRef.current = value;
    demoStartRef.current = performance.now();
    if (videoRef.current && mediaSource) videoRef.current.currentTime = value;
    revealControls();
  };

  const setPlayerVolume = (nextVolume) => {
    if (playbackDisabled) return;
    const value = Number(nextVolume);
    setVolume(value);
    if (videoRef.current) videoRef.current.volume = value;
    revealControls();
  };

  const recenter = useCallback(() => {
    setRecenterSignal((value) => value + 1);
    setHasDragged(true);
    setShowRecenterFeedback(true);
    window.clearTimeout(recenterFeedbackTimerRef.current);
    recenterFeedbackTimerRef.current = window.setTimeout(
      () => setShowRecenterFeedback(false),
      RECENTER_FEEDBACK_DURATION,
    );
    revealControls();
  }, [revealControls]);

  const handleViewportInteraction = useCallback(() => {
    window.clearTimeout(recenterFeedbackTimerRef.current);
    setShowRecenterFeedback(false);
    revealControls();
  }, [revealControls]);

  const enterFocusMode = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    controlsHoveredRef.current = false;
    setIsOptionsOpen(false);
    setControlsVisible(false);
    setFocusMode(true);
  }, []);

  const exitFocusMode = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    setFocusMode(false);
    setControlsVisible(true);
    idleTimerRef.current = window.setTimeout(() => setControlsVisible(false), IDLE_DELAY);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      revealControls();
      if (event.key === "Escape" && isOptionsOpen) {
        event.preventDefault();
        setIsOptionsOpen(false);
        moreOptionsRef.current?.querySelector(".icon-button")?.focus();
        return;
      }
      if (event.key === "Escape" && focusMode) {
        event.preventDefault();
        exitFocusMode();
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, input, select, textarea, a, [contenteditable='true']")
      ) {
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (focusMode) exitFocusMode();
        else enterFocusMode();
      } else if (event.code === "Space" && !playbackDisabled) {
        event.preventDefault();
        togglePlayback();
      } else if (event.key.toLowerCase() === "r") recenter();
      else if (event.key === "ArrowRight" && !playbackDisabled) seek(Math.min(duration, currentTime + 5));
      else if (event.key === "ArrowLeft" && !playbackDisabled) seek(Math.max(0, currentTime - 5));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentTime, duration, enterFocusMode, exitFocusMode, focusMode, isOptionsOpen, playbackDisabled, recenter, revealControls, togglePlayback]);

  const displayedFormatTags = buildFormatTags([], projection, stereo);

  return (
    <main
      className={`player-shell ${controlsVisible ? "controls-visible" : "controls-hidden"} ${
        isDragging ? "is-dragging" : ""
      } ${focusMode ? "focus-mode" : ""}`}
      onPointerMove={handlePlayerPointerActivity}
      onPointerDown={handlePlayerPointerActivity}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="vr-player"
      data-playing={isPlaying ? "true" : "false"}
      data-controls-visible={controlsVisible ? "true" : "false"}
      data-focus-mode={focusMode ? "true" : "false"}
      data-has-dragged={hasDragged ? "true" : "false"}
      data-recenter-feedback={showRecenterFeedback ? "visible" : "hidden"}
      data-projection={projection}
      data-stereo={stereo}
      data-drop-active={isDropActive ? "true" : "false"}
      data-media-type={mediaType}
    >
      <video
        ref={videoRef}
        className="source-video"
        src={mediaType === "video" ? mediaSource || undefined : undefined}
        preload="auto"
        playsInline
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          const nextDuration = video.duration;
          const nextWidth = video.videoWidth;
          const nextHeight = video.videoHeight;
          setDuration(Number.isFinite(nextDuration) ? nextDuration : DEMO_DURATION);
          setItem((currentItem) => ({
            ...currentItem,
            width: nextWidth || currentItem.width,
            height: nextHeight || currentItem.height,
          }));
          video.volume = volume;
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => {
          setShowRecenterFeedback(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => mediaType === "video" && mediaSource && setSourceError("This video format cannot be decoded.")}
      />

      <VrViewport
        videoRef={videoRef}
        mediaSource={mediaSource}
        mediaType={mediaType}
        projection={projection}
        stereo={stereo}
        recenterSignal={recenterSignal}
        onInteraction={handleViewportInteraction}
        onDragStateChange={setIsDragging}
        onFirstDrag={handleFirstViewportDrag}
        onImageLoaded={({ width, height }) => {
          setItem((currentItem) => ({
            ...currentItem,
            width: width || currentItem.width,
            height: height || currentItem.height,
          }));
        }}
        onMediaError={setSourceError}
      />

      <div className={`drop-overlay ${isDropActive ? "is-active" : ""}`} aria-hidden={!isDropActive}>
        <div className="drop-panel">
          <span className="drop-icon" aria-hidden="true">
            <FileVideo size={29} weight="regular" />
          </span>
          <strong>Drop a video or image to load it</strong>
          <span>MP4, MOV, JPG, PNG, WebP, and more</span>
        </div>
      </div>

      <header
        className="top-bar control-surface"
        aria-hidden={!controlsVisible}
        onPointerEnter={holdControlsVisible}
        onPointerMove={handleControlsPointerMove}
        onPointerLeave={resumeControlsIdleTimer}
      >
        <div className="file-meta">
          <strong title={item.name}>{item.name}</strong>
          <span>{item.width && item.height ? `${item.width}×${item.height}` : mediaType === "image" ? "VR Image" : "VR Video"}</span>
        </div>

        <div className="format-controls" role="group" aria-label="VR format">
          <FormatToggleGroup
            label="Projection"
            value={projection}
            onChange={changeProjection}
            tabbable={controlsVisible}
            options={[
              { value: "VR180", label: "180°", icon: "VR180", ariaLabel: "180 degree projection" },
              { value: "VR360", label: "360°", icon: "VR360", ariaLabel: "360 degree projection" },
            ]}
          />
          <span className="control-divider" />
          <FormatToggleGroup
            label="Stereo layout"
            value={stereo}
            onChange={changeStereo}
            tabbable={controlsVisible}
            options={[
              { value: "SBS", label: "SBS", icon: "SBS", ariaLabel: "Side by side" },
              { value: "Top/Bottom", label: "TB", icon: "TB", ariaLabel: "Top and bottom" },
              { value: "Mono", label: "Mono", icon: "Mono", ariaLabel: "Monoscopic" },
            ]}
          />
        </div>

        <div className="top-actions">
          <button
            className="recenter-button"
            type="button"
            tabIndex={controlsVisible ? 0 : -1}
            onClick={recenter}
            aria-label="Recenter view"
            aria-describedby="recenter-tooltip"
          >
            <Crosshair size={25} weight="regular" aria-hidden="true" />
            <ShortcutTooltip id="recenter-tooltip" label="Recenter view" shortcut="R" />
          </button>
          <div className="more-options" ref={moreOptionsRef}>
            <button
              className="icon-button"
              type="button"
              tabIndex={controlsVisible ? 0 : -1}
              aria-label="More options"
              aria-expanded={isOptionsOpen}
              aria-controls="player-settings"
              onClick={() => {
                setIsOptionsOpen((open) => !open);
                revealControls();
              }}
            >
              <DotsThree size={27} weight="bold" />
            </button>
            {isOptionsOpen ? (
              <div className="options-popover" id="player-settings" role="dialog" aria-label="Player settings">
                <div className="options-title">Tag settings</div>
                <div className="tag-detection-setting">
                  <span>
                    <strong>Auto-detect format</strong>
                    <small>Reads format tags when an Eagle item loads</small>
                  </span>
                  <span className="always-on">Always on</span>
                </div>
                <div className="options-divider" />
                <label className="tag-write-setting">
                  <span>
                    <strong>Write format tags</strong>
                    <small>Sync now and when the format changes</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={writeTagsEnabled}
                    onChange={(event) => {
                      setWriteTagsEnabled(event.target.checked);
                      setTagWriteStatus(
                        event.target.checked
                          ? "Syncing the current format…"
                          : "Writing is off.",
                      );
                      revealControls();
                    }}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span />
                  </span>
                </label>
                <div className="tag-write-result" role="status">
                  <p className="tag-write-status">{tagWriteStatus}</p>
                  <div className="tag-convention" aria-label="Format tags">
                    {displayedFormatTags.map((tag) => <code key={tag}>{tag}</code>)}
                  </div>
                </div>
                <div className="options-divider" />
                <div className="options-title shortcut-list-title">Keyboard shortcuts</div>
                <dl className="shortcut-list">
                  <div><dt>Play / Pause</dt><dd><kbd>Space</kbd></dd></div>
                  <div><dt>Recenter view</dt><dd><kbd>R</kbd></dd></div>
                  <div><dt>Focus mode</dt><dd><kbd>F</kbd></dd></div>
                  <div><dt>Exit focus</dt><dd><kbd>Esc</kbd></dd></div>
                  <div><dt>Seek −5 seconds</dt><dd><kbd>←</kbd></dd></div>
                  <div><dt>Seek +5 seconds</dt><dd><kbd>→</kbd></dd></div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {focusMode ? (
        <button
          className="focus-exit-button"
          type="button"
          aria-label="Exit focus mode"
          onClick={exitFocusMode}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.5 3.5v4h-4M12.5 3.5v4h4M7.5 16.5v-4h-4M12.5 16.5v-4h4" />
          </svg>
          <span className="focus-exit-label">Exit Focus</span>
        </button>
      ) : null}

      {!hasDragged ? (
        <div className="drag-hint" aria-hidden="true">
          <HandGrabbing size={34} weight="light" />
          <span>Drag to look around</span>
        </div>
      ) : null}

      <div
        className={`recenter-feedback${showRecenterFeedback ? " is-visible" : ""}`}
        aria-hidden="true"
      >
        <Crosshair size={54} weight="light" />
      </div>

      {sourceError ? <div className="status-toast" role="status">{sourceError}</div> : null}

      <section
        className={`transport control-surface${playbackDisabled ? " has-static-media" : ""}`}
        aria-label={playbackDisabled ? "Image preview controls" : "Playback controls"}
        aria-hidden={!controlsVisible}
        onPointerEnter={holdControlsVisible}
        onPointerMove={handleControlsPointerMove}
        onPointerLeave={resumeControlsIdleTimer}
      >
        <button
          className="play-button"
          type="button"
          tabIndex={controlsVisible ? 0 : -1}
          onClick={togglePlayback}
          aria-label={isPlaying ? "Pause" : "Play"}
          disabled={playbackDisabled}
        >
          {isPlaying ? <Pause size={25} weight="fill" /> : <Play size={25} weight="fill" />}
        </button>
        {playbackDisabled ? null : (
          <span className="time-readout">
            {formatTime(currentTime)} <span>/ {formatTime(duration)}</span>
          </span>
        )}
        <input
          className="range progress-range"
          aria-label="Seek"
          type="range"
          min="0"
          max={duration || DEMO_DURATION}
          step="0.05"
          value={Math.min(currentTime, duration || DEMO_DURATION)}
          tabIndex={controlsVisible && !playbackDisabled ? 0 : -1}
          disabled={playbackDisabled}
          onChange={(event) => seek(event.target.value)}
          style={{ "--range-progress": `${(currentTime / Math.max(duration, 1)) * 100}%` }}
        />
        <div className={`volume-control${playbackDisabled ? " is-disabled" : ""}`}>
          <button
            className="volume-button"
            type="button"
            tabIndex={controlsVisible && !playbackDisabled ? 0 : -1}
            aria-label={volume === 0 ? "Unmute" : "Mute"}
            onClick={() => setPlayerVolume(volume === 0 ? 0.78 : 0)}
            disabled={playbackDisabled}
          >
            {volume === 0 ? <SpeakerSlash size={25} /> : <SpeakerHigh size={25} />}
          </button>
          <div className="volume-popover">
            <input
              className="range volume-range"
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              tabIndex={controlsVisible && !playbackDisabled ? 0 : -1}
              disabled={playbackDisabled}
              onChange={(event) => setPlayerVolume(event.target.value)}
              style={{ "--range-progress": `${volume * 100}%` }}
            />
          </div>
        </div>
        <button
          className="focus-mode-button"
          type="button"
          tabIndex={controlsVisible ? 0 : -1}
          onClick={enterFocusMode}
          aria-label="Enter focus mode"
          aria-describedby="enter-focus-tooltip"
        >
          <FocusModeIcon />
          <ShortcutTooltip id="enter-focus-tooltip" label="Focus mode" shortcut="F" />
        </button>
      </section>

    </main>
  );
}
