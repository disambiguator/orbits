import { Line, OrbitControls, Ring, Sphere } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Leva } from "leva";
import { sumBy } from "lodash";
import Pusher from "pusher-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Color, DoubleSide, Group, Mesh, Vector3 } from "three";
import { Line2 } from "three-stdlib";
import { v4 as uuidv4 } from "uuid";
import { Seed } from "../seed";

const spiroLength = 300;

function rand(min: number, max: number) {
  return Math.random() * max + min;
}

const randPosition = (): Seed => ({
  radius: rand(0.1, 2),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(1, 1.5),
  phiSpeed: rand(1, 1.5),
  id: uuidv4(),
});

const pusher = new Pusher("6f2ed4e683c352055a0b", { cluster: "us3" });

let trails = new Array(spiroLength * 3).fill(0);

function generateVertices(seeds: Seed[], points: Vector3[], time: number) {
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
  return trails;
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
  const lineRef = useRef<Line2>(null);

  const points = useMemo(() => {
    const a = new Array(seeds.length);
    for (let i = 0; i < seeds.length; i++) {
      a[i] = new Vector3();
    }
    return a;
  }, [seeds]);

  useFrame(({ clock }) => {
    const { geometry } = lineRef.current!;
    geometry.setPositions(generateVertices(seeds, points, clock.elapsedTime));
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <Line
        ref={lineRef}
        color={new Color(219, 193, 96)}
        points={trails}
        linewidth={3}
      />
    </group>
  );
};

const App = ({ initialSeed }: { initialSeed: Seed }) => {
  const [seeds, setSeeds] = useState([initialSeed]);
  useEffect(() => {
    const channel = pusher.subscribe("orbits");
    channel.bind("new-neighbor", ({ seed }: { seed: Seed }) => {
      if (!seeds.find((s) => s.id === seed.id)) {
        setSeeds([...seeds, seed]);
      }
    });
    return () => {
      channel.unbind("new-neighbor");
      pusher.unsubscribe("orbits");
    };
  });

  return (
    <>
      <Spiro seeds={seeds} />
      {seeds.map((seed, i) => (
        <Orbits key={i} seed={seed} />
      ))}
    </>
  );
};

export default function Page() {
  const initialSeed = randPosition();
  useEffect(() => {
    window.fetch("/api/push", {
      method: "POST",
      body: JSON.stringify({ seed: initialSeed }),
    });
  }, [initialSeed]);

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
      <div style={{ background: "black" }}>
        <Canvas mode="concurrent">
          <OrbitControls />
          <App initialSeed={initialSeed} />
        </Canvas>
      </div>
    </React.StrictMode>
  );
}
