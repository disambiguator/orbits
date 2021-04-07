import { OrbitControls, Ring, Sphere } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Leva } from "leva";
import { sumBy } from "lodash";
import React, { useRef } from "react";
import { DoubleSide, Group, Mesh, Vector3 } from "three";

const spiroLength = 300;

function rand(min: number, max: number) {
  return Math.random() * max + min;
}

interface Seed {
  radius: number;
  theta: number;
  phi: number;
  thetaSpeed: number;
  phiSpeed: number;
}

const randPosition = (): Seed => ({
  radius: rand(0.1, 2),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(1, 1.5),
  phiSpeed: rand(1, 1.5),
});

const seeds = [
  randPosition(),
  randPosition(),
  randPosition(),
  randPosition(),
  randPosition(),
];

const points = [
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
];

let trails = new Array(spiroLength * 3).fill(0);

function generateVertices(seeds: Seed[], time: number) {
  seeds.forEach((p, i) =>
    points[i].setFromSphericalCoords(
      p.radius,
      p.theta + time * p.thetaSpeed,
      p.phi + time * p.phiSpeed
    )
  );

  const x = sumBy(points, "x") / points.length;
  const y = sumBy(points, "y") / points.length;
  const z = sumBy(points, "z") / points.length;

  trails = [...trails.slice(3), x, y, z];
  return new Float32Array(trails);
}

const Orbits = ({ seed }: { seed: Seed }) => {
  const groupRef = useRef<Group>();
  const ringRef = useRef<Mesh>();
  const { radius, thetaSpeed, theta, phi, phiSpeed } = seed;

  useFrame(({ clock }) => {
    groupRef.current.rotation.z = -theta - clock.elapsedTime * thetaSpeed;
    groupRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
    ringRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
  });

  return (
    <>
      <Ring
        ref={ringRef}
        args={[radius - 0.01, radius + 0.01, 128]}
        rotation={[0, phi, 0]}
      >
        <meshBasicMaterial side={DoubleSide} />
      </Ring>
      <group ref={groupRef} rotation={[0, phi, 0]}>
        <Sphere args={[0.1]} position={[0, radius, 0]} />
      </group>
    </>
  );
};

const Spiro = ({ seeds }: { seeds: Array<Seed> }) => {
  const positionAttributeRef = useRef<THREE.BufferAttribute>();

  useFrame(({ clock }) => {
    const positionAttribute = positionAttributeRef.current;
    positionAttribute.array = generateVertices(seeds, clock.elapsedTime);
    positionAttribute.needsUpdate = true;
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            ref={positionAttributeRef}
            attachObject={["attributes", "position"]}
            count={spiroLength}
            itemSize={3}
          />
        </bufferGeometry>
        <meshBasicMaterial color="blue" />
      </line>
    </group>
  );
};

export default function Page() {
  return (
    <React.StrictMode>
      <style global jsx>{`
        body {
          margin: 0;
        }
        canvas {
          display: block;
          height: 100vh;
        }
      `}</style>
      <Leva />
      <Canvas mode="concurrent">
        <OrbitControls />
        <Spiro seeds={seeds} />
        {seeds.map((seed, i) => (
          <Orbits key={i} seed={seed} />
        ))}
      </Canvas>
    </React.StrictMode>
  );
}
