"use client";


import React, { useRef, useMemo, useLayoutEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars, PerspectiveCamera, Environment } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration
} from "@react-three/postprocessing";
import * as THREE from "three";

/* ── Deterministic PRNG ── */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ═══════════════════════════════════════════════
   MICRO-DETAIL GREEBLES (Clean & Organized)
   ═══════════════════════════════════════════════ */
function MicroGreebles() {
  // Reduced count, more organized placement to look like capacitors/resistors
  const count = 200;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const rand = seededRandom(1337);

    let idx = 0;
    for (let i = 0; i < count; i++) {
      // Uniform small components (capacitors)
      const w = 0.04;
      const h = 0.08;
      const d = 0.02;

      // Distribution: Structured rows/clusters
      let x, y;
      if (i < 100) {
        // Top/Bottom rows
        x = (rand() - 0.5) * 2.8;
        y = (rand() > 0.5 ? 1 : -1) * (1.0 + rand() * 0.4);
      } else {
        // Side columns
        x = (rand() > 0.5 ? 1 : -1) * (1.0 + rand() * 0.4);
        y = (rand() - 0.5) * 2.8;
      }

      dummy.position.set(x, y, 0.08 + d / 2);
      dummy.scale.set(w, h, d);
      dummy.rotation.z = rand() > 0.5 ? 0 : Math.PI / 2; // Align 90 deg
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(idx++, dummy.matrix);
    }
    meshRef.current.count = idx;
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#444444" // Significantly brighter grey for visibility
        roughness={0.4}
        metalness={0.9} // More metallic to catch env light
      />
    </instancedMesh>
  );
}


/* ═══════════════════════════════════════════════
   NEURAL CHIP CORE — Ultra High Fidelity
   ═══════════════════════════════════════════════ */

function NeuralChip() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreLightRef = useRef<THREE.PointLight>(null!);

  // 1. Chip Base (Main Substrate) - Physical Material
  const chipBaseGeo = useMemo(() => new THREE.BoxGeometry(3.2, 3.2, 0.15), []);

  // 2. Pins (High density, thinner, metallic, perfectly aligned)
  const pinsGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const count = 100; // Even higher density for premium look
    const size = 3.22;
    const pinW = 0.012;
    const pinL = 0.12;

    const addPin = (x: number, y: number, w: number, h: number) => {
      const z = 0.0;
      vertices.push(
        x - w, y - h, z, x + w, y - h, z, x + w, y + h, z,
        x - w, y - h, z, x + w, y + h, z, x - w, y + h, z
      );
    };

    for (let i = 0; i < count; i++) {
      const offset = (i / (count - 1) - 0.5) * size * 0.99;
      // Top/Bottom
      addPin(offset, size / 2 + pinL / 2, pinW, pinL);
      addPin(offset, -size / 2 - pinL / 2, pinW, pinL);
      // Left/Right
      addPin(size / 2 + pinL / 2, offset, pinL, pinW);
      addPin(-size / 2 - pinL / 2, offset, pinL, pinW);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  // 4, Circuit Lines (Multi-Layered - Cleaner, Straighter)
  const denseCircuitGeo = useMemo(() => createCircuitGeo(80, 0.3, 42), []); // Reduced chaos
  const activeCircuitGeo = useMemo(() => createCircuitGeo(20, 0.6, 99), []);

  /* ── Animation loop ── */
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Much smoother, slower float for "clean" feel
      groupRef.current.rotation.x = Math.sin(t * 0.05) * 0.08;
      groupRef.current.rotation.y = Math.sin(t * 0.03) * 0.12;
    }
    if (coreLightRef.current) {
      // Smooth breathing, NO FLICKER
      coreLightRef.current.intensity = 8.0 + Math.sin(t * 1.5) * 2.0;
    }
  });

  return (
    <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={groupRef} rotation={[0.4, -0.2, 0]}>

        {/* A. Substrate Layer (Clean, Matte/Satin Finish) */}
        <mesh geometry={chipBaseGeo}>
          <meshPhysicalMaterial
            color="#151515" // Much lighter than #080808
            roughness={0.35}
            metalness={0.5}
            clearcoat={0.3} // Reduced clearcoat to reduce messy reflections
            clearcoatRoughness={0.2}
          />
        </mesh>

        {/* B. Pins Layer (Clean Gold) */}
        <mesh geometry={pinsGeo}>
          <meshStandardMaterial
            color="#ffcc44" // Brighter gold
            metalness={1.0}
            roughness={0.15}
            emissive="#aa6600"
            emissiveIntensity={0.2} // Slight self-illumination
          />
        </mesh>

        {/* C. Micro-Detail Greebles (Organized) */}
        <MicroGreebles />

        {/* D. COMPLEX CORE ASSEMBLY (Pristine Glass) */}
        <group position={[0, 0, 0.1]}>
          {/* 1. Base Plate */}
          <mesh>
            <boxGeometry args={[1.4, 1.4, 0.02]} />
            <meshStandardMaterial color="#101010" roughness={0.3} metalness={0.8} />
          </mesh>

          {/* 2. Inner Heat Spreader (Matte Metal) */}
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.9, 0.9, 0.04]} />
            <meshPhysicalMaterial
              color="#333333"
              metalness={1.0}
              roughness={0.3}
            />
          </mesh>

          {/* 3. The "Die" (Clean Light Source) */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.4, 0.4, 0.01]} />
            <meshBasicMaterial color="#ff0066" />
          </mesh>

          {/* 4. Glass Shield (Perfectly Clear) */}
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[1.1, 1.1, 0.04]} />
            <meshPhysicalMaterial
              transmission={1.0}
              roughness={0.0} // Perfect glass
              thickness={0.05}
              ior={1.5}
              color="#ffffff"
              attenuationColor="#ffffff"
              attenuationDistance={1}
            />
          </mesh>
        </group>

        {/* E. Core Light */}
        <pointLight ref={coreLightRef} position={[0, 0, 0.5]} color="#ff0044" distance={5} decay={2} />

        {/* F. Circuits */}
        {/* Passive Dark Traces - Thinner, subtler */}
        <lineSegments geometry={denseCircuitGeo} position={[0, 0, 0.081]}>
          <lineBasicMaterial color="#aa3355" opacity={0.3} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>

        {/* Active Glowing Traces - Clean distinct paths */}
        <lineSegments geometry={activeCircuitGeo} position={[0, 0, 0.082]}>
          <lineBasicMaterial color="#ff0066" opacity={0.9} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </lineSegments>

      </group>
    </Float>
  );
}

// Helper for circuit generation
function createCircuitGeo(count: number, variance: number, seed: number) {
  const points: THREE.Vector3[] = [];
  const rand = seededRandom(seed);

  // More structured, less "spaghetti"
  for (let i = 0; i < count; i++) {
    const startEdge = Math.floor(rand() * 4);
    // Constrain start points to grid-ish locations
    const offset = Math.round((rand() - 0.5) * 2.8 * variance * 10) / 10;

    let startX = 0, startY = 0;
    if (startEdge === 0) { startX = offset; startY = 1.3; }
    else if (startEdge === 1) { startX = 1.3; startY = offset; }
    else if (startEdge === 2) { startX = offset; startY = -1.3; }
    else { startX = -1.3; startY = offset; }

    // End points near center but not IN center
    const endX = Math.round((rand() - 0.5) * 0.8 * 10) / 10;
    const endY = Math.round((rand() - 0.5) * 0.8 * 10) / 10;

    const p1 = new THREE.Vector3(startX, startY, 0);
    const p2 = new THREE.Vector3(startX, endY, 0); // Orthogonal step 1
    const p3 = new THREE.Vector3(endX, endY, 0);   // Orthogonal step 2

    points.push(p1, p2, p2, p3);
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}


/* ═══════════════════════════════════════════════
   ECOSYSTEM & PARTICLES
   ═══════════════════════════════════════════════ */

function NetworkLines() {
  const linesGeo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const rand = seededRandom(555);
    // Reduced count for cleanliness
    for (let i = 0; i < 40; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 2.0;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (rand() - 0.5) * 0.2; // Flatter

      const length = 4.0 + rand() * 6.0;
      const p1 = new THREE.Vector3(x, y, z);
      const p2 = p1.clone().add(p1.clone().normalize().multiplyScalar(length));

      points.push(p1, p2);
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group position={[0, 0, -1]}>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial
          color="#aa0044"
          transparent
          opacity={0.1} // Very subtle
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 400; // Reduced density

  const positions = useMemo(() => {
    const rand = seededRandom(999);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Volumetric distribution
      arr[i * 3] = (rand() - 0.5) * 30;
      arr[i * 3 + 1] = (rand() - 0.5) * 20;
      arr[i * 3 + 2] = (rand() - 0.5) * 15;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.02; // Slow rotation
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ff0088" // Pinker
        size={0.02}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════
   CINEMATIC LIGHTING (Clean & Studio-like)
   ═══════════════════════════════════════════════ */

function SceneLights() {
  const movLight = useRef<THREE.SpotLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (movLight.current) {
      // Slow, deliberate movement of rim light
      movLight.current.position.x = Math.sin(t * 0.2) * 12;
      movLight.current.position.z = Math.cos(t * 0.2) * 12;
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} color="#110511" /> {/* Boosted Ambient */}

      {/* Main Top Light - Soft box */}
      <spotLight
        position={[2, 10, 5]}
        angle={0.5}
        penumbra={0.5} // Very soft edges
        intensity={300}
        color="#ff00aa"
        castShadow
        distance={40}
        decay={2}
      />

      {/* Moving Rim Light - Sharp but slow */}
      <spotLight
        ref={movLight}
        position={[-10, 0, 5]}
        angle={0.3}
        penumbra={0.5}
        intensity={300}
        color="#00aaff" // Cyan
        distance={40}
        decay={2}
      />

      {/* Strong Front Fill to reveal details */}
      <pointLight position={[0, 0, 8]} intensity={50} color="#ffffff" distance={20} decay={2} />

      {/* Underglow */}
      <pointLight position={[0, -5, 2]} intensity={50} color="#330066" distance={20} decay={2} />
    </>
  );
}

/* ═══════════════════════════════════════════════
   POST PROCESSING
   ═══════════════════════════════════════════════ */

function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        mipmapBlur
        intensity={1.0}
        radius={0.3}
      />
      <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
      <Vignette eskil={false} offset={0.1} darkness={0.6} /> {/* Lighter vignette */}
      <Noise opacity={0.03} />
    </EffectComposer>
  );
}

/* ═══════════════════════════════════════════════
   HTML TEXT OVERLAY
   ═══════════════════════════════════════════════ */

function TextOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          paddingLeft: "clamp(2rem, 8vw, 8rem)",
          maxWidth: "50%",
        }}
      >
        {/* Welcome label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{
              color: "#ff0088",
              fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              fontWeight: 300,
            }}
          >
            S-Series 2
          </span>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "2.5rem",
            height: "1px",
            background: "linear-gradient(90deg, #ff0088, transparent)",
            marginBottom: "2rem",
          }}
        />

        {/* Main heading */}
        <h1
          style={{
            margin: 0,
            padding: 0,
            lineHeight: 1.1,
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              color: "#ff0088",
              letterSpacing: "0.35em",
              textTransform: "uppercase" as const,
              textShadow: "0 0 30px rgba(255,0,102,0.4)"
            }}
          >
            NEURAL
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(2rem, 5vw, 4.5rem)",
              color: "#ffffff",
              letterSpacing: "0.45em",
              textTransform: "uppercase" as const,
              marginTop: "0.15em",
            }}
          >
            CORE
          </span>
          <span
            style={{
              display: "block",
              fontSize: "clamp(2rem, 5vw, 4.5rem)",
              color: "#ffffff",
              letterSpacing: "0.45em",
              textTransform: "uppercase" as const,
              marginTop: "0.15em",
            }}
          >
            ACTIVE
          </span>
        </h1>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════ */

export default function AIHeroScene() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#080008", // Dark purple/black background
      }}
    >
      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        shadows
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />

        {/* Atmosphere */}
        <fog attach="fog" args={["#080008", 8, 35]} />
        <color attach="background" args={["#050005"]} />

        <Environment preset="city" blur={1} /> {/* Added Environment for metal reflections */}

        <SceneLights />

        <NeuralChip />
        <NetworkLines />
        <ParticleField />

        <Stars
          radius={60}
          depth={40}
          count={2000}
          factor={4}
          saturation={0.5}
          fade
          speed={0.2}
        />

        <PostProcessing />
      </Canvas>

      <TextOverlay />
    </section>
  );
}
