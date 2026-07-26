import { registerRoot } from 'remotion';
import React from 'react';
import { Composition } from 'remotion';
import { MainShortComposition, RemotionShortProps } from './MainShortComposition.js';

const defaultProps: RemotionShortProps = {
  theme: {
    primaryColor: '#FFE600',
    backgroundColor: '#000000',
    fontFamily: 'Impact, sans-serif',
    badgeText: 'SHORT VIDEO',
    badgeBg: '#1F2937',
  },
  voiceoverUrl: '',
  scenes: [],
  words: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    React.createElement(Composition, {
      id: "ShortVideoComposition",
      component: MainShortComposition as any,
      durationInFrames: 1350, // 45s * 30fps
      fps: 30,
      width: 1080,
      height: 1920,
      defaultProps: defaultProps as any,
    })
  );
};

registerRoot(RemotionRoot);
