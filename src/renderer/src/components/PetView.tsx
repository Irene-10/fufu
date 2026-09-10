import { useEffect, useRef, useState } from "react";
import type { JSX, PointerEvent } from "react";
import { i18n, resolveLanguage } from "../../../shared/i18n";
import type { PetState, SpeechBubble } from "../../../shared/types";
import { getPetAsset, getPetAssetVariantCount } from "../assets";
import { useNow, useSnapshot } from "../hooks";
import { pointInElementHitbox } from "../petHitbox";
import { PetAnimationVariants } from "../petAnimationVariants";
import { StablePetImage } from "./StablePetImage";

type DragRef = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

const CONTINUOUS_ASSET_STATES = new Set<PetState>([
  "idle",
  "focusGuard",
  "working",
  "eating",
  "exercising",
  "reading",
  "sleeping"
]);
const CONTINUOUS_ASSET_ROTATION_MS = 5 * 60 * 1000;
const DRAG_START_DISTANCE_PX = 10;
const PET_BUTTON_SELECTOR = ".pet-button";
const BUBBLE_INTERACTIVE_SELECTOR = ".speech-bubble";

function formatFocusCountdown(endsAt: number | null, now: number): string {
  const remainingSeconds = Math.max(0, Math.ceil(((endsAt ?? now) - now) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function PetView(): JSX.Element {
  const snapshot = useSnapshot();
  const now = useNow(1000);
  const [bubble, setBubble] = useState<SpeechBubble | null>(null);
  const variants = useRef(new PetAnimationVariants());
  const [, refreshVariant] = useState(0);
  const [replay, setReplay] = useState({ key: "", count: 0 });
  const dragRef = useRef<DragRef | null>(null);
  const mouseInteractiveRef = useRef<boolean | null>(null);
  const lastMousePointRef = useRef<{ x: number; y: number } | null>(null);
  const bubbleVisibleRef = useRef(false);
  const labels = i18n(resolveLanguage(snapshot.settings.language)).settings;

  useEffect(() => {
    const offBubble = window.fufu.onShowBubble(setBubble);
    const offHide = window.fufu.onHideBubble(() => setBubble(null));
    return () => {
      offBubble();
      offHide();
    };
  }, []);

  const state = snapshot.petMoving ? "breakRunning" : snapshot.petState;
  const altText = `Fufu ${state}`;
  const facingClass = snapshot.petFacing === "left" ? "facing-left" : "facing-right";
  const appearanceId = snapshot.settings.petAppearanceId;
  const customAppearance = snapshot.settings.customPetAppearance;
  // IPC snapshots clone customAppearance. Key by content, not object identity.
  const variantKey = JSON.stringify([appearanceId, customAppearance, state]);
  const variantCount = getPetAssetVariantCount(appearanceId, state, customAppearance);
  const assetVariant = variants.current.get(variantKey, variantCount);
  const assetReplayKey = replay.key === variantKey ? replay.count : 0;
  const asset = getPetAsset(appearanceId, state, assetVariant, assetReplayKey, customAppearance);

  function finishPointerDrag(clicked: boolean): void {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    window.fufu.petDragStop();
    if (clicked && !drag.dragging) window.fufu.petClicked();
  }

  function setMouseInteractive(interactive: boolean): void {
    if (mouseInteractiveRef.current === interactive) return;
    mouseInteractiveRef.current = interactive;
    window.fufu.setMouseInteractive(interactive);
  }

  function updateMouseInteractivity(point: { x: number; y: number } | null): void {
    if (dragRef.current) {
      setMouseInteractive(true);
      return;
    }

    if (!point) {
      setMouseInteractive(false);
      return;
    }

    const target = document.elementFromPoint(point.x, point.y);
    if (!(target instanceof Element)) {
      setMouseInteractive(false);
      return;
    }

    const petButton = target.closest(PET_BUTTON_SELECTOR);
    const isOnPet = petButton ? pointInElementHitbox(point, petButton) : false;
    const isOnBubble =
      bubbleVisibleRef.current && Boolean(target.closest(BUBBLE_INTERACTIVE_SELECTOR));

    setMouseInteractive(isOnPet || isOnBubble);
  }

  useEffect(() => {
    if (!CONTINUOUS_ASSET_STATES.has(state) || variantCount <= 1) return;
    const timer = window.setInterval(() => {
      variants.current.rotate(variantKey, variantCount);
      refreshVariant((current) => current + 1);
    }, CONTINUOUS_ASSET_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [variantKey, variantCount, state]);

  useEffect(() => {
    setReplay({ key: variantKey, count: 0 });
    if (!asset.replayIntervalMs) return;
    const timer = window.setInterval(() => {
      setReplay((current) => ({ key: variantKey, count: current.key === variantKey ? current.count + 1 : 1 }));
    }, asset.replayIntervalMs);
    return () => window.clearInterval(timer);
  }, [variantKey, asset.replayIntervalMs]);

  useEffect(() => {
    const cancelActiveDrag = (): void => finishPointerDrag(false);
    const trackMouse = (event: MouseEvent): void => {
      const point = { x: event.clientX, y: event.clientY };
      lastMousePointRef.current = point;
      updateMouseInteractivity(point);
    };
    const clearMouse = (): void => {
      lastMousePointRef.current = null;
      updateMouseInteractivity(null);
    };

    setMouseInteractive(false);
    window.addEventListener("mousemove", trackMouse);
    window.addEventListener("mouseleave", clearMouse);
    window.addEventListener("pointerup", cancelActiveDrag);
    window.addEventListener("pointercancel", cancelActiveDrag);
    window.addEventListener("blur", cancelActiveDrag);
    return () => {
      window.removeEventListener("mousemove", trackMouse);
      window.removeEventListener("mouseleave", clearMouse);
      window.removeEventListener("pointerup", cancelActiveDrag);
      window.removeEventListener("pointercancel", cancelActiveDrag);
      window.removeEventListener("blur", cancelActiveDrag);
      window.fufu.setMouseInteractive(true);
    };
  }, []);

  useEffect(() => {
    bubbleVisibleRef.current = Boolean(bubble);
    updateMouseInteractivity(lastMousePointRef.current);
  }, [bubble]);

  function startPointer(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    window.fufu.petPointerDown();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false
    };
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance > DRAG_START_DISTANCE_PX) {
      drag.dragging = true;
      window.fufu.petDragStart({ offsetX: drag.startX, offsetY: drag.startY });
    }
  }

  function stopPointer(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldReleaseCapture = event.currentTarget.hasPointerCapture(event.pointerId);
    finishPointerDrag(true);
    if (shouldReleaseCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelPointer(event: PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    finishPointerDrag(false);
  }

  return (
    <main
      className="pet-shell"
      aria-label="Fufu desktop pet"
      onContextMenu={(event) => {
        event.preventDefault();
        window.fufu.petContextMenu();
      }}
    >
      {bubble ? (
        <section className="speech-bubble">
          <p>{bubble.message}</p>
          {bubble.actions?.length ? (
            <div className="bubble-actions">
              {bubble.actions.map((action) => (
                <button
                  className={`bubble-button ${action.kind ?? "secondary"}`}
                  key={action.id}
                  onClick={() => window.fufu.bubbleAction(action.id)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {snapshot.focusActive ? (
        <div className="focus-badge">
          <span>{labels.focus}</span>
          <strong>{formatFocusCountdown(snapshot.timers.focusEndsAt, now)}</strong>
        </div>
      ) : null}

      <button
        className={`pet-button state-${state} ${facingClass} ${
          asset.isPlaceholder ? "placeholder-asset" : ""
        }`}
        onPointerCancel={cancelPointer}
        onPointerDown={startPointer}
        onLostPointerCapture={() => finishPointerDrag(false)}
        onPointerMove={movePointer}
        onPointerUp={stopPointer}
        type="button"
      >
        <StablePetImage src={asset.src} alt={altText} />
      </button>
    </main>
  );
}
