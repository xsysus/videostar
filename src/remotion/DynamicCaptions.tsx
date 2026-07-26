import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface WordTimestamp {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

interface DynamicCaptionsProps {
  words: WordTimestamp[];
  primaryColor?: string;
  fontFamily?: string;
}

export const DynamicCaptions: React.FC<DynamicCaptionsProps> = ({
  words,
  primaryColor = '#FFE600',
  fontFamily = 'Impact, sans-serif',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const currentWord = words.find(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  if (!currentWord) return null;

  const wordStartFrame = currentWord.start * fps;
  const localFrame = Math.max(0, frame - wordStartFrame);

  const scale = spring({
    frame: localFrame,
    fps,
    config: { stiffness: 300, damping: 15 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          transform: `scale(${scale})`,
          fontSize: 72,
          fontWeight: 900,
          fontFamily,
          color: primaryColor,
          textShadow: '0px 8px 24px rgba(0,0,0,0.9), 0px 0px 10px #000',
          textTransform: 'uppercase',
          padding: '10px 24px',
          textAlign: 'center',
          maxWidth: '90%',
          wordBreak: 'break-word',
        }}
      >
        {currentWord.word}
      </div>
    </AbsoluteFill>
  );
};
