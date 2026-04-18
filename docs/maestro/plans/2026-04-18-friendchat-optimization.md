---
title: "FriendChat P2P Optimization & Social Logic"
created: "2026-04-18T12:00:00Z"
status: "draft"
authors: ["TechLead", "User"]
type: "design"
design_depth: "deep"
task_complexity: "complex"
---

# FriendChat Optimization Design Document

## Problem Statement

FriendChat is a decentralized P2P chat application using PeerJS for direct communication and Gun for signaling/shared state. While functional, it suffers from significant architectural debt (God Hook), performance bottlenecks (memory leaks, O(n^2) scaling), and security gaps (plaintext Wall storage, weak hashing). The user requires a comprehensive optimization ("All-in-One Sweep") with a focus on privacy, scalability, and new social features (Friending, Private Servers).

## Requirements

### Functional Requirements

1. **REQ-1**: Refactor `usePeer.ts` into specialized hooks (`useConnection`, `useMessaging`, `useMedia`, `useFileTransfer`).
2. **REQ-2**: Implement Hybrid Privacy Control for the Gun "Wall" (SEA encryption by default, user toggle).
3. **REQ-3**: Fix memory leaks in `ChatBubble` (Blob URL revocation).
4. **REQ-4**: Optimize message rendering in `ChatRoom` (avoid O(n) filtering on every render).
5. **REQ-5**: Implement Scalable Topology (Relay-lite) to reduce PeerJS connection overhead.
6. **REQ-6**: Secure password hashing with salting.
7. **REQ-7**: Implement WebRTC-based Friending with offline persistence (via Gun mailbox).
8. **REQ-8**: Create Private Friend-only Rooms/Servers with access control.
9. **REQ-9**: Add "Live Presence" (Online/Offline/Typing) via PeerJS DataChannels.

### Non-Functional Requirements

1. **PERF-1**: Eliminate memory growth from unrevoked Blob URLs.
2. **PERF-2**: Reduce UI lag during large group chats.
3. **SEC-1**: Ensure no sensitive data is stored in plaintext on the Gun network unless explicitly requested.
4. **SEC-2**: Friend requests and private room metadata must be end-to-end encrypted.
5. **UX-1**: Non-blocking file transfers with progress indicators.

### Constraints

- Maintain decentralized architecture (No central server).
- Preserve existing PeerJS and Gun dependencies where possible.
- Compatibility with browser-native WebRTC.

## Approach

### Selected Approach

**Modular P2P Architecture with Social Graph and User-Controlled Privacy**

This approach expands the modular hook system to include a Social Graph logic (`useSocial`). Friend requests are sent via WebRTC if both peers are online, or stored as encrypted "Mailbox" entries in Gun if one is offline. Private rooms utilize Gun SEA certificates to restrict entry to approved friends only.

### Alternatives Considered

#### Optimized Full Mesh (Iterative)

- **Description**: Keep current structure but optimize `useEffect` and `useMemo`.
- **Pros**: Low implementation risk.
- **Cons**: Still O(n^2) scaling; doesn't address "God Hook" debt.
- **Rejected Because**: Does not satisfy the user's request for comprehensive optimization and scalability.

#### Centralized Signaling (Relay-Only)

- **Description**: Use a central server for all signaling.
- **Pros**: O(1) connection logic.
- **Cons**: Violates the "Decentralized/P2P" core requirement.
- **Rejected Because**: Direct contradiction of FriendChat's decentralized value proposition.

### Decision Matrix

| Criterion | Weight | Scalable Topology | Full Mesh |
|-----------|--------|-------------------|-----------|
| Scalability | 30% | 5: O(n) relay-lite | 2: O(n^2) mesh |
| Social Features | 30% | 5: Hybrid WebRTC/Gun | 3: Gun only |
| Decentralization | 20% | 4: Peer-based relay | 5: Direct P2P |
| Performance | 10% | 5: Reduced connections | 3: Heavy overhead |
| Complexity | 10% | 3: Moderate refactor | 5: Low change |
| **Weighted Total** | | **4.6** | **3.3** |

## Architecture

### Component Diagram

```
[UI Layer]
   |--> ChatRoom (State Orchestrator)
         |--> [Hooks]
         |      |--> useConnection (Signaling/Mesh)
         |      |--> useMessaging (SEA Encryption/Wall)
         |      |--> useSocial (Friendship/Private Rooms)
         |      |--> useMedia (WebRTC Streams)
         |      |--> useFileTransfer (P2P Data)
         |
         |--> [UI Components]
                |--> FriendsList (Management)
                |--> PrivateServers (Creation/Entry)
                |--> ChatBubble (Optimized Rendering/Revocation)
                |--> VoiceMesh (Media Visualization)

[Persistence Layer]
   |--> Gun (Decentralized State / Mailbox / Wall)
   |--> PeerJS (Signaling / Data Channels / Presence)
```

### Data Flow

1. **Signaling**: `useConnection` initiates Gun rooms and PeerJS handshakes. Traces To: REQ-5.
2. **Messaging**: `useMessaging` encrypts content via SEA before pushing to Gun. Traces To: REQ-2.
3. **Social**: `useSocial` manages E2EE friend requests and room access lists. Traces To: REQ-7, REQ-8.
4. **Media**: `useMedia` manages WebRTC streams directly between peers. Traces To: REQ-1.
5. **Presence**: `useConnection` broadcasts heartbeats over DataChannels. Traces To: REQ-9.

### Key Interfaces

```typescript
interface SocialHook {
  friends: Friend[];
  sendRequest: (peerId: string) => Promise<void>;
  acceptRequest: (peerId: string) => Promise<void>;
  createPrivateServer: (name: string) => Promise<string>;
}

interface MessagingHook {
  send: (content: string, isPrivate: boolean) => Promise<void>;
  messages: Message[];
  status: 'idle' | 'sending' | 'error';
}
```

## Agent Team

| Phase | Agent(s) | Parallel | Deliverables |
|-------|----------|----------|--------------|
| 1     | architect, security_engineer | Yes | Security Hardening Spec, Social Graph Design |
| 2     | refactor, coder | No | Specialized Hooks (inc. useSocial), Gun/PeerJS Refactor |
| 3     | coder, ux_designer | Yes | Hybrid Privacy UI, Friends/Servers UI |
| 4     | performance_engineer, debugger | Yes | Memory leak validation, scaling benchmarks |
| 5     | tester | No | Integration tests, Social flow verification |
| 6     | git_guy | No | Commit & PR preparation |

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Relay Peer failure | HIGH | MEDIUM | Implement dynamic relay promotion (next best peer). |
| SEA key loss | MEDIUM | LOW | Store user keys in browser localStorage with backup prompt. |
| PeerJS latency | LOW | MEDIUM | Use Gun for signaling fallback. |

## Success Criteria

1. **SC-1**: Zero memory growth in `ChatBubble` during 10-minute active chat sessions.
2. **SC-2**: Wall posts are encrypted in Gun by default (verified via Gun console).
3. **SC-3**: `usePeer.ts` file size reduced by >50% through modularization.
4. **SC-4**: Friend requests correctly persist in Gun and resolve when peers come online.
5. **SC-5**: Private servers restrict entry to non-friends (verified via SEA verification).
