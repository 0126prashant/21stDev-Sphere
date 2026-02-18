"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import * as THREE from "three";

/* ── Deterministic PRNG (avoids SSR hydration mismatch) ── */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ═══════════════════════════════════════════════
   AI CORE SPHERE — layered geometry with
   inner core, glowing wireframe, energy panels,
   and energy beams
   ═══════════════════════════════════════════════ */

function AICoreSphere() {
  const groupRef = useRef<THREE.Group>(null!);
  const panelLightRef = useRef<THREE.PointLight>(null!);
  const innerGlowRef = useRef<THREE.Mesh>(null!);

  /* ── Geometry ── */
  const icoGeo = useMemo(() => new THREE.IcosahedronGeometry(2.0, 1), []);
  const smoothGeo = useMemo(() => new THREE.IcosahedronGeometry(1.92, 3), []);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(icoGeo, 1), [icoGeo]);

  /* ── Edge colors: varied brightness for realism ── */
  useMemo(() => {
    const rand = seededRandom(42);
    const count = edgesGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const b = rand();
      if (b > 0.75) {
        colors[i * 3] = 0.15;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.85;
      } else if (b > 0.4) {
        colors[i * 3] = 0.05;
        colors[i * 3 + 1] = 0.6 + b * 0.3;
        colors[i * 3 + 2] = 0.5 + b * 0.2;
      } else {
        colors[i * 3] = 0.02;
        colors[i * 3 + 1] = 0.25 + b * 0.2;
        colors[i * 3 + 2] = 0.22 + b * 0.15;
      }
    }
    edgesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [edgesGeo]);

  /* ── Energy panels: 3 random triangle faces glow warm ── */
  const panelGeos = useMemo(() => {
    const pos = icoGeo.attributes.position;
    const totalFaces = pos.count / 3;
    const rand = seededRandom(77);
    const faceIndices = new Set<number>();
    while (faceIndices.size < 3) {
      faceIndices.add(Math.floor(rand() * totalFaces));
    }
    return Array.from(faceIndices).map((fi) => {
      const base = fi * 3;
      const vA = new THREE.Vector3().fromBufferAttribute(pos, base);
      const vB = new THREE.Vector3().fromBufferAttribute(pos, base + 1);
      const vC = new THREE.Vector3().fromBufferAttribute(pos, base + 2);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array([vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z]),
          3
        )
      );
      geo.computeVertexNormals();
      const center = new THREE.Vector3().addVectors(vA, vB).add(vC).divideScalar(3);
      return { geo, center };
    });
  }, [icoGeo]);

  /* ── Energy beams: thin lines radiating outward ── */
  const beamObjects = useMemo(() => {
    const rand = seededRandom(200);
    const pos = icoGeo.attributes.position;
    const objects: THREE.Line[] = [];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(rand() * pos.count);
      const v = new THREE.Vector3().fromBufferAttribute(pos, idx);
      const dir = v.clone().normalize();
      const start = v.clone().multiplyScalar(0.95);
      const end = v.clone().add(dir.multiplyScalar(3.0 + rand() * 4.0));
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.47 + rand() * 0.06, 0.9, 0.55),
        transparent: true,
        opacity: 0.35 + rand() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      objects.push(new THREE.Line(geo, mat));
    }
    return objects;
  }, [icoGeo]);

  /* ── Animation loop ── */
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.06;
      groupRef.current.rotation.x = Math.sin(t * 0.03) * 0.08;
      groupRef.current.position.y = Math.sin(t * 0.35) * 0.12;
    }

    if (panelLightRef.current) {
      panelLightRef.current.intensity = 4.0 + Math.sin(t * 1.2) * 1.5;
    }

    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(t * 0.8) * 0.02;
    }

    beamObjects.forEach((line, i) => {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.2 + Math.sin(t * 1.8 + i * 1.1) * 0.2;
    });
  });

  return (
    <Float speed={0.5} rotationIntensity={0.08} floatIntensity={0.25}>
      <group ref={groupRef} position={[1.6, 0, 0]}>

        {/* A) INNER CORE — smooth dark sphere, absorbs light */}
        <mesh geometry={smoothGeo}>
          <meshStandardMaterial
            color="#030a0a"
            roughness={0.7}
            metalness={0.4}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Inner subsurface glow — faint teal from within */}
        <mesh ref={innerGlowRef} scale={1.88}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#00ccaa"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* B) OUTER GEODESIC FRAME — flat-shaded dark shell */}
        <mesh geometry={icoGeo}>
          <meshStandardMaterial
            color="#060f0f"
            roughness={0.8}
            metalness={0.35}
            flatShading
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Glowing wireframe — primary (vertex colors, varied brightness) */}
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial vertexColors transparent opacity={0.85} />
        </lineSegments>

        {/* Wireframe bloom layer — additive for glow bleed */}
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial
            color="#00ffcc"
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>

        {/* C) ENERGY PANELS — warm glowing triangle faces */}
        {panelGeos.map((panel, i) => (
          <mesh key={i} geometry={panel.geo}>
            <meshStandardMaterial
              color="#ffcc66"
              emissive="#ff9933"
              emissiveIntensity={4.0 - i * 0.8}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Warm point light near primary energy panel */}
        <pointLight
          ref={panelLightRef}
          position={[
            panelGeos[0].center.x * 1.3,
            panelGeos[0].center.y * 1.3,
            panelGeos[0].center.z * 1.3,
          ]}
          color="#ffaa44"
          intensity={4.0}
          distance={5}
          decay={2}
        />

        {/* Energy beams */}
        <group>
          {beamObjects.map((line, i) => (
            <primitive key={i} object={line} />
          ))}
        </group>

        {/* Atmospheric halo — large faint sphere behind core */}
        <mesh scale={3.0}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial
            color="#0a3333"
            transparent
            opacity={0.07}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Outer halo — very large, barely visible */}
        <mesh scale={4.5}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#062222"
            transparent
            opacity={0.035}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Rim highlight ring — subtle teal ring at equator */}
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={2.15}>
          <torusGeometry args={[1, 0.003, 8, 64]} />
          <meshBasicMaterial
            color="#00ddbb"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

/* ═══════════════════════════════════════════════
   PHYSICALLY CORRECT LIGHTING
   ═══════════════════════════════════════════════ */

function SceneLights() {
  const keyRef = useRef<THREE.PointLight>(null!);
  const rimRef = useRef<THREE.PointLight>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (rimRef.current) {
      rimRef.current.intensity = 1.8 + Math.sin(t * 0.6) * 0.4;
    }
    if (keyRef.current) {
      keyRef.current.intensity = 3.5 + Math.sin(t * 0.4) * 0.3;
    }
  });

  return (
    <>
      {/* Soft ambient fill */}
      <ambientLight intensity={0.06} color="#0a1a1a" />

      {/* Strong key light — front-right, creates visible shading gradient */}
      <pointLight
        ref={keyRef}
        position={[5, 3, 5]}
        color="#88ddcc"
        intensity={3.5}
        distance={25}
        decay={2}
      />

      {/* Cool teal rim light — back-left */}
      <pointLight
        ref={rimRef}
        position={[-5, 2, -4]}
        color="#00eebb"
        intensity={1.8}
        distance={20}
        decay={2}
      />

      {/* Top fill — subtle cool wash */}
      <pointLight
        position={[0, 6, 0]}
        color="#224444"
        intensity={0.8}
        distance={18}
        decay={2}
      />

      {/* Bottom fill — very subtle, prevents pure black underside */}
      <pointLight
        position={[0, -5, 3]}
        color="#0a2222"
        intensity={0.4}
        distance={15}
        decay={2}
      />

      {/* Back accent — creates depth separation */}
      <pointLight
        position={[2, -1, -6]}
        color="#005544"
        intensity={1.0}
        distance={15}
        decay={2}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════
   CAMERA DRIFT — gentle parallax
   ═══════════════════════════════════════════════ */

function CameraDrift() {
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    camera.position.x = 0.3 + Math.sin(t * 0.12) * 0.25;
    camera.position.y = 0.05 + Math.sin(t * 0.08) * 0.18;
    camera.position.z = 6.0 + Math.sin(t * 0.1) * 0.15;
    camera.lookAt(1.2, 0, 0);
  });

  return null;
}

/* ═══════════════════════════════════════════════
   PARTICLE FIELD — depth and atmosphere
   ═══════════════════════════════════════════════ */

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const rand = seededRandom(999);
    const count = 500;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 25;
      arr[i * 3 + 1] = (rand() - 0.5) * 16;
      arr[i * 3 + 2] = (rand() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.003;
      pointsRef.current.rotation.x = t * 0.001;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#55ddbb"
        size={0.018}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════
   POST PROCESSING — cinematic bloom + vignette
   ═══════════════════════════════════════════════ */

function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.8}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.95}
        mipmapBlur
        radius={0.85}
      />
      <Noise opacity={0.025} />
      <Vignette eskil={false} offset={0.15} darkness={0.85} />
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
              color: "#44ddbb",
              fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              letterSpacing: "0.3em",
              textTransform: "uppercase" as const,
              fontWeight: 300,
            }}
          >
            Welcome
          </span>
        </div>

        {/* Divider line */}
        <div
          style={{
            width: "2.5rem",
            height: "1px",
            background: "linear-gradient(90deg, #44ddbb, transparent)",
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
              color: "#44ddbb",
              letterSpacing: "0.35em",
              textTransform: "uppercase" as const,
            }}
          >
            SOLARIN
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
            HAS
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
            ARRIVED
          </span>
        </h1>

        {/* Decorative accent */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "2.5rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#44ddbb",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              width: "60px",
              height: "1px",
              backgroundColor: "#44ddbb",
              opacity: 0.3,
            }}
          />
          <div
            style={{
              width: "40px",
              height: "1px",
              backgroundColor: "#44ddbb",
              opacity: 0.15,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN EXPORT — AIHeroScene
   ═══════════════════════════════════════════════ */

export default function AIHeroScene() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#030909",
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
        camera={{ position: [0, 0, 6], fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.4,
        }}
      >
        {/* Teal-tinted fog for depth */}
        <fog attach="fog" args={["#040e0e", 6, 22]} />

        <CameraDrift />
        <SceneLights />
        <AICoreSphere />
        <ParticleField />

        <Stars
          radius={18}
          depth={35}
          count={1000}
          factor={2.5}
          saturation={0.1}
          fade
          speed={0.4}
        />

        <PostProcessing />
      </Canvas>

      <TextOverlay />
    </section>
  );
}
