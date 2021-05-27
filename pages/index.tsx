import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import { GetServerSideProps } from "next";
import Pusher from "pusher-js";
import * as PusherTypes from "pusher-js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, FrontSide, Group, Vector3 } from "three";
import { Line2 } from "three-stdlib";
import { Seed } from "../lib/seed";
import { useStore } from "../lib/store";

const spiroLength = 300;

const rand = (min: number, max: number) => Math.random() * max + min;

const textureHeight = 1000;
const textureWidth = 1000;

function drawCoordinates(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  [xA, yA]: [boolean, boolean],
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  // ctx.moveTo(x1, y1);
  // if (x1 > x2 !== xA && y1 > y2 !== yA) {
  //   ctx.lineTo(
  //     x2 + textureWidth * (xA ? 1 : -1),
  //     y2 + textureWidth * (yA ? 1 : -1)
  //   );
  //   ctx.moveTo(x2, y2);
  //   ctx.lineTo(
  //     x1 - textureWidth * (xA ? 1 : -1),
  //     y1 - textureWidth * (yA ? 1 : -1)
  //   );
  // } else if (x1 > x2 !== xA) {
  //   ctx.lineTo(x2 + textureWidth * (xA ? 1 : -1), y2);
  //   ctx.moveTo(x2, y2);
  //   ctx.lineTo(x1 - textureWidth * (xA ? 1 : -1), y1);
  // } else if (y1 > y2 !== yA) {
  //   ctx.lineTo(x2, y2 + textureWidth * (yA ? 1 : -1));
  //   ctx.moveTo(x2, y2);
  //   ctx.lineTo(x1, y1 - textureWidth * (yA ? 1 : -1));
  // } else {
  // ctx.lineTo(x2, y2);
  // }
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
  thetaSpeed: rand(0, 0.1) + 1,
  phiSpeed: rand(0, 0.1) + 1,
  userId,
  color: "#" + Math.floor(Math.random() * 16777215).toString(16),
});

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  authEndpoint: "/api/auth",
});

const generatePosition = (
  p: Omit<Seed, "userId">,
  points: Vector3,
  time: number
) => {
  // console.log(
  //   (p.theta + time * p.thetaSpeed) / Math.PI,
  //   (p.phi + time * p.phiSpeed) / Math.PI
  // );
  return points.setFromSphericalCoords(
    p.radius,
    p.theta + time * p.thetaSpeed,
    p.phi + time * p.phiSpeed
  );
};

const Orbits = ({ seed }: { seed: Omit<Seed, "userId"> }) => {
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

const MySeed = ({
  seed: { radius, theta, phi, thetaSpeed, phiSpeed, color },
}: {
  seed: Seed;
}) => {
  const seed = useControls({
    radius: { value: radius, min: 0.1, max: 2 },
    theta: { value: theta, min: 0, max: 2 * Math.PI },
    phi: { value: phi, min: 0, max: 2 * Math.PI },
    thetaSpeed: { value: thetaSpeed, min: 0, max: 0.5 },
    phiSpeed: { value: phiSpeed, min: 0, max: 0.5 },
    color,
  });

  return <Orbits seed={seed} />;
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

const Spiro = ({ seed }: { seed: Omit<Seed, "userId"> }) => {
  const lineRef = useRef<Line2>(null);
  const points = useMemo(
    () =>
      new Vector3().setFromSphericalCoords(seed.radius, seed.theta, seed.phi),
    [seed]
  );
  const trails = useRef<Array<number>>(
    new Array(spiroLength).fill(points.toArray()).flat()
  );
  const canvas = useStore((state) => state.canvas);
  const canvasContext = useMemo(() => canvas.getContext("2d"), [canvas]);
  const angle: [boolean, boolean] = useMemo(() => {
    const beep = new Vector3().setFromSphericalCoords(
      seed.radius,
      seed.theta,
      seed.phi
    );
    beep.normalize();

    const [u1, v1] = vecToUV(beep);

    generatePosition(seed, beep, 0.0001);
    beep.normalize();

    const [u2, v2] = vecToUV(beep);

    return [u2 < u1, v2 < v1];
  }, [seed]);

  useEffect(() => {
    const p = {
      radius: 2,
      theta: 0,
      phi: 0,
      thetaSpeed: Math.PI * 3,
      phiSpeed: 0.06,
      userId: "1",
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };

    const time = [0, 1, 2, 3];
    const timeVector = new Vector3();
    time.forEach((t) => {
      const a = timeVector.clone();
      timeVector.setFromSphericalCoords(
        p.radius,
        p.theta + t * p.thetaSpeed,
        p.phi + t * p.phiSpeed
      );
      console.log(timeVector.x - a.x, timeVector.y - a.y, timeVector.z - a.z);
    });
  }, []);

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

    drawCoordinates(canvasContext, u1, v1, u2, v2, angle, seed.color);

    geometry.setPositions(newTrails);
    trails.current = newTrails;
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <Line
        ref={lineRef}
        color={seed.color}
        points={new Array(spiroLength).fill(points.toArray())}
        linewidth={3}
      />
    </group>
  );
};

const App = ({ initialSeeds }: { initialSeeds: Seed[] }) => {
  const [seeds, setSeeds] = useState(initialSeeds);
  const [mySeed, setMySeed] = useState<Seed | null>(null);

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
      setMySeed(initialSeed);
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
      {seeds.slice(0, 1).map((seed) => (
        <Orbits key={seed.userId} seed={seed} />
      ))}
      {mySeed && <MySeed seed={mySeed} />}
      <Background />
    </>
  );
};

export default function Page({
  initialSeeds = [],
}: {
  initialSeeds: Array<Seed>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>();
  const { set } = useStore();

  useEffect(() => {
    set({ canvas: canvasRef.current });
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.rect(0, 0, textureWidth, textureHeight);
    ctx.stroke();
    ctx.fill();
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
