---
title: "FriendChat Optimization Implementation Plan"
design_ref: "docs/maestro/plans/final-design.md"
created: "2026-04-18T12:30:00Z"
status: "draft"
total_phases: 8
estimated_files: 15
task_complexity: "complex"
---

# FriendChat Optimization Implementation Plan

## Plan Overview

- **Total phases**: 8
- **Agents involved**: architect, security_engineer, refactor, coder, ux_designer, performance_engineer, debugger, tester, devops_engineer
- **Estimated effort**: High complexity refactor with new P2P social features and security hardening.

## Dependency Graph

```
Phase 1 (Foundation)
       |
Phase 2 (Connection Hook)
      / | \
Phase 3a Phase 3b Phase 3c (Messaging, Media, FileTransfer - Parallel)
      \ | /
Phase 4 (Social Logic)
       |
Phase 5 (UI/UX Optimization)
       |
Phase 6 (Presence & Polish)
       |
Phase 7 (Validation & Testing)
       |
Phase 8 (Git & Deployment)
```

## Execution Strategy

| Stage | Phases | Execution | Agent Count | Notes |
|-------|--------|-----------|-------------|-------|
| 1     | Phase 1, 2 | Sequential | 1 | Foundation & Core P2P |
| 2     | Phase 3a, 3b, 3c | Parallel | 3 | Specialized Hooks |
| 3     | Phase 4, 5, 6 | Sequential | 1 | Social, UI, Presence |
| 4     | Phase 7, 8 | Sequential | 1 | Quality & Delivery |

## Phase 1: Foundation (Types & Interfaces)

### Objective
Define the shared types, interfaces, and constants needed for the modular hook system and social features.

### Agent: coder
### Parallel: No

### Files to Create

- `src/types/p2p.ts` — Shared interfaces for Connection, Messaging, Media, and Social states.
- `src/utils/constants.ts` — P2P signaling constants and configuration defaults.

### Files to Modify

- `src/types/chat.ts` — Update existing message types to support encryption flags and friend request types.

### Validation
- `npm run build` (Type checking only)

---

## Phase 2: Core Connection Hook (`useConnection`)

### Objective
Implement the base signaling and connection management hook, moving PeerJS and Gun initialization logic out of `usePeer.ts`.

### Agent: refactor
### Parallel: No

### Files to Create
- `src/hooks/useConnection.ts` — Handles PeerJS ID generation, Gun room subscriptions, and peer discovery.

### Files to Modify
- `src/hooks/usePeer.ts` — Deprecate initialization logic, start forwarding to `useConnection`.

### Validation
- Verify peer discovery in logs.
- `npm run build`

---

## Phase 3: Specialized Hooks (Parallel Batch)

### Phase 3a: Messaging Hook (`useMessaging`)
- **Agent**: security_engineer
- **Objective**: Implement SEA-encrypted messaging and Wall persistence.
- **Files**: `src/hooks/useMessaging.ts`

### Phase 3b: Media Hook (`useMedia`)
- **Agent**: coder
- **Objective**: Implement WebRTC audio/video stream management.
- **Files**: `src/hooks/useMedia.ts`

### Phase 3c: File Transfer Hook (`useFileTransfer`)
- **Agent**: coder
- **Objective**: Implement non-blocking P2P file chunking and progress tracking.
- **Files**: `src/hooks/useFileTransfer.ts`

### Validation (Batch)
- Unit tests for SEA encryption.
- Mock stream validation for `useMedia`.
- File chunk integrity tests.

---

## Phase 4: Social Logic (`useSocial`)

### Objective
Implement WebRTC friending, offline request persistence (Mailbox), and private friend-only rooms.

### Agent: coder
### Parallel: No

### Files to Create
- `src/hooks/useSocial.ts` — Logic for sending/accepting requests and checking room access.

### Implementation Details
- Use Gun SEA certificates for room access lists.
- Store encrypted requests in a dedicated Gun path (`mailbox/peerId`).

---

## Phase 5: UI/UX Optimization

### Objective
Update `ChatRoom`, `ChatBubble`, and `Lobby` to use the new hooks. Fix memory leaks and optimize rendering.

### Agent: ux_designer
### Parallel: No

### Files to Modify
- `src/components/ChatBubble.tsx` — Add `useEffect` for `URL.revokeObjectURL`.
- `src/components/ChatRoom.tsx` — Integrate `useSocial` and `useMessaging`. Add Hybrid Privacy Toggle.
- `src/components/Lobby.tsx` — Add Friends list and Private Server creation UI.

---

## Phase 6: Presence & Polish

### Objective
Implement "Live Presence" (Online/Typing) and refine UI aesthetics (Tailwind optimizations).

### Agent: coder
### Parallel: No

### Files to Modify
- `src/components/VoiceMesh.tsx` — Optimize visualization performance.
- `src/hooks/useConnection.ts` — Add heartbeat/typing broadcast logic.

---

## Phase 7: Validation & Testing

### Objective
Comprehensive integration testing of the P2P flows and memory leak verification.

### Agent: tester
### Parallel: No

### Files to Create
- `tests/social.spec.ts` — E2E tests for friending and private rooms.
- `tests/performance.spec.ts` — Benchmarks for memory and rendering.

---

## Phase 8: Git & Deployment

### Objective
Prepare the codebase for delivery and commit changes to the GitHub repository.

### Agent: devops_engineer
### Parallel: No

### Validation
- `npm run build && npm run lint`
- Final verification of GitHub Pages deployment configuration.

---

## File Inventory

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `src/types/p2p.ts` | 1 | Shared P2P interfaces |
| 2 | `src/utils/constants.ts` | 1 | P2P Signaling constants |
| 3 | `src/hooks/useConnection.ts` | 2 | Base signaling logic |
| 4 | `src/hooks/useMessaging.ts` | 3a | SEA Encrypted Messaging |
| 5 | `src/hooks/useMedia.ts` | 3b | WebRTC Media Streams |
| 6 | `src/hooks/useFileTransfer.ts` | 3c | P2P File Chunks |
| 7 | `src/hooks/useSocial.ts` | 4 | Friending & Private Rooms |
| 8 | `src/components/ChatBubble.tsx` | 5 | Memory leak fix |
| 9 | `src/components/ChatRoom.tsx` | 5 | Social integration & Privacy UI |
| 10 | `src/components/Lobby.tsx` | 5 | Friends/Servers UI |

## Execution Profile

```
Execution Profile:
- Total phases: 8
- Parallelizable phases: 3 (in 1 batch: Phase 3)
- Sequential-only phases: 5
- Estimated parallel wall time: ~4 hours
- Estimated sequential wall time: ~6 hours

Note: Native subagents currently run in YOLO mode.
All tool calls are auto-approved without user confirmation.
```
