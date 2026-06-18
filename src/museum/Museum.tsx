import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Html, Environment, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DEFAULT_ROOMS, type Exhibit, type Room } from "./types";

// ---------- Movement (WASD + pointer lock) ----------
function Player({ teleportTo }: { teleportTo: [number, number, number] | null }) {
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
      camera.position.set(teleportTo[0], 1.7, teleportTo[2] + 6);
      camera.lookAt(teleportTo[0], 1.7, teleportTo[2]);
    }
  }, [teleportTo, camera]);

  useFrame((_, dt) => {
    const speed = (keys.current["ShiftLeft"] ? 12 : 6) * dt;
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
      velocity.current.lerp(dir, 0.4);
    } else {
      velocity.current.lerp(new THREE.Vector3(), 0.2);
    }
    camera.position.add(velocity.current);
    // soft bounds
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -60, 60);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -70, 50);
    camera.position.y = 1.7;
  });

  return null;
}

// ---------- Architecture pieces ----------
function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0c0d12" roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

function LightStrip({ position, length = 20, color = "#5fb8ff" }: { position: [number, number, number]; length?: number; color?: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[length, 0.05, 0.15]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
    </mesh>
  );
}

function Lobby() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ringRef.current) ringRef.current.rotation.y = s.clock.elapsedTime * 0.1;
  });
  return (
    <group>
      {/* circular lobby disc */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[8, 12, 64]} />
        <meshStandardMaterial color="#13151c" emissive="#1a2a44" emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[10.4, 10.7, 128]} />
        <meshStandardMaterial color="#5fb8ff" emissive="#5fb8ff" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* atrium columns */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 9.5;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 4, Math.sin(a) * r]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 8, 16]} />
            <meshStandardMaterial color="#1a1c24" metalness={0.8} roughness={0.3} />
          </mesh>
        );
      })}
      {/* atrium light ring above */}
      <mesh position={[0, 8.1, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[6, 6.3, 64]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 7, 0]} intensity={40} distance={30} color="#7dd3fc" />
    </group>
  );
}

function Corridor({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, 0, (from[2] + to[2]) / 2];
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  return (
    <group position={mid} rotation={[0, -angle, 0]}>
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[len, 3]} />
        <meshStandardMaterial color="#15171f" emissive="#0a1525" emissiveIntensity={0.6} />
      </mesh>
      <LightStrip position={[0, 0.03, 1.4]} length={len} />
      <LightStrip position={[0, 0.03, -1.4]} length={len} />
    </group>
  );
}

// ---------- Room shells ----------
function RoomShell({ position, hue, children }: { position: [number, number, number]; hue: number; children?: React.ReactNode }) {
  const accent = `hsl(${hue} 90% 65%)`;
  return (
    <group position={position}>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#11131a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* curved back wall (half cylinder) */}
      <mesh position={[0, 3, -6]} castShadow>
        <cylinderGeometry args={[9, 9, 6, 48, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#0f1117" side={THREE.DoubleSide} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* floor accent ring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[9.4, 9.6, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5, 0]} intensity={25} distance={20} color={accent} />
      <spotLight position={[0, 6, 4]} angle={0.5} intensity={30} penumbra={0.5} target-position={[0, 1, 0]} color="#ffffff" />
      {children}
    </group>
  );
}

function ExhibitPlatform({ exhibit, hue, onOpen }: { exhibit: Exhibit; hue: number; onOpen: () => void }) {
  const bookRef = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (bookRef.current) {
      bookRef.current.rotation.y = s.clock.elapsedTime * 0.4;
      bookRef.current.position.y = 1.6 + Math.sin(s.clock.elapsedTime * 1.2) * 0.08;
    }
  });
  const accent = `hsl(${hue} 90% 65%)`;
  return (
    <group>
      {/* platform */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[1.4, 1.6, 1, 32]} />
        <meshStandardMaterial color="#1a1d27" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.01, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.3, 1.42, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* floating book placeholder */}
      <group ref={bookRef} position={[0, 1.6, 0]} onClick={onOpen}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 1, 0.15]} />
          <meshStandardMaterial color="#0f1218" metalness={0.5} roughness={0.4} emissive={accent} emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[0.55, 0.85]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
      {/* floating info badge */}
      <Html position={[0, 2.9, 0]} center distanceFactor={8} occlude={false}>
        <div className="museum-badge" onClick={onOpen}>
          <div className="museum-badge-eyebrow">EXHIBIT</div>
          <div className="museum-badge-title">{exhibit.title}</div>
          <div className="museum-badge-meta">{exhibit.author} · {exhibit.date}</div>
          <div className="museum-badge-cta">Open panel ▸</div>
        </div>
      </Html>
    </group>
  );
}

function TimelineHall() {
  const events = ["Antiquity", "Medieval", "Renaissance", "Enlightenment", "Romanticism", "Modernism", "Contemporary"];
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[8, 30]} />
        <meshStandardMaterial color="#11131a" metalness={0.5} roughness={0.5} />
      </mesh>
      <LightStrip position={[-3.5, 0.03, 0]} length={30} color="#7dd3fc" />
      <LightStrip position={[3.5, 0.03, 0]} length={30} color="#a78bfa" />
      {events.map((e, i) => {
        const z = -13 + i * 4.3;
        return (
          <group key={e} position={[0, 0, z]}>
            <mesh position={[0, 1.5, 0]}>
              <boxGeometry args={[0.1, 3, 0.1]} />
              <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
            <Html position={[0, 2.6, 0]} center distanceFactor={9}>
              <div className="museum-tl-node">{e}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function AuthorGallery() {
  return (
    <group>
      {[-5, 0, 5].map((x) => (
        <group key={x} position={[x, 0, -4]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[2.4, 3.2, 0.15]} />
            <meshStandardMaterial color="#15171f" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.85, 0.09]}>
            <planeGeometry args={[2.1, 2.9]} />
            <meshStandardMaterial color="#1f2230" emissive="#5fb8ff" emissiveIntensity={0.4} />
          </mesh>
          <Html position={[0, 0.6, 0.1]} center distanceFactor={9}>
            <div className="museum-portrait-label">Author Placeholder</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function ReflectionRoom() {
  return (
    <group>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 0.4, 2]} castShadow>
          <boxGeometry args={[1.6, 0.8, 1.4]} />
          <meshStandardMaterial color="#1a1d27" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <Html position={[0, 2.8, -5]} center distanceFactor={9}>
        <div className="museum-quote">“A room of quiet, for thoughts that need space.”</div>
      </Html>
      <pointLight position={[0, 4, 0]} color="#a78bfa" intensity={20} distance={18} />
    </group>
  );
}

function RoomMarker({ room, onTeleport }: { room: Room; onTeleport: (r: Room) => void }) {
  return (
    <Html position={[room.position[0], 4.5, room.position[2]]} center distanceFactor={12} occlude={false}>
      <button className="museum-portal" onClick={() => onTeleport(room)}>
        <span className="museum-portal-dot" />
        {room.name}
      </button>
    </Html>
  );
}

// ---------- Scene ----------
export function MuseumScene({
  rooms,
  onOpenExhibit,
  teleportTo,
  onTeleport,
}: {
  rooms: Room[];
  onOpenExhibit: (r: Room) => void;
  teleportTo: [number, number, number] | null;
  onTeleport: (r: Room) => void;
}) {
  return (
    <>
      <color attach="background" args={["#06070b"]} />
      <fog attach="fog" args={["#06070b", 30, 110]} />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#88b8ff", "#0a0a14", 0.4]} />
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
      <Stars radius={120} depth={60} count={1500} factor={3} fade speed={0.5} />

      <Floor />
      <Lobby />

      {rooms.map((r) => (
        <group key={r.id}>
          <Corridor from={[0, 0, 0]} to={r.position} />
          <RoomShell position={r.position} hue={r.hue}>
            {r.kind === "exhibit" && r.exhibit && (
              <ExhibitPlatform exhibit={r.exhibit} hue={r.hue} onOpen={() => onOpenExhibit(r)} />
            )}
            {r.kind === "timeline" && <TimelineHall />}
            {r.kind === "gallery" && <AuthorGallery />}
            {r.kind === "reflection" && <ReflectionRoom />}
          </RoomShell>
          <RoomMarker room={r} onTeleport={onTeleport} />
        </group>
      ))}

      {/* Title above plaza */}
      <Html position={[0, 9, 14]} center distanceFactor={14}>
        <div className="museum-title">LITERATURA · MUSEUM</div>
      </Html>

      <Player teleportTo={teleportTo} />
    </>
  );
}

// ---------- UI Overlay ----------
export function MuseumApp() {
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [activeExhibit, setActiveExhibit] = useState<Room | null>(null);
  const [teleport, setTeleport] = useState<[number, number, number] | null>(null);
  const [started, setStarted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const controlsRef = useRef<any>(null);

  const update = (roomId: string, patch: Partial<Exhibit>) => {
    setRooms((rs) =>
      rs.map((r) =>
        r.id === roomId && r.exhibit ? { ...r, exhibit: { ...r.exhibit, ...patch } } : r
      )
    );
    setActiveExhibit((cur) =>
      cur && cur.id === roomId && cur.exhibit ? { ...cur, exhibit: { ...cur.exhibit, ...patch } } : cur
    );
  };

  const goTo = (r: Room) => {
    setTeleport([r.position[0], 0, r.position[2]]);
    setTimeout(() => setTeleport(null), 50);
    setShowMap(false);
  };

  return (
    <div className="museum-root">
      <Canvas
        shadows
        camera={{ position: [0, 1.7, 22], fov: 70 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <MuseumScene
          rooms={rooms}
          onOpenExhibit={(r) => setActiveExhibit(r)}
          teleportTo={teleport}
          onTeleport={goTo}
        />
        {started && <PointerLockControls ref={controlsRef} />}
      </Canvas>

      {/* HUD */}
      <div className="museum-hud-top">
        <div className="museum-logo">
          <span className="museum-logo-dot" />
          LITERATURA
        </div>
        <div className="museum-hud-right">
          <button className="museum-chip" onClick={() => setShowMap((s) => !s)}>
            Map
          </button>
          <button
            className="museum-chip"
            onClick={() => goTo({ id: "lobby", name: "Lobby", kind: "exhibit", position: [0, 0, 0], hue: 220 })}
          >
            Return to Lobby
          </button>
        </div>
      </div>

      <div className="museum-hud-bottom">
        <span>WASD / Arrows · Move</span>
        <span>Mouse · Look</span>
        <span>Shift · Run</span>
        <span>Click portals · Teleport</span>
      </div>

      {/* Start overlay */}
      {!started && (
        <div className="museum-overlay">
          <div className="museum-overlay-card">
            <div className="museum-overlay-eyebrow">VIRTUAL EXHIBITION</div>
            <h1>Literatura Museum</h1>
            <p>
              A futuristic, walkable exhibition space for literary works. Wander the atrium, step into halls,
              and curate any book, manuscript, or author with editable holographic panels.
            </p>
            <button
              className="museum-cta"
              onClick={() => setStarted(true)}
            >
              Enter the Museum →
            </button>
            <div className="museum-overlay-hint">Click to engage mouse-look. Press <kbd>Esc</kbd> to release.</div>
          </div>
        </div>
      )}

      {/* Map */}
      {showMap && (
        <div className="museum-map" onClick={() => setShowMap(false)}>
          <div className="museum-map-card" onClick={(e) => e.stopPropagation()}>
            <div className="museum-map-title">Museum Map</div>
            <div className="museum-map-grid">
              <div className="museum-map-lobby">Lobby</div>
              {rooms.map((r) => (
                <button key={r.id} className="museum-map-room" onClick={() => goTo(r)}>
                  <span style={{ background: `hsl(${r.hue} 90% 65%)` }} />
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exhibit Panel */}
      {activeExhibit && activeExhibit.exhibit && (
        <div className="museum-panel-wrap" onClick={() => setActiveExhibit(null)}>
          <div className="museum-panel" onClick={(e) => e.stopPropagation()}>
            <div className="museum-panel-head">
              <div className="museum-panel-eyebrow">{activeExhibit.name}</div>
              <button className="museum-close" onClick={() => setActiveExhibit(null)}>✕</button>
            </div>
            <ExhibitEditor
              exhibit={activeExhibit.exhibit}
              onChange={(patch) => update(activeExhibit.id, patch)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ExhibitEditor({ exhibit, onChange }: { exhibit: Exhibit; onChange: (p: Partial<Exhibit>) => void }) {
  const [edit, setEdit] = useState(false);
  const qrSrc = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=10-12-18&color=7dd3fc&data=${encodeURIComponent(exhibit.qrUrl || "https://example.com")}`,
    [exhibit.qrUrl]
  );

  const field = (label: string, key: keyof Exhibit, multiline = false) => (
    <div className="museum-field">
      <div className="museum-field-label">{label}</div>
      {edit ? (
        multiline ? (
          <textarea value={exhibit[key]} onChange={(e) => onChange({ [key]: e.target.value } as Partial<Exhibit>)} rows={3} />
        ) : (
          <input value={exhibit[key]} onChange={(e) => onChange({ [key]: e.target.value } as Partial<Exhibit>)} />
        )
      ) : (
        <div className="museum-field-value">{exhibit[key] || "—"}</div>
      )}
    </div>
  );

  return (
    <div className="museum-panel-body">
      <div className="museum-panel-headline">
        <div>
          <h2>{exhibit.title}</h2>
          <div className="museum-byline">{exhibit.author} · {exhibit.date}</div>
        </div>
        <button className="museum-chip" onClick={() => setEdit((v) => !v)}>
          {edit ? "Done" : "Edit"}
        </button>
      </div>

      <div className="museum-grid">
        {field("Title", "title")}
        {field("Author", "author")}
        {field("Publication date", "date")}
        {field("Literary movement", "movement")}
        {field("Genre", "genre")}
        {field("External link (QR)", "qrUrl")}
      </div>

      {field("Summary", "summary", true)}
      {field("Literary analysis", "analysis", true)}
      {field("Historical context", "context", true)}

      <div className="museum-multimedia">
        <div className="museum-multimedia-col">
          <div className="museum-field-label">QR / external resources</div>
          <div className="museum-qr">
            <img src={qrSrc} alt="QR" />
            <a href={exhibit.qrUrl} target="_blank" rel="noreferrer">{exhibit.qrUrl}</a>
          </div>
        </div>
        <div className="museum-multimedia-col">
          <div className="museum-field-label">Multimedia slots</div>
          <div className="museum-slots">
            <div className="museum-slot">Image</div>
            <div className="museum-slot">Video</div>
            <div className="museum-slot">Audio</div>
            <div className="museum-slot">Timeline</div>
            <div className="museum-slot">Map</div>
            <div className="museum-slot">Characters</div>
          </div>
        </div>
      </div>
    </div>
  );
}