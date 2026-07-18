# NSRC AI Engine (Phase 2)

Modular, offline-first sports analysis engine. Every module is decoupled behind
a TypeScript interface so placeholder implementations can be swapped for real
ML models (MediaPipe Pose, TFLite MoveNet Lightning / Thunder) without touching
callers.

## Structure

```
src/ai/
  pose/              PoseDetector interface + MockPose + adapter stubs
  analysis/          Per-assessment movement analyzers (sprint, jumps, shuttle, balance)
  scoring/           Benchmarks + score engine (0-100, percentile, rank)
  antiCheat/         Fraud/tamper detection
  recommendations/   Sport recommender with reasoning
  utils/             OpenCV-style frame pipeline (extract, quality, smoothing)
  pipeline.ts        End-to-end orchestrator: video -> report
  index.ts           Public exports
  types.ts           Shared domain types
  benchmarks.json    National benchmark table by age/gender
```

## Swapping in a real model

Every detector implements `PoseDetector` (`src/ai/pose/types.ts`).
Ship a new adapter that returns 33 landmarks `{x,y,z,visibility,timestamp}`:

- **MediaPipe Pose (web/native)** — `src/ai/pose/adapters/mediapipe.ts`
- **TensorFlow Lite MoveNet Lightning** — `src/ai/pose/adapters/movenet-lightning.ts`
- **TensorFlow Lite MoveNet Thunder** — `src/ai/pose/adapters/movenet-thunder.ts`

Then register it in `src/ai/pose/registry.ts` and set
`PIPELINE_CONFIG.pose = "mediapipe" | "movenet-lightning" | "movenet-thunder"`.
No analyzer, scorer, or UI change is required.

## Offline

No network calls. All work runs on-device. Long jobs enqueue to
`processing_queue` and resume on app restart via `resumePendingJobs()`.

## Notes on this web preview

This repo is the TanStack Start web preview of NSRC. The AI module is written
in framework-agnostic TypeScript so the same source drops into the Expo /
React Native app unchanged. Native adapters (`react-native-fast-tflite`,
`expo-mediapipe`) sit behind the same interfaces.
