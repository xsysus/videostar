import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { RemotionShortProps } from '../remotion/MainShortComposition.js';

let cachedBundleLocation: string | null = null;

export async function getRemotionBundle(): Promise<string> {
  if (cachedBundleLocation) {
    return cachedBundleLocation;
  }
  const entryPoint = path.join(process.cwd(), 'src', 'remotion', 'index.ts');
  console.log(`📦 Bundling Remotion composition from: ${entryPoint}...`);
  cachedBundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => {
      return {
        ...config,
        resolve: {
          ...config.resolve,
          extensions: ['.tsx', '.ts', '.jsx', '.js', ...(config.resolve?.extensions || [])],
          extensionAlias: {
            '.js': ['.tsx', '.ts', '.js'],
            '.jsx': ['.tsx', '.jsx'],
          },
        },
      };
    },
  });
  console.log(`✅ Remotion bundle created at: ${cachedBundleLocation}`);
  return cachedBundleLocation;
}

export async function renderShortVideo(
  inputProps: RemotionShortProps,
  jobId: string,
  totalDurationInFrames = 1350
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'data', 'renders');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${jobId}_render.mp4`);
  const serveUrl = await getRemotionBundle();

  const composition = await selectComposition({
    serveUrl,
    id: 'ShortVideoComposition',
    inputProps: inputProps as any,
  });

  console.log(`🚀 Rendering 1080x1920 Short MP4 (${totalDurationInFrames} frames) for job ${jobId}...`);

  const availableCores = os.cpus().length || 2;
  const optimalConcurrency = Math.max(1, Math.min(4, availableCores));

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: totalDurationInFrames,
    },
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: inputProps as any,
    concurrency: optimalConcurrency,
  });

  console.log(`🎉 Video render complete -> ${outputPath}`);
  return outputPath;
}
