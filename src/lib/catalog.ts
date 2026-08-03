// Assessment catalog — fitness, health and sport/game activities.
// Each entry maps to an AI analyzer kind so the Phase-2 engine stays untouched.
import type { AssessmentType } from "./types";
import type { AssessmentKind } from "@/ai/types";

export type AssessmentCategory = "fitness" | "health" | "sport" | "game";

export interface AssessmentDef {
  id: AssessmentType;
  label: string;
  desc: string;
  category: AssessmentCategory;
  aiKind: AssessmentKind;
  /** Spoken setup guidance played when the camera opens. */
  voice: string;
}

export const CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  fitness: "Fitness & Athletics",
  health: "Health & Wellness",
  sport: "Sport Skills",
  game: "Game Play",
};

export const ASSESSMENT_CATALOG: AssessmentDef[] = [
  // ---- Fitness & athletics
  { id: "sprint_30m", label: "30m Sprint", desc: "Acceleration", category: "fitness", aiKind: "sprint_30m",
    voice: "Thirty metre sprint. Place the phone three to five metres from the start line at hip height. Keep the athlete's full body in the frame. Sprint at full speed on the beep." },
  { id: "sprint_50m", label: "50m Sprint", desc: "Peak speed", category: "fitness", aiKind: "sprint_50m",
    voice: "Fifty metre sprint. Keep the camera steady and the full lane visible. The athlete should accelerate hard and run through the finish line." },
  { id: "broad_jump", label: "Standing Broad Jump", desc: "Explosive power", category: "fitness", aiKind: "broad_jump",
    voice: "Standing broad jump. Film from the side so both take-off and landing are visible. Feet behind the line, swing the arms, and jump forward as far as possible." },
  { id: "vertical_jump", label: "Vertical Jump", desc: "Lower-body power", category: "fitness", aiKind: "vertical_jump",
    voice: "Vertical jump. Film from the side with the whole body in frame. Athlete stands tall, then jumps straight up as high as possible." },
  { id: "shuttle_run", label: "4x10m Shuttle Run", desc: "Agility", category: "fitness", aiKind: "shuttle_run",
    voice: "Four by ten metre shuttle run. Keep both turning lines in the frame. Athlete runs, touches the line and changes direction as fast as possible." },
  { id: "endurance_run", label: "800m Endurance Run", desc: "Aerobic capacity", category: "fitness", aiKind: "shuttle_run",
    voice: "Eight hundred metre endurance run. Record the start and finish. Maintain an even pace and finish strong." },
  { id: "sit_ups", label: "Sit-ups (60s)", desc: "Core strength", category: "fitness", aiKind: "balance_test",
    voice: "Sixty second sit-up test. Film from the side. Hands across the chest, knees bent, and complete as many correct sit-ups as possible." },
  { id: "push_ups", label: "Push-ups (max)", desc: "Upper-body strength", category: "fitness", aiKind: "balance_test",
    voice: "Maximum push-up test. Film from the side. Keep the body straight and lower the chest fully on every repetition." },
  { id: "medicine_ball_throw", label: "Medicine Ball Throw", desc: "Upper-body power", category: "fitness", aiKind: "broad_jump",
    voice: "Medicine ball throw. Film from the side. Athlete sits or stands behind the line and pushes the ball forward with both hands." },
  { id: "flexibility_test", label: "Sit & Reach", desc: "Flexibility", category: "fitness", aiKind: "balance_test",
    voice: "Sit and reach flexibility test. Film from the side. Legs straight, reach forward slowly and hold the furthest position." },
  { id: "balance_test", label: "Balance Test", desc: "Static stability", category: "fitness", aiKind: "balance_test",
    voice: "Balance test. Stand on one leg with hands on the hips and hold as still as possible. Keep the whole body in the frame." },
  { id: "reaction_test", label: "Reaction Test", desc: "Neuromuscular response", category: "fitness", aiKind: "reaction_test",
    voice: "Reaction test. Athlete stands ready and responds to the signal as fast as possible. Keep the camera perfectly still." },

  // ---- Health & wellness
  { id: "health_vitals", label: "Health Vitals", desc: "Height, weight, BMI", category: "health", aiKind: "balance_test",
    voice: "Health vitals check. Record the athlete standing straight, facing the camera, with the full body visible." },
  { id: "posture_screen", label: "Posture Screening", desc: "Spine & alignment", category: "health", aiKind: "balance_test",
    voice: "Posture screening. Athlete stands relaxed, facing sideways to the camera. Stay still for five seconds." },
  { id: "vision_test", label: "Vision & Coordination", desc: "Hand-eye coordination", category: "health", aiKind: "reaction_test",
    voice: "Vision and coordination test. Follow the moving target with the eyes and hands. Keep the face clearly visible." },
  { id: "respiratory_test", label: "Respiratory Recovery", desc: "Breath recovery rate", category: "health", aiKind: "balance_test",
    voice: "Respiratory recovery test. Record the athlete resting after exercise for thirty seconds without moving." },

  // ---- Sport skills
  { id: "football_dribble", label: "Football Dribble", desc: "Ball control & speed", category: "sport", aiKind: "shuttle_run",
    voice: "Football dribbling test. Keep all cones in the frame. Dribble through the cones as quickly as possible without losing control." },
  { id: "basketball_shooting", label: "Basketball Shooting", desc: "Accuracy under time", category: "sport", aiKind: "reaction_test",
    voice: "Basketball shooting test. Film so both the athlete and the hoop are visible. Take as many accurate shots as possible in one minute." },
  { id: "badminton_footwork", label: "Badminton Footwork", desc: "Court movement", category: "sport", aiKind: "shuttle_run",
    voice: "Badminton footwork test. Keep the court corners in the frame. Move to each corner and return to centre as fast as possible." },
  { id: "athletics_throw", label: "Shot Put / Throw", desc: "Throwing power", category: "sport", aiKind: "broad_jump",
    voice: "Throwing test. Film from the side of the throwing circle. Use correct technique and stay inside the circle." },
  { id: "swimming_stroke", label: "Swimming Stroke Form", desc: "Stroke technique", category: "sport", aiKind: "balance_test",
    voice: "Swimming stroke assessment. Film from the poolside with the full stroke cycle visible." },

  // ---- Game play
  { id: "kabaddi_raid", label: "Kabaddi Raid", desc: "Agility & evasion", category: "game", aiKind: "shuttle_run",
    voice: "Kabaddi raid drill. Keep the mid-line and the athlete in the frame. Raid, touch and return without being caught." },
  { id: "kho_kho_agility", label: "Kho-Kho Agility", desc: "Turns & chase speed", category: "game", aiKind: "shuttle_run",
    voice: "Kho-Kho agility drill. Keep the poles in the frame. Sprint, turn sharply and repeat." },
  { id: "hockey_dribble", label: "Hockey Dribble", desc: "Stick control", category: "game", aiKind: "shuttle_run",
    voice: "Hockey dribbling test. Keep the stick, ball and cones in the frame. Dribble through the course quickly and cleanly." },
  { id: "volleyball_serve", label: "Volleyball Serve", desc: "Serve power & accuracy", category: "game", aiKind: "broad_jump",
    voice: "Volleyball serve test. Film from behind the service line. Serve into the target zone with full power." },
  { id: "wrestling_stance", label: "Wrestling Stance Hold", desc: "Strength endurance", category: "game", aiKind: "balance_test",
    voice: "Wrestling stance hold. Hold a low, stable stance for as long as possible with the full body visible." },
];

const BY_ID = new Map(ASSESSMENT_CATALOG.map((a) => [a.id, a]));

export function assessmentDef(t: AssessmentType): AssessmentDef | undefined {
  return BY_ID.get(t);
}

export function labelForAssessment(t: AssessmentType): string {
  return BY_ID.get(t)?.label ?? String(t).replace(/_/g, " ");
}

export function aiKindForAssessment(t: AssessmentType): AssessmentKind {
  return BY_ID.get(t)?.aiKind ?? "balance_test";
}

export function voiceForAssessment(t: AssessmentType): string {
  return (
    BY_ID.get(t)?.voice ??
    "Keep the athlete's full body inside the frame and hold the camera steady."
  );
}
