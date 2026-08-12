# MotionLab

> **Real-time human movement intelligence.**

MotionLab is a webcam-based pose estimation and squat analysis platform.  
It tracks your body in real time, counts repetitions, evaluates form, and provides live coaching feedback.

---

## Current Status

> **Step 11 of 12 — Backend + Session Persistence + Python Analysis**

The complete end-to-end movement analysis pipeline and FastAPI session persistence backend are implemented and verified.

| Component | Status |
|---|---|
| Project scaffold & config | ✅ Complete (Step 1) |
| Webcam access | ✅ Complete (Step 2) |
| MediaPipe pose detection | ✅ Complete (Step 3) |
| Skeleton overlay | ✅ Complete (Step 4) |
| Joint angle calculations | ✅ Complete (Step 5) |
| Squat state machine | ✅ Complete (Step 6) |
| Rep counting | ✅ Complete (Step 7) |
| Form analysis | ✅ Complete (Step 8) |
| Analytics UI | ✅ Complete (Step 9) |
| Session summary | ✅ Complete (Step 10) |
| Backend session API & Python analysis | ✅ Complete (Step 11) |
| UI polish | 🔜 Step 12 |

---

## What MotionLab Does

1. **Accesses your webcam** — in the browser with explicit permission
2. **Detects your body** — using MediaPipe Pose Landmarker (WASM, runs locally)
3. **Extracts body landmarks** — 33 keypoints including hips, knees, ankles, shoulders
4. **Draws a real-time skeleton** — overlaid on the live video feed
5. **Calculates joint angles** — knee angle, hip angle, torso inclination
6. **Detects squat phases** — STANDING → DESCENDING → BOTTOM → ASCENDING
7. **Counts repetitions** — only valid full-cycle reps are counted
8. **Analyzes form** — rule-based checks for depth, knee alignment, torso lean, stability
9. **Displays live feedback** — plain-English coaching cues
10. **Generates a session summary** — using actual session data, not fabricated values
11. **Persists sessions to backend** — SQLite persistence via FastAPI with opt-in anonymized landmark data

---

## Architecture

```text
                BROWSER
                  │
             Webcam Feed
                  │
                  ▼
        MediaPipe Pose Landmarker (WASM)
                  │
                  ▼
             Landmarks
                  │
                  ▼
          Feature Extraction
                  │
          ┌───────┴────────┐
          ▼                ▼
   State Machine      Form Analyzer
          │                │
          └───────┬────────┘
                  ▼
             Rep Counter
                  │
                  ▼
           Session Summary
                  │
                  ▼
        OPTIONAL OPT-IN SAVE
                  │
                  ▼
          FastAPI Backend
                  │
                  ▼
              SQLite DB
```

### Privacy Architecture

> 🔒 **Webcam video is processed 100% locally in your browser.**  
> **Video frames, camera streams, audio, and image files are NEVER uploaded or sent to the backend.**

Only if you explicitly enable **anonymized data collection** will numerical pose landmark sequences (x, y, z coordinates, never video) be transmitted for research/training.

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool + dev server |
| Tailwind CSS | 3.x | Styling |
| `@mediapipe/tasks-vision` | 0.10.x | Client-side pose estimation |
| Zustand | 4.x | Session state management |
| Axios | 1.x | Backend HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111+ | REST API framework |
| Uvicorn | 0.30+ | ASGI server |
| Pydantic v2 | 2.x | Data validation |
| SQLAlchemy | 2.x | ORM / database abstraction |
| NumPy | 1.26+ | Python angle math + feature extraction |
| pytest + httpx | 8.x | Automated backend testing |

---

## Running Locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8001
```

API docs: [http://localhost:8001/api/docs](http://localhost:8001/api/docs)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness health check |
| `POST` | `/api/sessions` | Save a completed workout session |
| `GET` | `/api/sessions` | List recent workout sessions (`?limit=20`) |
| `GET` | `/api/sessions/{id}` | Get detailed session metrics & reps |

---

## Running Backend Tests

```bash
cd backend
python3 -m pytest tests/ -v
```

All 15 tests pass across `test_angles.py`, `test_feature_extraction.py`, `test_squat_analyzer.py`, and `test_api.py`.
