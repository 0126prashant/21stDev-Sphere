"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Stars, Torus } from "@react-three/drei";
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
  const orbitRingRef = useRef<THREE.Group>(null!);

  /* ── Geometry ── */
  const icoGeo = useMemo(() => new THREE.IcosahedronGeometry(2.0, 1), []);
  const smoothGeo = useMemo(() => new THREE.IcosahedronGeometry(1.85, 4), []); // Slightly smaller solid core
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(icoGeo, 1.1), [icoGeo]); // Thicker edges if possible (simulated via line width or tubes, here standard edges)

  /* ── Edge colors: varied brightness for realism ── */
  useMemo(() => {
    const rand = seededRandom(42);
    const count = edgesGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const b = rand();
        // Cyan/Teal Palette
        if (b > 0.8) {
            // Bright Cyan Highlihgts
            colors[i * 3] = 0.4;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0; 
        } else if (b > 0.4) {
             // Mid Teal
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.8;
            colors[i * 3 + 2] = 0.8;
        } else {
             // Dark Teal
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.3;
            colors[i * 3 + 2] = 0.3;
        }
    }
    edgesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [edgesGeo]);

  /* ── Energy panels: 3 random triangle faces glow warm ── */
  const panelGeos = useMemo(() => {
    const pos = icoGeo.attributes.position;
    const totalFaces = pos.count / 3;
    const rand = seededRandom(123); // New seed
    const faceIndices = new Set<number>();
    while (faceIndices.size < 4) { // Increased to 4 panels
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
    for (let i = 0; i < 15; i++) { // Increased count
      const idx = Math.floor(rand() * pos.count);
      const v = new THREE.Vector3().fromBufferAttribute(pos, idx);
      const dir = v.clone().normalize();
      const start = v.clone().multiplyScalar(0.95);
      const end = v.clone().add(dir.multiplyScalar(4.0 + rand() * 5.0)); // Longer beams
      const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.5 + rand() * 0.1, 0.9, 0.6), // Cyan/Blue
        transparent: true,
        opacity: 0.1 + rand() * 0.4,
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
      groupRef.current.rotation.y = t * 0.04; // Slower rotation
      groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.05;
    }

    if (orbitRingRef.current) {
        orbitRingRef.current.rotation.z = t * 0.1;
        orbitRingRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.05) * 0.1;
    }

    if (panelLightRef.current) {
       // Flicker effect
      panelLightRef.current.intensity = 15.0 + Math.sin(t * 10.0) * 2.0 + Math.random() * 2.0;
    }

    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + Math.sin(t * 0.5) * 0.03;
    }

    beamObjects.forEach((line, i) => {
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 2.0 + i * 10.0) * 0.1 + Math.random() * 0.05;
    });
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4}>
      <group ref={groupRef} position={[0.5, 0, 0]}> {/* Shifted slightly right as requested */}

        {/* 1) INNER CORE (NEW) — Solid, Dark, Metallic */}
        <mesh geometry={smoothGeo}>
            <meshStandardMaterial
                color="#010101" // Almost black
                roughness={0.7}
                metalness={0.8}
                envMapIntensity={1.0}
            />
        </mesh>

        {/* Inner subsurface glow */}
        <mesh ref={innerGlowRef} scale={1.8}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 2) OUTER STRUCTURE — Thick Geodesic Frame */}
         {/* Base dark structural frame */}
        <mesh geometry={icoGeo}>
          <meshStandardMaterial
            color="#02080a"
            roughness={0.3}
            metalness={0.9}
            flatShading
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glowing wireframe edges */}
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>

         {/* Additional Halo / Glow around edges for bloom */}
        <lineSegments geometry={edgesGeo} scale={1.01}>
             <lineBasicMaterial color="#00FFFF" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>


        {/* 3) ENERGY PANELS — Intense Glow */}
        {panelGeos.map((panel, i) => (
          <mesh key={i} geometry={panel.geo}>
            <meshStandardMaterial
              color="#FF8C00" // Dark Orange base
              emissive="#FF4500" // Red-Orange emission
              emissiveIntensity={8.0 + Math.random() * 4.0} // High intensity for bloom
              side={THREE.DoubleSide}
              toneMapped={false} 
            />
          </mesh>
        ))}

        {/* Dynamic Light Source at Primary Panel */}
        <pointLight
          ref={panelLightRef}
          position={[
            panelGeos[0].center.x * 1.2,
            panelGeos[0].center.y * 1.2,
            panelGeos[0].center.z * 1.2,
          ]}
          color="#FF6600"
          distance={8}
          decay={2}
        />

        {/* Energy Beams */}
        <group>
          {beamObjects.map((line, i) => (
            <primitive key={i} object={line} />
          ))}
        </group>
        
        {/* NEW: Scanning Ring */}
        <group ref={orbitRingRef}>
            <Torus args={[3.2, 0.02, 16, 100]} >
                <meshBasicMaterial color="#00FFFF" transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </Torus>
        </group>

      </group>
    </Float>
  );
}

/* ═══════════════════════════════════════════════
   PHYSICALLY CORRECT LIGHTING & ATMOSPHERE
   ═══════════════════════════════════════════════ */

function SceneEnvironment() {
    return (
        <>
            {/* ATMOSPHERE & DEPTH */}
            {/* 1. Exponential Fog */}
            <fog attach="fog" args={["#020b0e", 5, 25]} /> 
            
            {/* 2. Large Volumetric Back-Glow */}
            <mesh position={[0,0,-8]} scale={12}>
                <sphereGeometry args={[1, 64, 64]} />
                <meshBasicMaterial color="#001a1f" transparent opacity={0.4} blending={THREE.AdditiveBlending} side={THREE.BackSide} depthWrite={false} />
            </mesh>
        </>
    )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.2} color="#00111a" />

      {/* KEY LIGHT (High intensity, Cool White/Blue) - Upper Right */}
      <spotLight
        position={[10, 8, 8]}
        angle={0.5}
        penumbra={0.5}
        intensity={800} // High intensity for physical correctness
        color="#cceeff"
        castShadow
        distance={30}
        decay={2}
      />

       {/* RIM LIGHT (Strong Teal) - Opposite Side */}
      <spotLight
        position={[-10, 2, -5]}
        angle={0.5}
        penumbra={1}
        intensity={600}
        color="#00ffff"
        distance={30}
        decay={2}
      />

      {/* FILL LIGHT (Soft Purple/Blue) - Left */}
      <pointLight position={[-8, -5, 5]} intensity={100} color="#220044" distance={20} decay={2} />
      
      {/* BOUNCE LIGHT (Warm from panels) */}
      <pointLight position={[2, -2, 2]} intensity={50} color="#ffaa00" distance={10} decay={2} />

    </>
  );
}

/* ═══════════════════════════════════════════════
   PARTICLE FIELD
   ═══════════════════════════════════════════════ */

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const rand = seededRandom(999);
    const count = 400; // Sparse
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribution: wide area
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
      pointsRef.current.position.y = Math.sin(t * 0.1) * 0.5;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#00FFFF"
        size={0.03}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════
   POST PROCESSING
   ═══════════════════════════════════════════════ */

function PostProcessing() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom
        luminanceThreshold={1.2} // Only very bright things glow
        mipmapBlur
        intensity={1.5}
        radius={0.6}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.9} />
      <Noise opacity={0.05} /> {/* Film grain */}
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
        background: "#01080a", // Darker background
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
        camera={{ position: [0, 0, 7], fov: 45, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        shadows
      >
        <SceneEnvironment />
        <SceneLights />
        
        <AICoreSphere />
        <ParticleField />

        <Stars
          radius={50}
          depth={50}
          count={1500}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        <PostProcessing />
      </Canvas>

      <TextOverlay />
    </section>
  );
}
