import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { KenBurnsImage } from './KenBurnsImage.js';
import { DynamicCaptions, WordTimestamp } from './DynamicCaptions.js';
import { AudioEngine, NicheBadge, VideoProgressBar } from './Overlays.js';

export interface RemotionScene {
  imageUrl: string;
  durationInFrames: number;
  zoomDirection?: 'in' | 'out';
}

export interface RemotionShortProps {
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    badgeText: string;
    badgeBg: string;
  };
  voiceoverUrl: string;
  bgmUrl?: string;
  scenes: RemotionScene[];
  words: WordTimestamp[];
}

export const MainShortComposition: React.FC<RemotionShortProps> = ({
  theme,
  voiceoverUrl,
  bgmUrl,
  scenes,
  words,
}) => {
  let accumulatedFrames = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundColor }}>
      {/* 1. Audio Engine */}
      <AudioEngine voiceoverUrl={voiceoverUrl} bgmUrl={bgmUrl} />

      {/* 2. Visual Scenes */}
      {scenes.map((scene, idx) => {
        const startFrame = accumulatedFrames;
        accumulatedFrames += scene.durationInFrames;

        return (
          <Sequence
            key={idx}
            from={startFrame}
            durationInFrames={scene.durationInFrames}
          >
            <KenBurnsImage
              src={scene.imageUrl}
              durationInFrames={scene.durationInFrames}
              zoomDirection={scene.zoomDirection || (idx % 2 === 0 ? 'in' : 'out')}
            />
          </Sequence>
        );
      })}

      {/* 3. Top Progress Bar */}
      <VideoProgressBar color={theme.primaryColor} />

      {/* 4. Niche Badge */}
      <NicheBadge text={theme.badgeText} bgColor={theme.badgeBg} />

      {/* 5. Dynamic Kinetic Captions */}
      <DynamicCaptions
        words={words}
        primaryColor={theme.primaryColor}
        fontFamily={theme.fontFamily}
      />
    </AbsoluteFill>
  );
};
