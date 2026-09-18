"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { GeographyFeature } from "@/lib/visualization/curatedGeography";

export type SceneMarker = { label: string; feature: GeographyFeature };

function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// A deterministic, low-amplitude bump pattern - purely decorative texture
// suggesting terrain/ocean depth, never claimed to be real elevation data.
// Same seed every time, so it's stable across renders rather than
// reshuffling on every mount.
function conceptualTerrainGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(3, 48, 32);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const bump = 1 + 0.02 * Math.sin(x * 3.1) * Math.cos(y * 2.7) * Math.sin(z * 3.4);
    position.setXYZ(i, x * bump, y * bump, z * bump);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function Marker({ marker, focused }: { marker: SceneMarker; focused: boolean }) {
  const position = latLonToVector3(marker.feature.lat, marker.feature.lon, 3.06);
  return (
    <mesh position={position} scale={focused ? 1.8 : 1}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial
        color="#ef6a4c"
        emissive="#ef6a4c"
        emissiveIntensity={focused ? 1.4 : 0.8}
        toneMapped={false}
      />
    </mesh>
  );
}

export default function GeographyGlobeScene({
  markers,
  paused,
  resetToken,
  focusedFeatureName,
}: {
  markers: SceneMarker[];
  paused: boolean;
  resetToken: number;
  focusedFeatureName?: string | null;
}) {
  const terrainGeometry = useMemo(() => conceptualTerrainGeometry(), []);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetToken]);

  const latitudeRings = [-60, -30, 0, 30, 60];

  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 6, 6]} intensity={40} color="#f6b552" />
      <pointLight position={[-6, -4, -6]} intensity={20} color="#8b6bff" />

      <mesh geometry={terrainGeometry}>
        <meshStandardMaterial color="#2c241a" transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3, 24, 18]} />
        <meshBasicMaterial color="#f2a63f" wireframe transparent opacity={0.32} />
      </mesh>
      {latitudeRings.map((lat) => {
        const points: [number, number, number][] = [];
        for (let lon = -180; lon <= 180; lon += 6) {
          points.push(latLonToVector3(lat, lon, 3.01));
        }
        return <Line key={lat} points={points} color="#f2a63f" transparent opacity={0.18} lineWidth={1} />;
      })}
      {markers.map((m, i) => (
        <Marker key={i} marker={m} focused={m.feature.name === focusedFeatureName} />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={4.5}
        maxDistance={14}
        autoRotate={!paused}
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
