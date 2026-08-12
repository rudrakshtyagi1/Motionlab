# MotionLab

> **Real-time human movement intelligence powered by computer vision.**

MotionLab is a browser-first computer-vision fitness analysis application. It performs client-side pose estimation, joint angle calculation, temporal movement state machine tracking, full vs. partial squat rep validation, rule-based form analysis, MET calorie estimation, and local workout history management.

---

## Overview

MotionLab operates entirely within the web browser to provide instant, privacy-preserving biomechanical feedback:

1. **Client-Side Computer Vision** — MediaPipe Pose Landmarker WASM computes 33 2D body keypoints in real time at 30+ FPS.
2. **Biomechanical Vector Geometry** — Joint angles (knee flexion, hip angle, torso inclination) and lateral knee valgus offsets are calculated per frame.
3. **Temporal Movement State Machine** — Tracks movement trajectory (`STANDING` → `DESCENDING` → `BOTTOM` → `ASCENDING` → `STANDING`).
4. **Strict Rep Validation & Depth Classification** — Differentiates `FULL` valid squats ($\le 100^\circ$) from `PARTIAL` ($101^\circ\text{–}120^\circ$) and `SHALLOW` ($>120^\circ$) attempts.
5. **MET Calorie Expenditure Estimation** — Standard metabolic equivalent estimation based on active workout duration and body weight.
6. **Zero-Auth Local Profiles & Workout History** — Zero sign-in required. Guest Mode and local user profiles persist in `localStorage`.
7. **Optional FastAPI Backend Persistence** — Non-blocking REST API persistence with opt-in anonymized landmark sequence collection.

---

## Key Features

- 🎯 **Real-Time Pose Estimation**: 33 pose landmarks tracked via MediaPipe BlazePose WASM.
- 📐 **Joint Angle Geometry**: Precise 2D dot-product angle math for knees, hips, and torso.
- 🔁 **Squat Rep Counting**: Temporal phase state machine ensuring full movement cycles.
- 📏 **Multi-Feature Depth Analysis**: Differentiates `FULL` valid squats from `PARTIAL` and `SHALLOW` attempts.
- 🛡️ **Rule-Based Form Analysis**: Transparent evaluation of depth, knee alignment, torso lean, and stability.
- 🔥 **MET Calorie Estimation**: Active workout duration & body weight calorie burn calculation.
- 👤 **Guest & Profile Modes**: No authentication required. Local profile management.
- 📊 **Workout History**: Local session persistence and progress metrics.
- 🔒 **Local-First Privacy**: Video frames stay 100% in browser memory and are never uploaded.
- 🧪 **Optional Research Data Collection**: Opt-in anonymized landmark coordinate sharing (default OFF).

---

## Architecture Diagram

```text
               BROWSER WORKSPACE
                      │
               Webcam Camera Feed
                      │
                      ▼
         MediaPipe Pose Landmarker (WASM)
                      │
                      ▼
              Landmark Abstraction (33 Points)
                      │
                      ▼
             Feature Extraction Vector
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
Squat State Machine          Form Analyzer
        │                           │
        └─────────────┬─────────────┘
                      ▼
         Multi-Feature Depth Analyzer
                      │
                      ▼
          Rep Counter & Validator
         (FULL / PARTIAL / SHALLOW)
                      │
                      ▼
               Session Analytics
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
Local History Store       Optional FastAPI Backend
 ('motionlab_sessions')       (SQLite Persistence)
```

---

## Tech Stack

### Frontend
- **Framework**: React 18 & TypeScript 5
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 (Custom dark technical theme)
- **Computer Vision**: `@mediapipe/tasks-vision` (MediaPipe Pose Landmarker WASM)
- **State Management**: Zustand 4
- **HTTP Client**: Axios 1

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn ASGI
- **Database**: SQLite & SQLAlchemy 2 ORM
- **Schemas**: Pydantic v2
- **Testing**: pytest & httpx

---

## Computer Vision & Analysis Pipeline

1. **Video Capture**: Native browser `getUserMedia()` stream.
2. **Pose Detection**: MediaPipe Pose Landmarker running on CPU/GPU via WebAssembly.
3. **Landmark Filtering**: Filters tracking points below confidence threshold ($>0.50$). If keypoints are obscured, tracking quality reports `LOW CONFIDENCE` or `OUT OF FRAME`.
4. **Vector Angle Calculation**:
   $$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{|\vec{BA}| |\vec{BC}|}\right) \times \frac{180}{\pi}$$
5. **State Machine**:
   $$\text{STANDING} \longrightarrow \text{DESCENDING} \longrightarrow \text{BOTTOM} \longrightarrow \text{ASCENDING} \longrightarrow \text{STANDING}$$
6. **Form Evaluation**: Evaluates 10th percentile lowest knee angle, 75th percentile torso lean, and knee valgus ratio.

---

## Squat Detection & Depth Classification

- **FULL Squat**: Minimum knee angle $\le 100^\circ$ held for minimum depth frames. Increments `validReps` ($+1$).
- **PARTIAL Squat**: Minimum knee angle between $101^\circ$ and $120^\circ$. Increments `partialReps` ($+1$ attempt, $0$ valid reps).
- **SHALLOW Attempt**: Minimum knee angle $> 120^\circ$. Increments `shallowReps` ($+1$ attempt, $0$ valid reps).

---

## Calorie Expenditure Estimation

- **Formula**:
  $$\text{Calories / min} = \frac{\text{MET} \times 3.5 \times \text{weightKg}}{200}$$
  $$\text{Total Calories} = \text{Calories / min} \times \text{activeDurationMinutes}$$
- **Config**: `CALORIE_CONFIG = { squatMET: 5.0 }`.
- **Disclaimer**: Calories are estimates based on active workout duration and body weight, not a clinical measurement.

---

## Privacy Architecture

🔒 **MotionLab is local-first.**  
Your webcam stream is processed entirely within your browser's WebAssembly sandbox. Video frames, video files, audio, and camera streams are **NEVER uploaded or transmitted to any server**.

---

## Future ML Classifier Roadmap

```text
Pose Landmarks
      ↓
Feature Extraction
      ↓
Temporal Sequences (60-90 frames)
      ↓
LSTM / Transformer ML Classifier Model
      ↓
Advanced Movement Classification
```

*Note: The current production implementation uses deterministic rule-based vector mathematics and MediaPipe pose estimation.*

---

## Running Locally

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Run tests:
```bash
npm test
```

Build production bundle:
```bash
npm run build
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python3 -m uvicorn app.main:app --reload --port 8001
```

Run tests:
```bash
python3 -m pytest tests/ -v
```

API Documentation: [http://localhost:8001/api/docs](http://localhost:8001/api/docs)
