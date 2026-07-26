import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface KenBurnsProps {
  src: string;
  durationInFrames: number;
  zoomDirection?: 'in' | 'out';
}

export const KenBurnsImage: React.FC<KenBurnsProps> = ({
  src,
  durationInFrames,
  zoomDirection = 'in',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const scale = interpolate(
    frame,
    [0, Math.max(1, durationInFrames)],
    zoomDirection === 'in' ? [1.0, 1.15] : [1.15, 1.0],
    { extrapolateRight: 'clamp' }
  );

  const translateX = interpolate(
    frame,
    [0, Math.max(1, durationInFrames)],
    [0, -15],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
        alt="Scene Visual"
      />
    </AbsoluteFill>
  );
};
