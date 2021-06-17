import { Line, OrbitControls, Sphere } from "@react-three/drei";
import { Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Leva, useControls } from "leva";
import Link from "next/link";
import Pusher from "pusher-js";
import * as PusherTypes from "pusher-js";
import { Perf } from "r3f-perf";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioListener,
  CanvasTexture,
  FrontSide,
  Group,
  PositionalAudio,
  Vector3,
} from "three";
import { Line2 } from "three-stdlib";
import consts from "../lib/consts";
import { Seed, SeedWithUser, randSeed } from "../lib/seed";
import { useStore } from "../lib/store";
import styles from "./app.module.scss";

const TRAIL_LENGTH = 300;
const INTRO_TRAIL_LENGTH = 10000;
const STROKE_MIN = 1;
const STROKE_MAX = 10;

const textureHeight = 1000;
const textureWidth = 1000;

type Coords = [number, number];

const scale = (value: number, r1: [number, number], r2: [number, number]) =>
  ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];

function drawCoordinates(
  ctx: CanvasRenderingContext2D,
  [x1, y1]: Coords,
  [x2, y2]: Coords,
  seed: Seed
) {
  ctx.strokeStyle = seed.color;
  ctx.lineWidth = scale(
    seed.radius,
    [consts.RADIUS_MIN, consts.RADIUS_MAX],
    [STROKE_MIN, STROKE_MAX]
  );
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

const Orbits = (props: { seed: Seed; trailLength: number; draw: boolean }) => {
  const groupRef = useRef<Group>();
  const { thetaSpeed, theta, phi, phiSpeed, radius, color, chord } = props.seed;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    groupRef.current.rotation.z = -theta - clock.elapsedTime * thetaSpeed;
    groupRef.current.rotation.y = phi + clock.elapsedTime * phiSpeed;
  });

  // const { a, b, c } = useControls({
  //   a: { value: 144, min: 100, max: 1000 },
  //   b: { value: 144, min: 100, max: 1000 },
  //   c: { value: 144, min: 100, max: 1000 },
  // });
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
        <Sphere args={[0.1, 20, 20]} position={[0, radius, 0]}>
          <meshBasicMaterial color={color} />
        </Sphere>
        {chord.map((f, i) => (
          <Tone key={i} freq={f} position={[0, radius, 0]} />
        ))}
      </group>
      <Spiro {...props} />
    </>
  );
};

const Tone = ({
  freq,
  position,
}: {
  freq: number;
  position: [number, number, number];
}) => {
  const { camera, clock } = useThree();
  const [audio, setAudio] = useState<PositionalAudio>(null);

  const listener = useMemo(() => new AudioListener(), []);

  useEffect(() => {
    camera.add(listener);

    return () => {
      camera.remove(listener);
    };
  }, [camera, listener]);

  useEffect(() => {
    if (audio) {
      const oscillator = listener.context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, clock.elapsedTime);

      oscillator.start(0);

      //@ts-ignore
      audio.setNodeSource(oscillator);
      audio.setRefDistance(1);
      audio.setVolume(0.3);
      audio.setRolloffFactor(15);

      return () => {
        oscillator.stop();
      };
    }
  }, [listener, clock, audio, freq]);

  return (
    <>
      <positionalAudio position={position} ref={setAudio} args={[listener]} />
    </>
  );
};

const MySeed = ({
  seed: { radius, thetaSpeed, phiSpeed, color, ...rest },
}: {
  seed: Seed;
}) => {
  const seed = useControls({
    radius: { value: radius, min: consts.RADIUS_MIN, max: consts.RADIUS_MAX },
    thetaSpeed: { value: thetaSpeed, min: 0, max: 0.5 },
    phiSpeed: { value: phiSpeed, min: 0, max: 0.5 },
    color,
  });

  return (
    <Orbits
      seed={{ ...seed, ...rest }}
      trailLength={INTRO_TRAIL_LENGTH}
      draw={false}
    />
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
    // const context = canvas.getContext("2d");
    // context.fillStyle = "rgba(0, 0, 0, 0.01)";
    // context.fillRect(0, 0, textureWidth, textureHeight);
    if (materialRef.current.map) materialRef.current.map.needsUpdate = true;
  });

  return (
    <Sphere args={[10, 100, 100]} ref={sphereRef}>
      <meshBasicMaterial ref={materialRef} side={FrontSide} />
    </Sphere>
  );
};

const vecToUV = (vec: Vector3): [number, number] => {
  const u = (Math.atan2(vec.x, vec.z) / (2 * Math.PI) + 0.5) * textureWidth;
  const v = (vec.y * 0.5 + 0.5) * textureHeight;

  return [u, v];
};

const Spiro = React.memo(function Spiro({
  seed,
  trailLength,
  draw,
}: {
  seed: Seed;
  trailLength: number;
  draw: boolean;
}) {
  const lineRef = useRef<Line2>(null);
  const points = useMemo(
    () =>
      new Vector3().setFromSphericalCoords(seed.radius, seed.theta, seed.phi),
    [seed]
  );
  const trails = useRef<Array<number>>(
    new Array(trailLength).fill(points.toArray()).flat()
  );
  const canvas = useStore((state) => state.canvas);
  const canvasContext = useMemo(() => canvas.getContext("2d"), [canvas]);
  const clock = useThree((three) => three.clock);

  useEffect(() => {
    console.log("regen trail");
    const newTrails = [];
    for (let i = 0; i < trailLength; i++) {
      generatePosition(
        seed,
        points,
        clock.elapsedTime - (trailLength - i) / 60
      );

      newTrails[i * 3] = points.x;
      newTrails[i * 3 + 1] = points.y;
      newTrails[i * 3 + 2] = points.z;
    }
    trails.current = newTrails;
  }, [seed, points, trailLength, clock]);

  useFrame(({ clock }) => {
    const { geometry } = lineRef.current!;

    const oldCoords = vecToUV(points);

    generatePosition(seed, points, clock.elapsedTime);
    const newTrails = [
      ...trails.current.slice(3),
      points.x,
      points.y,
      points.z,
    ];

    points.normalize();
    const newCoords = vecToUV(points);

    if (draw) drawCoordinates(canvasContext, oldCoords, newCoords, seed);

    geometry.setPositions(newTrails);
    trails.current = newTrails;
  });

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <Line
        ref={lineRef}
        color={seed.color}
        points={new Array(trailLength).fill(points.toArray())}
        linewidth={3}
      />
    </group>
  );
});

const Main = ({ initialSeeds }: { initialSeeds: SeedWithUser[] }) => {
  const [seeds, setSeeds] = useState(initialSeeds);
  //   useEffect(() => {
  //     if (!initialSeeds) {
  //       return;
  //     }
  //   }, []);

  useEffect(() => {
    const presenceChannel = pusher.subscribe(
      "presence-orbits"
    ) as PusherTypes.PresenceChannel;

    presenceChannel.bind("pusher:subscription_succeeded", () => {
      console.log("subscribed");
      const userId = presenceChannel.members.me.id;
      const initialSeed = { ...randSeed(), userId };
      window.fetch("/api/push", {
        method: "POST",
        body: JSON.stringify({ seed: initialSeed }),
      });
    });

    presenceChannel.bind("pusher:member_removed", (member: { id: string }) => {
      console.log("member_removed");
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

    channel.bind("new-neighbor", ({ seed }: { seed: SeedWithUser }) => {
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
        <Orbits key={seed.userId} seed={seed} trailLength={TRAIL_LENGTH} draw />
      ))}
      <Background />
    </>
  );
};

const Intro = () => {
  return (
    <div>
      <h1>Design your orbit!</h1>
      <button>
        <Link href="/">Done</Link>
      </button>
    </div>
  );
};

export default function App({
  initialSeeds,
  mode,
}: {
  initialSeeds?: Array<SeedWithUser>;
  mode?: "design" | "viewing";
}) {
  const canvasRef = useRef<HTMLCanvasElement>();
  const { set, mySeed } = useStore();
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
      <div className={styles.container}>
        {mode === "design" ? <Intro /> : null}
        <Canvas mode="concurrent">
          <OrbitControls />
          <Perf />
          {mode === "design" ? (
            <MySeed seed={mySeed} />
          ) : (
            <Main initialSeeds={initialSeeds} />
          )}
        </Canvas>
      </div>
      <canvas
        ref={canvasRef}
        height={textureHeight}
        width={textureWidth}
        style={{ display: "none" }}
        // style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}
      />
    </React.StrictMode>
  );
}
