import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Html } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ROOMS, type Exhibit, type Room } from "./types";

// ---------- Layout constants ----------
const LOBBY_SIZE = 26;
const WALL_H = 7;
const WALL_T = 0.4;
const ROOM_DIST = 28; // tighter corridors, less empty space
const ROOM_W = 17;
const ROOM_D = 22;
const DOOR_W = 5;

// Materials reused across the museum
const FLOOR_COLOR = "#b88e5a"; // warm wood parquet (lobby)
const WOOD_PLANK_LIGHT = "#caa074";
const WOOD_PLANK_DARK = "#8c6536";
const WALL_COLOR = "#f4ecdc"; // ivory
const TRIM_COLOR = "#c9b58a"; // light wood
const PEDESTAL_COLOR = "#ece3cf";
const MARBLE_COLOR = "#f1e8d2";
const WOOD_DARK = "#8c6a3f";

// ---------- Proximity / interaction ----------
type NearTarget = { exhibitId: string; roomId: string };

function useNearTarget() {
  const [near, setNear] = useState<NearTarget | null>(null);
  return { near, setNear };
}

// ---------- Player (first person) ----------
function Player({
  teleportTo,
  onMove,
}: {
  teleportTo: [number, number, number] | null;
  onMove: (pos: THREE.Vector3) => void;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());

  useEffect(() => {
    const dn = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (teleportTo) {
      camera.position.set(teleportTo[0], 1.7, teleportTo[2]);
      camera.lookAt(0, 1.7, 0);
    }
  }, [teleportTo, camera]);

  useFrame((_, dt) => {
    const speed = (keys.current["ShiftLeft"] ? 9 : 4.5) * dt;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const dir = new THREE.Vector3();
    if (keys.current["KeyW"] || keys.current["ArrowUp"]) dir.add(forward);
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) dir.sub(forward);
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) dir.add(right);
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) dir.sub(right);
    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed);
      velocity.current.lerp(dir, 0.5);
    } else {
      velocity.current.lerp(new THREE.Vector3(), 0.3);
    }
    camera.position.add(velocity.current);
    // bounds: keep within outer museum footprint
    const R = ROOM_DIST + ROOM_D / 2 + 2;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -R, R);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -R, R);
    camera.position.y = 1.7;
    onMove(camera.position);
  });

  return null;
}

// ---------- Building blocks ----------
function Wall({
  position,
  size,
  rotationY = 0,
  color = WALL_COLOR,
}: {
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** A wall with a doorway opening centered along its length axis. */
function WallWithDoor({
  center,
  length,
  rotationY,
  doorWidth = DOOR_W,
  height = WALL_H,
}: {
  center: [number, number, number];
  length: number;
  rotationY: number;
  doorWidth?: number;
  height?: number;
}) {
  const seg = (length - doorWidth) / 2;
  const offset = doorWidth / 2 + seg / 2;
  return (
    <group position={center} rotation={[0, rotationY, 0]}>
      <mesh position={[-offset, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[seg, height, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      <mesh position={[offset, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[seg, height, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      {/* lintel above door */}
      <mesh position={[0, height - 0.6, 0]} castShadow>
        <boxGeometry args={[doorWidth, 1.2, WALL_T]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.95} />
      </mesh>
      {/* door trim (wood) */}
      <mesh position={[0, height - 1.25, 0.01]}>
        <boxGeometry args={[doorWidth + 0.2, 0.08, WALL_T + 0.05]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.7} />
      </mesh>
    </group>
  );
}

function CeilingPanel({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number];
}) {
  // Decorative coffered ceiling panel with a warm recessed lamp.
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#f1e6cb" roughness={1} />
      </mesh>
      {/* trim border */}
      {[-1, 1].map((s) => (
        <mesh key={"x" + s} position={[(size[0] / 2) * s, -0.04, 0]}>
          <boxGeometry args={[0.08, 0.08, size[1]]} />
          <meshStandardMaterial color={TRIM_COLOR} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={"z" + s} position={[0, -0.04, (size[1] / 2) * s]}>
          <boxGeometry args={[size[0], 0.08, 0.08]} />
          <meshStandardMaterial color={TRIM_COLOR} />
        </mesh>
      ))}
      {/* recessed warm light disc */}
      <mesh rotation-x={Math.PI / 2} position={[0, -0.06, 0]}>
        <circleGeometry args={[Math.min(size[0], size[1]) * 0.18, 24]} />
        <meshStandardMaterial
          color="#fff1cf"
          emissive="#ffd99a"
          emissiveIntensity={0.7}
          roughness={0.5}
        />
      </mesh>
      <pointLight
        position={[0, -1.8, 0]}
        intensity={9}
        distance={14}
        color="#ffd9a3"
        decay={1.8}
      />
    </group>
  );
}

// Wood parquet floor (alternating plank tones)
function WoodFloor({
  width,
  depth,
  light = WOOD_PLANK_LIGHT,
  dark = WOOD_PLANK_DARK,
  z = 0,
  x = 0,
}: {
  width: number;
  depth: number;
  light?: string;
  dark?: string;
  x?: number;
  z?: number;
}) {
  const planks = Math.max(6, Math.floor(width / 0.9));
  const pw = width / planks;
  return (
    <group position={[x, 0.005, z]}>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={dark} roughness={0.85} />
      </mesh>
      {Array.from({ length: planks }).map((_, i) => {
        const px = -width / 2 + pw / 2 + i * pw;
        const c = i % 2 === 0 ? light : dark;
        return (
          <mesh
            key={i}
            rotation-x={-Math.PI / 2}
            position={[px, 0.002, 0]}
            receiveShadow
          >
            <planeGeometry args={[pw * 0.96, depth * 0.998]} />
            <meshStandardMaterial color={c} roughness={0.78} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloatingBooksSculpture() {
  const group = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (group.current) group.current.rotation.y = s.clock.elapsedTime * 0.08;
  });
  const books = useMemo(() => {
    const arr: { p: [number, number, number]; r: [number, number, number]; c: string }[] = [];
    const palette = ["#a86b3c", "#7b5b3a", "#c79a5b", "#e2c89a", "#5d6b4a", "#8b3e2f"];
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const y = 2 + t * 4;
      const a = i * 1.7;
      const r = 1.6 + Math.sin(i * 0.7) * 0.5;
      arr.push({
        p: [Math.cos(a) * r, y, Math.sin(a) * r],
        r: [Math.random() * 0.6, a, Math.random() * 0.4],
        c: palette[i % palette.length],
      });
    }
    return arr;
  }, []);
  return (
    <group ref={group} position={[0, 0, 0]}>
      {books.map((b, i) => (
        <mesh key={i} position={b.p} rotation={b.r} castShadow>
          <boxGeometry args={[0.9, 1.2, 0.18]} />
          <meshStandardMaterial color={b.c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Architectural elements ----------
function Column({ position, height = WALL_H, radius = 0.32, color = MARBLE_COLOR }: {
  position: [number, number, number]; height?: number; radius?: number; color?: string;
}) {
  return (
    <group position={position}>
      {/* base */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[radius * 2.6, 0.24, radius * 2.6]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>
      {/* shaft */}
      <mesh position={[0, height / 2 + 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.05, height - 0.4, 24]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
      </mesh>
      {/* capital */}
      <mesh position={[0, height - 0.05, 0]} castShadow>
        <boxGeometry args={[radius * 2.6, 0.22, radius * 2.6]} />
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.18, 0.7]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.55} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.18, 0.5, 0.7]} />
          <meshStandardMaterial color={TRIM_COLOR} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function HangingLamp({ position, color = "#ffe6b5", intensity = 14 }: {
  position: [number, number, number]; color?: string; intensity?: number;
}) {
  return (
    <group position={position}>
      {/* cord */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.6, 6]} />
        <meshStandardMaterial color="#3a3022" />
      </mesh>
      {/* shade */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 0.45, 18, 1, true]} />
        <meshStandardMaterial color="#f7e8c2" emissive={color} emissiveIntensity={0.45} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, -0.3, 0]} intensity={intensity} distance={9} color={color} decay={1.8} />
    </group>
  );
}

function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.36, 0.6, 18]} />
        <meshStandardMaterial color="#e3d3a8" roughness={0.85} />
      </mesh>
      {/* foliage */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshStandardMaterial color="#6f8a5c" roughness={0.85} />
      </mesh>
      <mesh position={[0.25, 1.1, 0.1]} castShadow>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color="#7e9a66" roughness={0.85} />
      </mesh>
    </group>
  );
}

function GlassCase({ position, accent }: { position: [number, number, number]; accent: string }) {
  return (
    <group position={position}>
      {/* base */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.6, 0.8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      {/* glass */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.1, 1.1, 0.7]} />
        <meshPhysicalMaterial
          color="#eaf1ee"
          transmission={0.85}
          thickness={0.2}
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* tiny book inside */}
      <mesh position={[0, 0.7, 0]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.7]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position, rotationY = 0, width = 4.5 }: {
  position: [number, number, number]; rotationY?: number; width?: number;
}) {
  const shelves = 5;
  const h = 5.2;
  const palette = ["#7b3d2a", "#a86b3c", "#3e5a4a", "#8b6a3a", "#6b3a55", "#c79a5b", "#5b6b8a"];
  const books = useMemo(() => {
    const arr: { x: number; y: number; w: number; c: string }[] = [];
    for (let s = 0; s < shelves; s++) {
      let x = -width / 2 + 0.2;
      while (x < width / 2 - 0.2) {
        const w = 0.14 + Math.random() * 0.12;
        arr.push({
          x: x + w / 2,
          y: 0.6 + s * (h / shelves) + 0.18 + Math.random() * 0.05,
          w,
          c: palette[Math.floor(Math.random() * palette.length)],
        });
        x += w + 0.02;
      }
    }
    return arr;
  }, [width]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* frame */}
      <mesh position={[0, h / 2, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[width, h, 0.4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
      {/* shelf planks */}
      {Array.from({ length: shelves + 1 }).map((_, i) => (
        <mesh key={i} position={[0, 0.4 + i * (h / shelves), 0]} castShadow>
          <boxGeometry args={[width, 0.06, 0.45]} />
          <meshStandardMaterial color={TRIM_COLOR} roughness={0.5} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.05]} castShadow>
          <boxGeometry args={[b.w, 0.34, 0.22]} />
          <meshStandardMaterial color={b.c} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Local cover loader with elegant placeholder ----------
function CoverImg({ exhibit, className }: { exhibit: Exhibit; className?: string }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = `/covers/${exhibit.id}.jpg`;
  if (errored) {
    return (
      <div className={`lit-cover-fallback ${className ?? ""}`}>
        <span className="lit-cover-fallback-mark">❦</span>
        <span className="lit-cover-fallback-author">{exhibit.author}</span>
        <span className="lit-cover-fallback-title">{exhibit.work}</span>
        {exhibit.year && <span className="lit-cover-fallback-year">{exhibit.year}</span>}
      </div>
    );
  }
  return (
    <>
      {!loaded && <div className={`lit-cover-loading ${className ?? ""}`} aria-hidden />}
      <img
        src={src}
        alt={exhibit.work}
        draggable={false}
        className={className}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        style={loaded ? undefined : { display: "none" }}
      />
    </>
  );
}

// ---------- Exhibit ----------
function ExhibitNode({
  exhibit,
  roomId,
  worldPosition,
  facingY,
  accent,
  near,
  onNear,
  onOpen,
}: {
  exhibit: Exhibit;
  roomId: string;
  worldPosition: [number, number, number];
  facingY: number;
  accent: string;
  near: NearTarget | null;
  onNear: (n: NearTarget | null) => void;
  onOpen: () => void;
}) {
  const myPos = useMemo(() => new THREE.Vector3(...worldPosition), [worldPosition]);
  const isNear = near?.exhibitId === exhibit.id;

  useFrame(({ camera }) => {
    const d = camera.position.distanceTo(myPos);
    if (d < 4.2) {
      if (!isNear) onNear({ exhibitId: exhibit.id, roomId });
    } else if (isNear) {
      onNear(null);
    }
  });

  return (
    <group position={worldPosition} rotation={[0, facingY, 0]}>
      {/* directed spotlight on this exhibit */}
      <spotLight
        position={[0, 4.6, 1.2]}
        angle={0.5}
        penumbra={0.55}
        intensity={18}
        distance={9}
        color="#fff2cf"
        castShadow={false}
      />
      {/* pedestal */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.1, 1.2]} />
        <meshStandardMaterial color={PEDESTAL_COLOR} roughness={0.85} />
      </mesh>
      {/* accent trim */}
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[1.62, 0.04, 1.22]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {/* small velvet rope posts */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.3, 0.45, 0.9]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 10]} />
          <meshStandardMaterial color={accent} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      {/* book object on top */}
      <mesh position={[0, 1.27, 0]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.9, 0.18, 1.2]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* framed cover hovering on wall behind */}
      <Html
        position={[0, 2.5, -0.85]}
        transform
        occlude={false}
        distanceFactor={2.6}
        style={{ pointerEvents: "none" }}
      >
        <div className="lit-frame">
          <div className="lit-frame-author">{exhibit.author}</div>
          <CoverImg exhibit={exhibit} className="lit-frame-img" />
          <div className="lit-frame-title">{exhibit.work}</div>
        </div>
      </Html>

      {/* side info plaque */}
      <Html
        position={[1.55, 1.1, 0]}
        transform
        occlude={false}
        distanceFactor={2.2}
        rotation={[0, -0.35, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="lit-plaque" style={{ borderLeftColor: accent }}>
          <small>{exhibit.nationality ?? "Latinoamérica"}</small>
          <strong>{exhibit.author}</strong>
          <em>{exhibit.work}</em>
          {exhibit.year && <span>{exhibit.year}</span>}
        </div>
      </Html>

      {/* proximity hint */}
      {isNear && (
        <Html position={[0, 2.05, 0]} center distanceFactor={6}>
          <button
            className="lit-hint"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <span className="lit-hint-key">E</span>
            Presiona para explorar
          </button>
        </Html>
      )}
    </group>
  );
}

// ---------- Room ----------
function RoomShell({ room, onNear, onOpen, near }: {
  room: Room;
  near: NearTarget | null;
  onNear: (n: NearTarget | null) => void;
  onOpen: (e: Exhibit) => void;
}) {
  // Room is positioned so its "front" (door side) faces lobby (toward origin).
  // We place it at distance ROOM_DIST along room.angle.
  const cx = Math.cos(room.angle) * ROOM_DIST;
  const cz = Math.sin(room.angle) * ROOM_DIST;
  // Rotate the whole room so its local +z points away from the lobby.
  const rotY = -room.angle - Math.PI / 2;

  // Exhibits along back wall (negative-local-z, i.e. far from door)
  const n = room.exhibits.length;
  // Distribute: 3 on back wall, others on side walls if 4
  const placements: { pos: [number, number, number]; face: number; exhibit: Exhibit }[] = [];
  if (n <= 3) {
    room.exhibits.forEach((ex, i) => {
      const x = THREE.MathUtils.lerp(-ROOM_W / 2 + 3, ROOM_W / 2 - 3, n === 1 ? 0.5 : i / (n - 1));
      placements.push({ pos: [x, 0, -ROOM_D / 2 + 1.5], face: 0, exhibit: ex });
    });
  } else {
    // 4 exhibits: 2 on back, 1 on each side
    placements.push({ pos: [-3.5, 0, -ROOM_D / 2 + 1.5], face: 0, exhibit: room.exhibits[0] });
    placements.push({ pos: [3.5, 0, -ROOM_D / 2 + 1.5], face: 0, exhibit: room.exhibits[1] });
    placements.push({ pos: [-ROOM_W / 2 + 1.5, 0, -3], face: Math.PI / 2, exhibit: room.exhibits[2] });
    placements.push({ pos: [ROOM_W / 2 - 1.5, 0, -3], face: -Math.PI / 2, exhibit: room.exhibits[3] });
  }

  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.95} />
      </mesh>
      {/* walls: back, left, right; front has doorway */}
      <Wall position={[0, WALL_H / 2, -ROOM_D / 2]} size={[ROOM_W, WALL_H, WALL_T]} />
      <Wall position={[-ROOM_W / 2, WALL_H / 2, 0]} size={[WALL_T, WALL_H, ROOM_D]} />
      <Wall position={[ROOM_W / 2, WALL_H / 2, 0]} size={[WALL_T, WALL_H, ROOM_D]} />
      <WallWithDoor
        center={[0, 0, ROOM_D / 2]}
        length={ROOM_W}
        rotationY={0}
        doorWidth={DOOR_W}
      />
      {/* ceiling with central skylight */}
      <mesh rotation-x={Math.PI / 2} position={[0, WALL_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f9f2e1" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Skylight position={[0, WALL_H - 0.02, -2]} size={[ROOM_W * 0.5, ROOM_D * 0.4]} />

      {/* Room name plaque above door (visible from outside) */}
      <Html position={[0, WALL_H - 0.4, ROOM_D / 2 + 0.05]} transform distanceFactor={3} occlude={false}>
        <div className="lit-room-sign" style={{ borderColor: room.accent, color: room.accent }}>
          <span>{room.name}</span>
          <small>{room.curator}</small>
        </div>
      </Html>

      {/* exhibits */}
      {placements.map((p) => {
        // world position for proximity check
        const local = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
        const world = local.clone().applyEuler(new THREE.Euler(0, rotY, 0)).add(new THREE.Vector3(cx, 0, cz));
        return (
          <ExhibitNode
            key={p.exhibit.id}
            exhibit={p.exhibit}
            roomId={room.id}
            worldPosition={[world.x, world.y, world.z]}
            facingY={rotY + p.face}
            accent={room.accent}
            near={near}
            onNear={onNear}
            onOpen={() => onOpen(p.exhibit)}
          />
        );
      })}
    </group>
  );
}

// We need to attach ExhibitNode in world coords (not nested in the rotated room group) so the
// proximity check uses world camera position. So we re-implement: place ExhibitNodes outside
// the rotated room group using computed world positions; just render the room geometry inside
// the rotated group.
function RoomGeometry({ room }: { room: Room }) {
  const cx = Math.cos(room.angle) * ROOM_DIST;
  const cz = Math.sin(room.angle) * ROOM_DIST;
  const rotY = -room.angle - Math.PI / 2;
  // Floor variants by room accent for personality
  const floorColor = room.id === "bianca" ? "#ece1c4"
    : room.id === "jose-david" ? "#e7e0c8"
    : room.id === "luna" ? "#f0e2d6"
    : "#e3dec6";
  const quote = ROOM_QUOTES[room.id];
  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={floorColor} roughness={0.92} />
      </mesh>
      {/* central rug in accent color */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 1]} receiveShadow>
        <planeGeometry args={[ROOM_W * 0.55, ROOM_D * 0.55]} />
        <meshStandardMaterial color={room.accent} roughness={1} opacity={0.35} transparent />
      </mesh>
      {/* inlay border */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <ringGeometry args={[Math.min(ROOM_W, ROOM_D) * 0.32, Math.min(ROOM_W, ROOM_D) * 0.34, 48]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      <Wall position={[0, WALL_H / 2, -ROOM_D / 2]} size={[ROOM_W, WALL_H, WALL_T]} />
      <Wall position={[-ROOM_W / 2, WALL_H / 2, 0]} size={[WALL_T, WALL_H, ROOM_D]} />
      <Wall position={[ROOM_W / 2, WALL_H / 2, 0]} size={[WALL_T, WALL_H, ROOM_D]} />
      <WallWithDoor center={[0, 0, ROOM_D / 2]} length={ROOM_W} rotationY={0} doorWidth={DOOR_W} />
      <mesh rotation-x={Math.PI / 2} position={[0, WALL_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f9f2e1" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Skylight position={[0, WALL_H - 0.02, -2]} size={[ROOM_W * 0.5, ROOM_D * 0.4]} />
      {/* baseboard wood trim */}
      <mesh position={[0, 0.1, -ROOM_D / 2 + WALL_T / 2 + 0.01]}>
        <boxGeometry args={[ROOM_W, 0.2, 0.04]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      {/* corner columns */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Column key={i} position={[(sx as number) * (ROOM_W / 2 - 0.6), 0, (sz as number) * (ROOM_D / 2 - 0.6)]} />
      ))}
      {/* hanging lamps grid */}
      {[[-3.5, -4], [3.5, -4], [0, 2], [-3.5, 6], [3.5, 6]].map(([x, z], i) => (
        <HangingLamp key={i} position={[x, WALL_H - 1.4, z]} color={room.accent} intensity={10} />
      ))}
      {/* benches facing the back wall */}
      <Bench position={[-4, 0, 4]} rotationY={Math.PI} />
      <Bench position={[4, 0, 4]} rotationY={Math.PI} />
      {/* glass case in the middle */}
      <GlassCase position={[0, 0, -1.5]} accent={room.accent} />
      {/* planters by the door */}
      <Planter position={[-ROOM_W / 2 + 1.4, 0, ROOM_D / 2 - 1.6]} />
      <Planter position={[ROOM_W / 2 - 1.4, 0, ROOM_D / 2 - 1.6]} />
      {/* engraved quote on back wall */}
      {quote && (
        <Html
          position={[0, WALL_H - 1.6, -ROOM_D / 2 + WALL_T + 0.02]}
          transform
          occlude={false}
          distanceFactor={4.5}
          style={{ pointerEvents: "none" }}
        >
          <div className="lit-quote" style={{ color: room.accent }}>{quote}</div>
        </Html>
      )}
    </group>
  );
}

// ---------- Lobby ----------
function Lobby() {
  return (
    <group>
      {/* main floor: large beige plane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_DIST * 2 + ROOM_W, ROOM_DIST * 2 + ROOM_D]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.95} />
      </mesh>
      {/* central marble inlay */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial color={MARBLE_COLOR} roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[6.8, 7, 64]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      {/* compass star inlay */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((a, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, a]} position={[0, 0.015, 0]}>
          <planeGeometry args={[13.2, 0.06]} />
          <meshStandardMaterial color={TRIM_COLOR} opacity={0.55} transparent />
        </mesh>
      ))}

      {/* lobby outer walls (one per side) with door openings */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => {
        const x = Math.cos(a) * (LOBBY_SIZE / 2);
        const z = Math.sin(a) * (LOBBY_SIZE / 2);
        return (
          <WallWithDoor
            key={i}
            center={[x, 0, z]}
            length={LOBBY_SIZE}
            rotationY={-a + Math.PI / 2}
            doorWidth={DOOR_W + 1}
            height={WALL_H + 1}
          />
        );
      })}

      {/* high ceiling with grand skylight */}
      <mesh rotation-x={Math.PI / 2} position={[0, WALL_H + 1, 0]}>
        <planeGeometry args={[LOBBY_SIZE, LOBBY_SIZE]} />
        <meshStandardMaterial color="#f9f2e1" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Skylight position={[0, WALL_H + 0.98, 0]} size={[10, 10]} />

      {/* central floating books sculpture */}
      <FloatingBooksSculpture />

      {/* eight columns surrounding the rotunda */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const r = 9;
        return (
          <Column
            key={`col${i}`}
            position={[Math.cos(a) * r, 0, Math.sin(a) * r]}
            height={WALL_H + 1}
            radius={0.38}
          />
        );
      })}

      {/* tall library shelves in lobby corners */}
      {[
        { p: [-LOBBY_SIZE / 2 + 0.6, 0, -LOBBY_SIZE / 2 + 3], r: Math.PI / 2 },
        { p: [LOBBY_SIZE / 2 - 0.6, 0, -LOBBY_SIZE / 2 + 3], r: -Math.PI / 2 },
        { p: [-LOBBY_SIZE / 2 + 0.6, 0, LOBBY_SIZE / 2 - 3], r: Math.PI / 2 },
        { p: [LOBBY_SIZE / 2 - 0.6, 0, LOBBY_SIZE / 2 - 3], r: -Math.PI / 2 },
      ].map((s, i) => (
        <Bookshelf key={`bs${i}`} position={s.p as [number, number, number]} rotationY={s.r} width={5} />
      ))}

      {/* reading area: benches & planters in the four diagonals */}
      {[
        [-9, -9],
        [9, -9],
        [-9, 9],
        [9, 9],
      ].map(([x, z], i) => (
        <group key={`rd${i}`} position={[x, 0, z]}>
          <Bench position={[0, 0, 0]} rotationY={Math.atan2(-z, -x) + Math.PI / 2} />
          <Planter position={[1.6, 0, 0]} />
        </group>
      ))}

      {/* hanging lamps over the rotunda */}
      {[
        [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
      ].map((p, i) => (
        <HangingLamp key={`lp${i}`} position={[p[0], WALL_H - 0.6, p[2]]} color="#ffe4b0" intensity={16} />
      ))}

      {/* big floating museum title */}
      <Html position={[0, 7.6, 0]} center distanceFactor={9}>
        <div className="lit-museum-title">
          <small>MUSEO LITERARIO</small>
          <span>CANON LITERARIO ALTERNATIVO</span>
        </div>
      </Html>

      {/* directory: pedestal map at front */}
      <mesh position={[0, 0.6, 9]} castShadow>
        <boxGeometry args={[3, 1.2, 0.6]} />
        <meshStandardMaterial color={PEDESTAL_COLOR} roughness={0.9} />
      </mesh>
      <Html position={[0, 1.55, 9]} transform distanceFactor={3.2} rotation={[-0.4, 0, 0]}>
        <div className="lit-directory">
          <h4>DIRECTORIO</h4>
          <ul>
            {ROOMS.map((r) => (
              <li key={r.id}>
                <span style={{ background: r.accent }} />
                {r.name}
              </li>
            ))}
          </ul>
        </div>
      </Html>
    </group>
  );
}

// ---------- Scene ----------
function Scene({
  teleportTo,
  onPlayerMove,
  near,
  onNear,
  onOpen,
}: {
  teleportTo: [number, number, number] | null;
  onPlayerMove: (pos: THREE.Vector3) => void;
  near: NearTarget | null;
  onNear: (n: NearTarget | null) => void;
  onOpen: (e: Exhibit, r: Room) => void;
}) {
  return (
    <>
      <color attach="background" args={["#f4ecdc"]} />
      <fog attach="fog" args={["#f4ecdc", 40, 130]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff4d8", "#d8c9a5", 0.9]} />
      <directionalLight
        position={[20, 25, 10]}
        intensity={1.6}
        color="#fff6e3"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Suspense fallback={null}>
        <Sky sunPosition={[20, 25, 10]} turbidity={2} rayleigh={0.6} mieCoefficient={0.005} mieDirectionalG={0.7} />
      </Suspense>

      <Lobby />
      {ROOMS.map((r) => (
        <RoomGeometry key={r.id} room={r} />
      ))}

      {/* Exhibits live in world space so proximity checks work consistently */}
      {ROOMS.map((room) => {
        const cx = Math.cos(room.angle) * ROOM_DIST;
        const cz = Math.sin(room.angle) * ROOM_DIST;
        const rotY = -room.angle - Math.PI / 2;
        const n = room.exhibits.length;
        const local: { pos: [number, number, number]; face: number; ex: Exhibit }[] = [];
        if (n <= 3) {
          room.exhibits.forEach((ex, i) => {
            const x = THREE.MathUtils.lerp(-ROOM_W / 2 + 3, ROOM_W / 2 - 3, n === 1 ? 0.5 : i / (n - 1));
            local.push({ pos: [x, 0, -ROOM_D / 2 + 1.5], face: 0, ex });
          });
        } else {
          local.push({ pos: [-3.5, 0, -ROOM_D / 2 + 1.5], face: 0, ex: room.exhibits[0] });
          local.push({ pos: [3.5, 0, -ROOM_D / 2 + 1.5], face: 0, ex: room.exhibits[1] });
          local.push({ pos: [-ROOM_W / 2 + 1.5, 0, -3], face: Math.PI / 2, ex: room.exhibits[2] });
          local.push({ pos: [ROOM_W / 2 - 1.5, 0, -3], face: -Math.PI / 2, ex: room.exhibits[3] });
        }
        return local.map((p) => {
          const world = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2])
            .applyEuler(new THREE.Euler(0, rotY, 0))
            .add(new THREE.Vector3(cx, 0, cz));
          return (
            <ExhibitNode
              key={p.ex.id}
              exhibit={p.ex}
              roomId={room.id}
              worldPosition={[world.x, world.y, world.z]}
              facingY={rotY + p.face}
              accent={room.accent}
              near={near}
              onNear={onNear}
              onOpen={() => onOpen(p.ex, room)}
            />
          );
        });
      })}

      <Player teleportTo={teleportTo} onMove={onPlayerMove} />
    </>
  );
}

// ---------- App + HUD ----------
export function MuseumApp() {
  const [started, setStarted] = useState(false);
  const [teleport, setTeleport] = useState<[number, number, number] | null>(null);
  const [near, setNear] = useState<NearTarget | null>(null);
  const [active, setActive] = useState<{ exhibit: Exhibit; room: Room } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const nearRef = useRef<NearTarget | null>(null);
  const lastNearExhibitRef = useRef<{ exhibit: Exhibit; room: Room } | null>(null);

  // Track near in a ref for key handler
  useEffect(() => {
    nearRef.current = near;
    if (near) {
      for (const r of ROOMS) {
        const ex = r.exhibits.find((e) => e.id === near.exhibitId);
        if (ex) {
          lastNearExhibitRef.current = { exhibit: ex, room: r };
          break;
        }
      }
    } else if (active) {
      // Auto-close panel when player walks away
      setActive(null);
    }
  }, [near]);

  // Press E to open the currently-near exhibit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && nearRef.current && !active) {
        const cur = lastNearExhibitRef.current;
        if (cur && cur.exhibit.id === nearRef.current.exhibitId) {
          setActive(cur);
          setVisited((v) => new Set(v).add(cur.exhibit.id));
        }
      } else if (e.code === "Escape" && active) {
        setActive(null);
      } else if (e.code === "KeyM") {
        setShowMap((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const handleOpen = useCallback((exhibit: Exhibit, room: Room) => {
    setActive({ exhibit, room });
    setVisited((v) => new Set(v).add(exhibit.id));
  }, []);

  const goToRoom = (room: Room) => {
    // Position player just inside the room doorway, looking toward the back wall
    const cx = Math.cos(room.angle) * (ROOM_DIST - ROOM_D / 2 + 2);
    const cz = Math.sin(room.angle) * (ROOM_DIST - ROOM_D / 2 + 2);
    setTeleport([cx, 0, cz]);
    setTimeout(() => setTeleport(null), 60);
    setShowMap(false);
  };

  const goToLobby = () => {
    setTeleport([0, 0, 8]);
    setTimeout(() => setTeleport(null), 60);
  };

  const totalExhibits = ROOMS.reduce((a, r) => a + r.exhibits.length, 0);

  return (
    <div className="lit-root">
      <Canvas
        shadows
        camera={{ position: [0, 1.7, 10], fov: 65 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene
          teleportTo={teleport}
          onPlayerMove={() => {}}
          near={near}
          onNear={setNear}
          onOpen={handleOpen}
        />
        {started && <PointerLockControls />}
      </Canvas>

      {/* HUD */}
      <header className="lit-hud-top">
        <div className="lit-brand">
          <span className="lit-brand-mark" />
          <div>
            <small>MUSEO LITERARIO</small>
            <strong>Canon Alternativo</strong>
          </div>
        </div>
        <nav className="lit-hud-nav">
          <button className="lit-chip" onClick={() => setShowMap(true)}>Mapa</button>
          <button className="lit-chip" onClick={goToLobby}>Vestíbulo</button>
          <div className="lit-passport" title="Pasaporte literario">
            <span className="lit-passport-dot" />
            {visited.size}/{totalExhibits} sellos
          </div>
        </nav>
      </header>

      <footer className="lit-hud-bottom">
        <span>WASD · Caminar</span>
        <span>Mouse · Mirar</span>
        <span>Shift · Correr</span>
        <span><kbd>E</kbd> · Explorar</span>
        <span><kbd>M</kbd> · Mapa</span>
      </footer>

      {/* Start overlay */}
      {!started && (
        <div className="lit-start">
          <div className="lit-start-card">
            <div className="lit-start-eyebrow">EXPOSICIÓN VIRTUAL · 2026</div>
            <h1>Canon Literario<br />Alternativo</h1>
            <p>
              Un museo recorrible en primera persona dedicado a las voces históricamente
              excluidas del canon: literatura LGBTQIA+, andina, amazónica, indígena y feminista
              de América Latina.
            </p>
            <button className="lit-cta" onClick={() => setStarted(true)}>
              Entrar al museo →
            </button>
            <div className="lit-start-hint">
              Clic para activar la mirada · <kbd>Esc</kbd> para liberar el cursor
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      {showMap && (
        <div className="lit-map" onClick={() => setShowMap(false)}>
          <div className="lit-map-card" onClick={(e) => e.stopPropagation()}>
            <header>
              <small>PLANO DEL MUSEO</small>
              <button className="lit-x" onClick={() => setShowMap(false)}>✕</button>
            </header>
            <div className="lit-map-grid">
              <button className="lit-map-tile lit-map-lobby" onClick={goToLobby}>
                <small>VESTÍBULO</small>
                <strong>Canon Alternativo</strong>
              </button>
              {ROOMS.map((r) => {
                const seen = r.exhibits.filter((e) => visited.has(e.id)).length;
                return (
                  <button
                    key={r.id}
                    className="lit-map-tile"
                    onClick={() => goToRoom(r)}
                    style={{ borderColor: r.accent }}
                  >
                    <small style={{ color: r.accent }}>SALA</small>
                    <strong>{r.name}</strong>
                    <ul>
                      {r.exhibits.map((ex) => (
                        <li key={ex.id} className={visited.has(ex.id) ? "seen" : ""}>
                          {ex.author} — <em>{ex.work}</em>
                        </li>
                      ))}
                    </ul>
                    <span className="lit-map-meta">{seen}/{r.exhibits.length} visitadas</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exhibit panel */}
      {active && <ExhibitPanel data={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function ExhibitPanel({ data, onClose }: { data: { exhibit: Exhibit; room: Room }; onClose: () => void }) {
  const { exhibit, room } = data;
  const [expanded, setExpanded] = useState(false);
  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=f4ecdc&color=2a2419&data=${encodeURIComponent(
        exhibit.qrUrl || `https://www.google.com/search?q=${encodeURIComponent(exhibit.author + " " + exhibit.work)}`,
      )}`,
    [exhibit],
  );
  return (
    <div className="lit-panel-wrap" onClick={onClose}>
      <article className="lit-panel" onClick={(e) => e.stopPropagation()}>
        <header className="lit-panel-head" style={{ borderTopColor: room.accent }}>
          <div>
            <small style={{ color: room.accent }}>{room.name}</small>
            <h2>{exhibit.author}</h2>
            {exhibit.nationality && <p className="lit-panel-nat">{exhibit.nationality}</p>}
          </div>
          <button className="lit-x" onClick={onClose}>✕</button>
        </header>
        <div className="lit-panel-body">
          <figure className="lit-panel-cover">
            <CoverImg exhibit={exhibit} className="lit-panel-cover-img" />
            <figcaption>
              <em>{exhibit.work}</em>
              {exhibit.year && <span> · {exhibit.year}</span>}
            </figcaption>
          </figure>
          <div className="lit-panel-text">
            <h3>Descripción</h3>
            <p>{exhibit.description}</p>
            <h3>¿Por qué merece estar en el canon?</h3>
            <p>{exhibit.why}</p>

            <button className="lit-toggle" onClick={() => setExpanded((s) => !s)}>
              {expanded ? "Ocultar materiales" : "Ver materiales complementarios"} {expanded ? "▴" : "▾"}
            </button>
            {expanded && (
              <div className="lit-extra">
                <div className="lit-qr">
                  <img src={qrSrc} alt="QR" />
                  <small>Escanea para leer más</small>
                </div>
                <ul className="lit-resources">
                  <li>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(exhibit.author + " " + exhibit.work)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buscar en la web →
                    </a>
                  </li>
                  <li>
                    <a
                      href={`https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(exhibit.author)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Biografía en Wikipedia →
                    </a>
                  </li>
                  <li>
                    <a
                      href={`https://www.goodreads.com/search?q=${encodeURIComponent(exhibit.work)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Reseñas en Goodreads →
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}