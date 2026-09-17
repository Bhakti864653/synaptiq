"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

export type GeographyMarker = { label: string; lat: number; lon: number };

function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// Deterministic (not random) position on the sphere derived from the
// concept's own name - the same material always produces the same globe,
// and two different materials produce different marker layouts, without
// claiming to know these concepts' real-world geographic coordinates.
export function markerFromLabel(label: string): GeographyMarker {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  const lat = ((Math.abs(hash) % 140) - 70);
  const lon = ((Math.abs(hash >> 3) % 360) - 180);
  return { label, lat, lon };
}

function Globe({ paused, markers }: { paused: boolean; markers: GeographyMarker[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (paused || !group.current) return;
    group.current.rotation.y += delta * 0.08;
  });

  const latitudeRings = [-60, -30, 0, 30, 60];

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial color="#2c241a" transparent opacity={0.06} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3, 24, 18]} />
        <meshBasicMaterial color="#f2a63f" wireframe transparent opacity={0.35} />
      </mesh>
      {latitudeRings.map((lat) => {
        const points: [number, number, number][] = [];
        for (let lon = -180; lon <= 180; lon += 6) {
          points.push(latLonToVector3(lat, lon, 3.01));
        }
        return <Line key={lat} points={points} color="#f2a63f" transparent opacity={0.2} lineWidth={1} />;
      })}
      {/* markers are children of the same rotating group as the globe
          itself, so they stay anchored to the surface during rotation
          instead of appearing to float independently above it */}
      {markers.map((m, i) => (
        <Marker key={i} marker={m} />
      ))}
    </group>
  );
}

function Marker({ marker }: { marker: GeographyMarker }) {
  const position = latLonToVector3(marker.lat, marker.lon, 3.05);
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.09, 12, 12]} />
      <meshStandardMaterial color="#ef6a4c" emissive="#ef6a4c" emissiveIntensity={0.8} toneMapped={false} />
    </mesh>
  );
}

export default function GeographyGlobeScene({
  markers,
  paused,
}: {
  markers: GeographyMarker[];
  paused: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 6, 6]} intensity={40} color="#f6b552" />
      <pointLight position={[-6, -4, -6]} intensity={20} color="#8b6bff" />
      <Globe paused={paused} markers={markers} />
    </Canvas>
  );
}
