import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Leva } from "leva";
import { GetServerSideProps } from "next";
import Pusher from "pusher-js";
import * as PusherTypes from "pusher-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, FrontSide, Group, Vector3 } from "three";
import { Line2 } from "three-stdlib";
import { Seed } from "../lib/seed";
import { useStore } from "../lib/store";

const spiroLength = 300;

function rand(min: number, max: number) {
  return Math.random() * max + min;
}

const textureHeight = 1000;
const textureWidth = 1000;

function drawCoordinates(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (x1 > x2) {
    ctx.lineTo(x2 + textureWidth, y2);
    ctx.moveTo(x2, y2);
    ctx.lineTo(x1 - textureWidth, y1);
  } else {
    ctx.lineTo(x2, y2);
  }

  ctx.stroke();
}

const randPosition = (userId): Seed => ({
  radius: rand(0.1, 2),
  theta: rand(0, 2 * Math.PI),
  phi: rand(0, 2 * Math.PI),
  thetaSpeed: rand(0, 0.5),
  phiSpeed: rand(0, 0.5),
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

const Orbits = ({ seed }: { seed: Seed }) => {
  const groupRef = useRef<Group>();
  const { thetaSpeed, theta, phi, phiSpeed, radius, color } = seed;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.z = -theta - clock.elapsedTime * thetaSpeed;
    groupRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
  });

  return (
    <>
      <group ref={groupRef} rotation={[0, phi, 0]}>
        <Text
          position={[0, radius, 0]}
          color={color}
          anchorX="right"
          anchorY="middle"
        >
          A name
        </Text>
        <Sphere args={[0.1]} position={[0, radius, 0]} />
      </group>
      <Spiro seed={seed} />
    </>
  );
};

const Background = () => {
  const materialRef = useRef<THREE.MeshBasicMaterial>();
  const sphereRef = useRef<THREE.Mesh>();
  const canvas = useStore((state) => state.canvas);

  useEffect(() => {
    materialRef.current.map = new CanvasTexture(canvas);
    sphereRef.current.geometry.scale(1, -1, 1);
  }, [canvas]);

  useFrame(() => {
    materialRef.current.map.needsUpdate = true;
  });

  return (
    <Sphere args={[10, 100, 100]} ref={sphereRef}>
      <meshBasicMaterial ref={materialRef} side={FrontSide} />
    </Sphere>
  );
};

const vecToUV = (vec: Vector3) => {
  const u = (Math.atan2(vec.x, vec.z) / (2 * Math.PI) + 0.5) * textureWidth;
  const v = (vec.y * 0.5 + 0.5) * textureHeight;

  return [u, v];
};

const Spiro = ({ seed }: { seed: Seed }) => {
  const lineRef = useRef<Line2>(null);
  const points = useMemo(
    () =>
      new Vector3().setFromSphericalCoords(seed.radius, seed.theta, seed.phi),
    [seed]
  );
  const trails = useRef<Array<number>>(new Array(spiroLength * 3).fill(0));
  const canvas = useStore((state) => state.canvas);
  const canvasContext = useMemo(() => canvas.getContext("2d"), [canvas]);

  useFrame(({ clock }) => {
    const { geometry } = lineRef.current!;

    const [u1, v1] = vecToUV(points);

    generatePosition(seed, points, clock.elapsedTime);
    const newTrails = [
      ...trails.current.slice(3),
      points.x,
      points.y,
      points.z,
    ];

    points.normalize();
    const [u2, v2] = vecToUV(points);

    drawCoordinates(canvasContext, u1, v1, u2, v2, seed.color);

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
      <Background />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;

  console.log(process.env.NEXT_PUBLIC_VERCEL_URL);

  const res = await fetch(`${url}/api/seeds`);
  const data: { seeds: Array<Seed> } = await res.json();
  return { props: { initialSeeds: data.seeds } };
};

export default function Page({ initialSeeds }: { initialSeeds: Array<Seed> }) {
  const canvasRef = useRef<HTMLCanvasElement>();
  const { set } = useStore();

  useEffect(() => {
    set({ canvas: canvasRef.current });
  }, [set]);

  // useEffect(() => {
  //   const canvas = canvasRef.current;
  //   const context = canvas.getContext("2d");

  //   const myImg = new Image();
  //   myImg.onload = function () {
  //     canvas.width = myImg.width;
  //     canvas.height = myImg.height;
  //     context.drawImage(myImg, 0, 0);
  //   };
  //   myImg.src = "/bg.png";
  // }, []);

  return (
    <React.StrictMode>
      <style global jsx>{`
        body {
          margin: 0;
        }
      `}</style>
      <Leva />
      <div style={{ background: "black", height: "100vh" }}>
        <Canvas mode="concurrent">
          <OrbitControls />
          <App initialSeeds={initialSeeds} />
        </Canvas>
      </div>
      <canvas
        ref={canvasRef}
        height={textureHeight}
        width={textureWidth}
        // style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}
      />
    </React.StrictMode>
  );
}
