import { Line, Sphere, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { range } from 'lodash';
import Link from 'next/link';
import Pusher, { PresenceChannel } from 'pusher-js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioListener,
  CanvasTexture,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PositionalAudio,
  Vector3,
} from 'three';
import { Line2 } from 'three-stdlib';
import styles from './app.module.scss';
import { FiberScene } from './scene';
import consts from '../lib/consts';
import { Seed, SeedWithUser, randSeed } from '../lib/seed';
import { useCanvas, useStore } from '../lib/store';

const TRAIL_LENGTH = 300;
const INTRO_TRAIL_LENGTH = 1000;
const STROKE_MIN = 1;
const STROKE_MAX = 10;

const textureHeight = 1000;
const textureWidth = 1000;

type Coords = [number, number];

const scale = (value: number, r1: [number, number], r2: [number, number]) => {
  if (value < r1[0] || value > r1[1]) {
    throw `${value} out of range ${r1}`;
  }

  return ((value - r1[0]) * (r2[1] - r2[0])) / (r1[1] - r1[0]) + r2[0];
};

function drawCoordinates(
  ctx: CanvasRenderingContext2D,
  [x1, y1]: Coords,
  [x2, y2]: Coords,
  seed: Seed,
) {
  ctx.strokeStyle = seed.color;
  ctx.lineWidth = scale(
    seed.radius,
    [consts.RADIUS_MIN, consts.RADIUS_MAX],
    [STROKE_MIN, STROKE_MAX],
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
  authEndpoint: '/api/auth',
});

const generatePosition = (p: Seed, points: Vector3, time: number) =>
  points.setFromSphericalCoords(
    p.radius,
    p.theta + time * p.thetaSpeed,
    p.phi + time * p.phiSpeed,
  );

const useListener = () => {
  return useStore((s) => s.listener)!;
};

const Tone = ({
  freq,
  position,
}: {
  freq: number;
  position: [number, number, number];
}) => {
  const { clock } = useThree();
  const [audio, setAudio] = useState<PositionalAudio | null>(null);
  const listener = useListener();

  useEffect(() => {
    if (audio) {
      const oscillator = listener.context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, clock.elapsedTime);

      oscillator.start(0);

      audio.setNodeSource(oscillator as unknown as AudioBufferSourceNode);
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
    [seed],
  );
  const trails = useRef<Array<number>>(
    new Array(trailLength).fill(points.toArray()).flat(),
  );
  const canvas = useCanvas();
  const canvasContext = useMemo(() => canvas.getContext('2d')!, [canvas]);
  const clock = useThree((three) => three.clock);

  useEffect(() => {
    console.log('regen trail');
    const newTrails = [];
    for (let i = 0; i < trailLength; i++) {
      generatePosition(
        seed,
        points,
        clock.elapsedTime - (trailLength - i) / 60,
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

const notes = range(-21, 21).map((i) => 440 * 2 ** (i / 12));
function scaleRange(number: number, range: [number, number]) {
  return notes[Math.floor(scale(number, range, [0, 41]))];
}

const Orbits = (props: { seed: Seed; trailLength: number; draw: boolean }) => {
  const groupRef = useRef<Group>(null);
  const { thetaSpeed, theta, phi, phiSpeed, radius, color } = props.seed;

  const chord = [
    scaleRange(thetaSpeed, [0, 0.5]),
    scaleRange(phiSpeed, [0, 0.5]),
    scaleRange(radius, [consts.RADIUS_MIN, consts.RADIUS_MAX]),
  ];

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
  }) as Omit<Seed, 'phi' | 'theta'>;

  return (
    <Orbits
      seed={{ ...seed, ...rest }}
      trailLength={INTRO_TRAIL_LENGTH}
      draw={false}
    />
  );
};

const Background = () => {
  const materialRef = useRef<MeshBasicMaterial>(null);
  const sphereRef = useRef<Mesh>(null);
  const canvas = useCanvas();

  useEffect(() => {
    materialRef.current!.map = new CanvasTexture(canvas);
    sphereRef.current!.geometry.scale(1, -1, 1);
  }, [canvas]);

  useFrame(() => {
    // const context = canvas.getContext("2d");
    // context.fillStyle = "rgba(0, 0, 0, 0.01)";
    // context.fillRect(0, 0, textureWidth, textureHeight);
    if (materialRef.current!.map) materialRef.current!.map.needsUpdate = true;
  });

  return (
    <Sphere args={[10, 100, 100]} ref={sphereRef}>
      <meshBasicMaterial ref={materialRef} side={FrontSide} />
    </Sphere>
  );
};

const Main = ({ initialSeeds }: { initialSeeds: SeedWithUser[] }) => {
  const [seeds, setSeeds] = useState(initialSeeds);
  //   useEffect(() => {
  //     if (!initialSeeds) {
  //       return;
  //     }
  //   }, []);

  useEffect(() => {
    const presenceChannel = pusher.subscribe(
      'presence-orbits',
    ) as PresenceChannel;

    presenceChannel.bind('pusher:subscription_succeeded', () => {
      console.log('subscribed');
      const userId = presenceChannel.members.me.id;
      const initialSeed = { ...randSeed(), userId };
      window.fetch('/api/push', {
        method: 'POST',
        body: JSON.stringify({ seed: initialSeed }),
      });
    });

    presenceChannel.bind('pusher:member_removed', (member: { id: string }) => {
      console.log('member_removed');
      setSeeds((seeds) =>
        seeds.find((s) => s.userId === member.id)
          ? seeds.filter((s) => s.userId !== member.id)
          : seeds,
      );
    });

    return () => {
      presenceChannel.unbind();
      pusher.unsubscribe('presence-orbits');
    };
  }, []);

  useEffect(() => {
    const channel = pusher.subscribe('orbits');

    channel.bind('new-neighbor', ({ seed }: { seed: SeedWithUser }) => {
      setSeeds((seeds) =>
        seeds.find((s) => s.userId === seed.userId) ? seeds : [...seeds, seed],
      );
    });

    return () => {
      channel.unbind();
      pusher.unsubscribe('orbits');
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <h2>Design your orbit!</h2>
      <button>
        <Link href="/">Done</Link>
      </button>
    </div>
  );
};

const SceneContents = ({ children }: { children: JSX.Element }) => {
  const { camera } = useThree();
  const set = useStore((s) => s.set);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const newListener = new AudioListener();
    camera.add(newListener);
    set({ listener: newListener });
    setMounted(true);
    return () => {
      camera.remove(newListener);
    };
  }, [set, camera]);

  return mounted ? children : null;
};

export default function App({
  initialSeeds,
  mode,
}: {
  initialSeeds: Array<SeedWithUser>;
  mode?: 'design' | 'viewing';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
      <div className={styles.container}>
        {mode === 'design' ? <Intro /> : null}
        <FiberScene controls gui>
          <SceneContents>
            {mode === 'design' ? (
              <MySeed seed={mySeed} />
            ) : (
              <Main initialSeeds={initialSeeds} />
            )}
          </SceneContents>
        </FiberScene>
      </div>
      <canvas
        ref={canvasRef}
        height={textureHeight}
        width={textureWidth}
        style={{ display: 'none' }}
        // style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}
      />
    </React.StrictMode>
  );
}
