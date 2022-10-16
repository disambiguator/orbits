import { OrbitControls } from '@react-three/drei';
import { Canvas, Props } from '@react-three/fiber';
import { Leva } from 'leva';
import React from 'react';
import { useMediaQuery } from 'react-responsive';

const useIsMobile = () =>
  useMediaQuery({
    query: '(max-width: 768px)',
  });

export const FiberScene = ({
  controls,
  gui,
  children,
  ...rest
}: Props & { controls?: boolean; gui?: boolean }) => {
  const isMobile = useIsMobile();

  return (
    <>
      {gui && <Leva hideCopyButton fill={isMobile} titleBar={false} />}
      <Canvas {...rest}>
        {controls && <OrbitControls />}
        {children}
      </Canvas>
    </>
  );
};
