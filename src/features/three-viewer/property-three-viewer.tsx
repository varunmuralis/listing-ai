"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Edges, Html, OrbitControls, PointerLockControls } from "@react-three/drei";
import { ROOM_VISUALS } from "@/features/media/room-visuals";
import { cn } from "@/lib/utils";
import type { RoomType } from "@/types/domain";

export interface ViewerRoom {
  id: string;
  roomType: RoomType;
  label: string;
  count: number;
}

export interface PropertyThreeViewerProps {
  rooms: ViewerRoom[];
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  className?: string;
}

type CameraMode = "orbit" | "first-person";
type OrbitControlsInstance = React.ComponentRef<typeof OrbitControls>;
type Vec3 = [number, number, number];

/** Room types that read as outdoor plots rather than interior volumes. */
const OUTDOOR_ROOMS: ReadonlySet<RoomType> = new Set<RoomType>(["exterior", "backyard", "pool"]);

/** Default orbit camera placement, reused for the initial camera and "Reset view". */
const DEFAULT_CAMERA_POSITION: Vec3 = [11, 10, 13];
const DEFAULT_CAMERA_TARGET: Vec3 = [0, 1, 0];

interface PlacedRoom {
  room: ViewerRoom;
  position: Vec3;
  size: Vec3;
  outdoor: boolean;
}

/**
 * Deterministically derive a footprint/height for a room from its photo count so
 * more-photographed rooms read as slightly larger. No randomness — same input,
 * same layout every render.
 */
function sizeForCount(count: number, outdoor: boolean): Vec3 {
  const norm = Math.min(Math.max(count, 1), 12) / 12; // 0..1
  const width = (outdoor ? 3.0 : 2.0) + norm * 1.6;
  const depth = (outdoor ? 3.0 : 2.0) + norm * 1.2;
  const height = outdoor ? 0.2 : 1.6 + norm * 1.8;
  return [width, height, depth];
}

/**
 * Pack interior rooms into a rows x cols grid (the "house footprint") and lay the
 * outdoor plots out in a row in front of it so they read as ground-level yard.
 * Fully deterministic — driven only by array order and photo counts.
 */
function computeLayout(rooms: ViewerRoom[]): PlacedRoom[] {
  const interior = rooms.filter((r) => !OUTDOOR_ROOMS.has(r.roomType));
  const outdoor = rooms.filter((r) => OUTDOOR_ROOMS.has(r.roomType));
  const placed: PlacedRoom[] = [];

  const cols = Math.max(1, Math.ceil(Math.sqrt(interior.length)));
  const rowCount = Math.max(1, Math.ceil(interior.length / cols));
  const cell = 4.2;

  interior.forEach((room, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * cell;
    const z = (row - (rowCount - 1) / 2) * cell;
    placed.push({ room, position: [x, 0, z], size: sizeForCount(room.count, false), outdoor: false });
  });

  const houseHalfDepth = (rowCount * cell) / 2;
  const outdoorZ = houseHalfDepth + 3.6;
  const outCell = 4.8;
  outdoor.forEach((room, i) => {
    const x = (i - (outdoor.length - 1) / 2) * outCell;
    placed.push({ room, position: [x, 0, outdoorZ], size: sizeForCount(room.count, true), outdoor: true });
  });

  return placed;
}

interface RoomVolumeProps {
  placed: PlacedRoom;
  geometry: THREE.BoxGeometry;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

/**
 * One clickable box "room volume". Memoized so only rooms whose selected/hovered
 * state actually changed re-render. Material props are reactive (never recreated
 * per frame); the box geometry is shared and injected via props.
 */
const RoomVolume = React.memo(function RoomVolume({
  placed,
  geometry,
  selected,
  hovered,
  onSelect,
  onHover,
}: RoomVolumeProps): React.JSX.Element {
  const { room, position, size } = placed;
  const color = ROOM_VISUALS[room.roomType].color;
  const raise = selected ? 0.4 : 0;
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.28 : 0.05;

  const setCursor = useCallback((value: string) => {
    if (typeof document !== "undefined") {
      document.body.style.cursor = value;
    }
  }, []);

  const handleOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(room.id);
      setCursor("pointer");
    },
    [onHover, room.id, setCursor],
  );

  const handleOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(null);
      setCursor("auto");
    },
    [onHover, setCursor],
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onSelect(selected ? null : room.id);
    },
    [onSelect, selected, room.id],
  );

  return (
    <group position={[position[0], raise, position[2]]}>
      <mesh
        geometry={geometry}
        position={[0, size[1] / 2, 0]}
        scale={size}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.62}
          metalness={0.06}
          transparent={placed.outdoor}
          opacity={placed.outdoor ? 0.85 : 1}
        />
        {selected ? <Edges scale={1.02} threshold={15} color="#ffffff" lineWidth={2} /> : null}
      </mesh>
      {hovered || selected ? (
        <Html position={[0, size[1] + 0.6, 0]} center distanceFactor={14} pointerEvents="none">
          <div className="pointer-events-none select-none whitespace-nowrap rounded-md border border-border bg-card/90 px-2 py-1 text-xs text-foreground shadow-lg backdrop-blur">
            {room.label}
            <span className="ml-1 text-muted-foreground">· {room.count}</span>
          </div>
        </Html>
      ) : null}
    </group>
  );
});

interface SceneProps {
  layout: PlacedRoom[];
  geometry: THREE.BoxGeometry;
  selectedRoomId: string | null;
  hoveredRoomId: string | null;
  mode: CameraMode;
  reducedMotion: boolean;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
  onSelectRoom: (id: string | null) => void;
  onHoverRoom: (id: string | null) => void;
}

/** Everything that lives inside the R3F <Canvas>. */
function Scene({
  layout,
  geometry,
  selectedRoomId,
  hoveredRoomId,
  mode,
  reducedMotion,
  controlsRef,
  onSelectRoom,
  onHoverRoom,
}: SceneProps): React.JSX.Element {
  return (
    <>
      <color attach="background" args={["#0b0f19"]} />
      <fog attach="fog" args={["#0b0f19", 34, 72]} />

      <hemisphereLight args={["#cdd7ff", "#1a1d2b", 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[14, 20, 10]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />

      {/* Ground plane that receives shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#141a29" roughness={0.95} metalness={0} />
      </mesh>
      <gridHelper args={[120, 60, "#233049", "#1a2233"]} position={[0, 0.01, 0]} />

      {layout.map((placed) => (
        <RoomVolume
          key={placed.room.id}
          placed={placed}
          geometry={geometry}
          selected={selectedRoomId === placed.room.id}
          hovered={hoveredRoomId === placed.room.id}
          onSelect={onSelectRoom}
          onHover={onHoverRoom}
        />
      ))}

      {mode === "orbit" ? (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping={!reducedMotion}
          dampingFactor={reducedMotion ? 0 : 0.08}
          enableZoom
          minDistance={4}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={DEFAULT_CAMERA_TARGET}
        />
      ) : (
        <PointerLockControls makeDefault />
      )}
    </>
  );
}

const CAPTION = "Estimated spatial preview — generated from photo room-grouping, not a measured floor plan.";

export default function PropertyThreeViewer({
  rooms,
  selectedRoomId,
  onSelectRoom,
  className,
}: PropertyThreeViewerProps): React.JSX.Element {
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const controlsRef = useRef<OrbitControlsInstance | null>(null);

  const layout = useMemo(() => computeLayout(rooms), [rooms]);

  // Shared unit box geometry — created once, explicitly disposed on unmount.
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => boxGeometry.dispose(), [boxGeometry]);

  // Respect prefers-reduced-motion (guarded for non-DOM evaluation).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // Restore the cursor if we unmount while hovering a room.
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") document.body.style.cursor = "auto";
    };
  }, []);

  const handleHoverRoom = useCallback((id: string | null) => setHoveredRoomId(id), []);

  const resetView = useCallback(() => {
    setMode("orbit");
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    camera.position.set(...DEFAULT_CAMERA_POSITION);
    controls.target.set(...DEFAULT_CAMERA_TARGET);
    controls.update();
  }, []);

  // Keyboard navigation: arrow keys / WASD nudge the orbit target (pan) or, in
  // first-person mode, dolly the camera. Only active while the canvas is focused.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const controls = controlsRef.current;
      if (!controls) return;
      const camera = controls.object;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() === 0) return;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const delta = new THREE.Vector3();
      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          delta.add(forward);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          delta.sub(forward);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          delta.sub(right);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          delta.add(right);
          break;
        default:
          return;
      }

      event.preventDefault();
      delta.multiplyScalar(0.7);
      camera.position.add(delta);
      if (mode === "orbit") controls.target.add(delta);
      controls.update();
    },
    [mode],
  );

  const handlePointerMissed = useCallback(() => onSelectRoom(null), [onSelectRoom]);

  if (rooms.length === 0) {
    return (
      <div className={cn("relative flex h-full w-full items-center justify-center rounded-lg bg-card/40", className)}>
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          No rooms are available yet. Once photos are grouped by room, an estimated spatial preview will appear here.
        </p>
      </div>
    );
  }

  const modeButton = (value: CameraMode) =>
    cn(
      "rounded-md px-2 py-1 text-xs transition-colors",
      mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden rounded-lg bg-[#0b0f19]", className)}
      tabIndex={0}
      role="group"
      aria-label="Estimated spatial preview of the property. Use arrow keys or W A S D to move the view."
      onKeyDown={handleKeyDown}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 50 }}
        onPointerMissed={handlePointerMissed}
        gl={{ antialias: true }}
      >
        <Scene
          layout={layout}
          geometry={boxGeometry}
          selectedRoomId={selectedRoomId}
          hoveredRoomId={hoveredRoomId}
          mode={mode}
          reducedMotion={reducedMotion}
          controlsRef={controlsRef}
          onSelectRoom={onSelectRoom}
          onHoverRoom={handleHoverRoom}
        />
      </Canvas>

      {/* Control panel */}
      <div className="pointer-events-auto absolute left-3 top-3 flex flex-col gap-2 rounded-lg border border-border bg-card/80 p-2 text-foreground backdrop-blur">
        <div className="flex items-center gap-1">
          <button type="button" className={modeButton("orbit")} onClick={() => setMode("orbit")} aria-pressed={mode === "orbit"}>
            Orbit
          </button>
          <button
            type="button"
            className={modeButton("first-person")}
            onClick={() => setMode("first-person")}
            aria-pressed={mode === "first-person"}
          >
            First-person
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={resetView}
          >
            Reset view
          </button>
        </div>
        <p className="text-[10px] leading-tight text-muted-foreground">
          {mode === "orbit"
            ? "Drag to orbit · scroll to zoom · arrows / WASD to pan"
            : "Click canvas to look around (Esc to release) · arrows / WASD to move"}
        </p>
      </div>

      {/* Keyboard legend */}
      <div className="absolute right-3 top-3 rounded-lg border border-border bg-card/80 px-2 py-1 text-[10px] leading-tight text-muted-foreground backdrop-blur">
        <span className="text-foreground">Keys:</span> ↑↓←→ / WASD move · scroll zoom · click select
      </div>

      {/* Persistent caption */}
      <p className="pointer-events-none absolute bottom-2 left-1/2 max-w-[92%] -translate-x-1/2 text-center text-[10px] leading-tight text-muted-foreground">
        {CAPTION}
      </p>
    </div>
  );
}
