import { Line, OrbitControls, Ring, Sphere } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Leva } from "leva";
import { GetServerSideProps } from "next";
import Pusher from "pusher-js";
import * as PusherTypes from "pusher-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DoubleSide, Group, Mesh, Vector3 } from "three";
import { Line2 } from "three-stdlib";
import { Seed } from "../lib/seed";

const spiroLength = 300;

function rand(min: number, max: number) {
  return Math.random() * max + min;
}

const randPosition = (userId): Seed => ({
  radius: rand(0.1, 2),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(1, 1.5),
  phiSpeed: rand(1, 1.5),
  userId,
  color: "#" + Math.floor(Math.random() * 16777215).toString(16),
});

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  authEndpoint: "/api/auth",
});

const generatePosition = (p: Seed, points: Vector3, time: number) =>
  points.setFromSphericalCoords(
    p.radius,
    p.theta + time * p.thetaSpeed,
    p.phi + time * p.phiSpeed
  );

const _OrbitRing = ({ seed }: { seed: Seed }) => {
  const ringRef = useRef<Mesh>();
  const { radius, phi, phiSpeed } = seed;

  useFrame(({ clock }) => {
    ringRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
  });

  return (
    <Ring
      ref={ringRef}
      args={[radius - 0.01, radius + 0.01, 128]}
      rotation={[0, phi, 0]}
    >
      <meshBasicMaterial side={DoubleSide} />
    </Ring>
  );
};

const Orbits = ({ seed }: { seed: Seed }) => {
  const groupRef = useRef<Group>();
  const { radius, thetaSpeed, theta, phi, phiSpeed } = seed;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.z = -theta - clock.elapsedTime * thetaSpeed;
    groupRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
  });

  return (
    <>
      <group ref={groupRef} rotation={[0, phi, 0]}>
        <Sphere args={[0.1]} position={[0, radius, 0]} />
      </group>
      <Spiro seed={seed} />
    </>
  );
};

const Spiro = ({ seed }: { seed: Seed }) => {
  const lineRef = useRef<Line2>(null);
  const points = useMemo(() => new Vector3(), []);
  const trails = useRef<Array<number>>(new Array(spiroLength * 3).fill(0));

  useFrame(({ clock }) => {
    const { geometry } = lineRef.current!;
    const [x, y, z] = generatePosition(
      seed,
      points,
      clock.elapsedTime
    ).toArray();
    const newTrails = [...trails.current.slice(3), x, y, z];
    geometry.setPositions(newTrails);
    trails.current = newTrails;
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <Line
        ref={lineRef}
        color={seed.color}
        points={new Array(spiroLength).fill([0, 0, 0])}
        linewidth={3}
      />
    </group>
  );
};

const App = ({ initialSeeds }: { initialSeeds: Seed[] }) => {
  const [seeds, setSeeds] = useState(initialSeeds);
  useEffect(() => {
    const presenceChannel = pusher.subscribe(
      "presence-orbits"
    ) as PusherTypes.PresenceChannel;

    presenceChannel.bind("pusher:subscription_succeeded", () => {
      console.log("subscribed");
      const userId = presenceChannel.members.me.id;
      const initialSeed = randPosition(userId);
      window.fetch("/api/push", {
        method: "POST",
        body: JSON.stringify({ seed: initialSeed }),
      });
      setSeeds((seeds) => [...seeds, initialSeed]);
    });

    presenceChannel.bind("pusher:member_removed", (member) => {
      setSeeds((seeds) =>
        seeds.find((s) => s.userId === member.id)
          ? seeds.filter((s) => s.userId !== member.id)
          : seeds
      );
    });

    return () => {
      presenceChannel.unbind();
      pusher.unsubscribe("presence-orbits");
    };
  }, []);

  useEffect(() => {
    const channel = pusher.subscribe("orbits");

    channel.bind("new-neighbor", ({ seed }: { seed: Seed }) => {
      setSeeds((seeds) =>
        seeds.find((s) => s.userId === seed.userId) ? seeds : [...seeds, seed]
      );
    });

    return () => {
      channel.unbind();
      pusher.unsubscribe("orbits");
    };
  }, []);

  return (
    <>
      {seeds.map((seed) => (
        <Orbits key={seed.userId} seed={seed} />
      ))}
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const url = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${url}/api/seeds`);
  const data: { seeds: Array<Seed> } = await res.json();
  return { props: { initialSeeds: data.seeds } };
};

export default function Page({ initialSeeds }: { initialSeeds: Array<Seed> }) {
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
          <App initialSeeds={initialSeeds} />
        </Canvas>
      </div>
    </React.StrictMode>
  );
}
