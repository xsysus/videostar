import React from 'react';
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const VideoProgressBar: React.FC<{ color?: string }> = ({ color = '#00E5FF' }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const widthPercentage = interpolate(
    frame,
    [0, Math.max(1, durationInFrames)],
    [0, 100],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${widthPercentage}%`,
        height: 8,
        backgroundColor: color,
        boxShadow: `0px 0px 12px ${color}`,
        zIndex: 100,
      }}
    />
  );
};

export const NicheBadge: React.FC<{ text: string; bgColor?: string }> = ({
  text,
  bgColor = '#1F2937',
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        left: 36,
        backgroundColor: bgColor,
        color: '#F9FAFB',
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        padding: '8px 18px',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.5)',
        zIndex: 90,
      }}
    >
      {text}
    </div>
  );
};

export const AudioEngine: React.FC<{ voiceoverUrl?: string; bgmUrl?: string }> = ({
  voiceoverUrl,
  bgmUrl,
}) => {
  return (
    <>
      {voiceoverUrl && voiceoverUrl.trim().length > 10 && <Audio src={voiceoverUrl} volume={1.0} />}
      {bgmUrl && bgmUrl.trim().length > 10 && <Audio src={bgmUrl} volume={0.15} loop />}
    </>
  );
};
