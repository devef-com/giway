# Participant Comments Feature - Visual Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐           ┌─────────────────────────┐  │
│  │   Host View        │           │   Participant View      │  │
│  │  m.$participant    │           │  p.$participateId       │  │
│  ├────────────────────┤           ├─────────────────────────┤  │
│  │ • Add comments     │           │ • View public comments  │  │
│  │ • Toggle visibility│           │ • See host messages     │  │
│  │ • View all         │           │ • Timestamp display     │  │
│  │ • Edit/Delete      │           │ • Read-only access      │  │
│  └────────┬───────────┘           └────────┬────────────────┘  │
│           │                                │                   │
└───────────┼────────────────────────────────┼───────────────────┘
            │                                │
            ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/participant/:participantId/comments                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  GET    - Fetch all comments (host only)                 │  │
│  │  POST   - Create new comment (host only)                 │  │
│  │  PATCH  - Update comment (author only)                   │  │
│  │  DELETE - Remove comment (author only)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/drawings/:drawingId/p/:participantId/comments      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  GET    - Fetch public comments (no auth required)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  src/lib/comments/index.ts                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • createComment()                                        │  │
│  │  • getCommentsForHost()                                   │  │
│  │  • getCommentsForParticipant()                            │  │
│  │  • updateComment()                                        │  │
│  │  • deleteComment()                                        │  │
│  │  • verifyDrawingOwnership()                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  participant_comments table                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  id                    SERIAL PRIMARY KEY                 │  │
│  │  participant_id        INTEGER → participants(id)         │  │
│  │  author_id             TEXT → user(id)                    │  │
│  │  comment               TEXT NOT NULL                      │  │
│  │  is_visible_to_participant  BOOLEAN DEFAULT TRUE          │  │
│  │  created_at            TIMESTAMP DEFAULT NOW()            │  │
│  │  updated_at            TIMESTAMP DEFAULT NOW()            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Indexes:                                                       │
│  • idx_participant_comments_participant_id                      │
│  • idx_participant_comments_author_id                           │
│  • idx_participant_comments_created_at                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Host Adds Comment

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  Host UI │────▶│ API POST│────▶│ Validate │────▶│ Database │
└──────────┘     └─────────┘     │ & Auth   │     │  INSERT  │
                                 └──────────┘     └──────────┘
     ▲                                                   │
     │                                                   │
     └───────────────────────────────────────────────────┘
                    Return new comment
```

### 2. Participant Views Comments

```
┌────────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Participant │────▶│ API GET │────▶│  Filter  │────▶│ Database │
│    UI      │     │         │     │ visible  │     │  SELECT  │
└────────────┘     └─────────┘     │   only   │     └──────────┘
     ▲                             └──────────┘           │
     │                                                    │
     └────────────────────────────────────────────────────┘
              Return only public comments
```

## Component Hierarchy

```
src/routes/drawings/$drawingId/m.$participant.tsx
├── Participant Information Card
├── Status Change Section
└── ParticipantComments Component ← NEW
    ├── Add Comment Form
    │   ├── Textarea (comment input)
    │   ├── Visibility Toggle Switch
    │   └── Submit Button
    └── Comments List
        └── Comment Item (for each comment)
            ├── Author & Timestamp
            ├── Visibility Badge
            └── Comment Text

src/routes/drawings/$drawingId/p.$participateId.tsx
├── Participant Status Card
├── QR Code Card
└── ParticipantCommentsView Component ← NEW
    └── Comments List (read-only)
        └── Comment Item (for each)
            ├── Comment Text
            └── Timestamp
```

## Database Relationships

```
┌──────────────┐         ┌───────────────────────┐
│     user     │         │   participants        │
│──────────────│         │───────────────────────│
│ id (PK)      │◀────┐   │ id (PK)               │◀───┐
│ name         │     │   │ drawing_id            │    │
│ email        │     │   │ name                  │    │
└──────────────┘     │   │ phone                 │    │
                     │   │ is_eligible           │    │
                     │   └───────────────────────┘    │
                     │                                │
                     │   ┌───────────────────────────┐│
                     │   │ participant_comments      ││
                     │   │───────────────────────────││
                     └───│ author_id (FK)            ││
                         │ participant_id (FK) ──────┘│
                         │ comment                    │
                         │ is_visible_to_participant  │
                         │ created_at                 │
                         │ updated_at                 │
                         └────────────────────────────┘

Cascade Rules:
• Delete user → Delete their comments
• Delete participant → Delete all comments
```

## Access Control Matrix

```
┌──────────────────┬──────────┬─────────────┬─────────────┬──────────┐
│ Action           │   Host   │  Author     │ Participant │  Public  │
├──────────────────┼──────────┼─────────────┼─────────────┼──────────┤
│ View All         │    ✓     │      ✓      │      ✗      │    ✗     │
│ View Public      │    ✓     │      ✓      │      ✓      │    ✓     │
│ Create Comment   │    ✓     │      ✓      │      ✗      │    ✗     │
│ Edit Comment     │    ✗     │      ✓      │      ✗      │    ✗     │
│ Delete Comment   │    ✗     │      ✓      │      ✗      │    ✗     │
│ Toggle Visibility│    ✗     │      ✓      │      ✗      │    ✗     │
└──────────────────┴──────────┴─────────────┴─────────────┴──────────┘

Note: Host = Drawing owner, Author = Comment creator
```

## UI Mockups (Text-based)

### Host View - Comment Section

```
┌─────────────────────────────────────────────────────────────┐
│ Comments                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Add a comment for this participant...                   │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☑ Visible to participant          [Add Comment]            │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ John Doe                           2025-12-08 10:00 AM  │ │
│ │ Please submit payment proof by tomorrow                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ John Doe                 [Private] 2025-12-07 02:30 PM  │ │
│ │ Internal note: Follow up next week                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Participant View - Messages Section

```
┌─────────────────────────────────────────────────────────────┐
│ Messages from Host                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Thank you for participating! We'll announce the winners │ │
│ │ on December 15th.                                       │ │
│ │                                                         │ │
│ │                                    2025-12-08 10:00 AM  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Please submit payment proof by tomorrow                 │ │
│ │                                                         │ │
│ │                                    2025-12-07 02:30 PM  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Timeline

```
Phase 1: Database & Backend (Day 1-2)
├── Create migration file
├── Update schema.ts
├── Implement lib/comments functions
└── Add API routes

Phase 2: Frontend Components (Day 3-4)
├── Create ParticipantComments component
├── Create ParticipantCommentsView component
└── Add UI dependencies (if needed)

Phase 3: Integration (Day 5)
├── Integrate into host view
├── Integrate into participant view
└── Test end-to-end flows

Phase 4: Testing & Polish (Day 6-7)
├── Unit tests
├── Integration tests
├── UI/UX polish
└── Documentation updates
```

## File Structure

```
src/
├── db/
│   └── schema.ts ← Add participant_comments table
│
├── lib/
│   └── comments/
│       ├── README.md ← Quick reference
│       ├── PROPOSAL.md ← Full proposal
│       ├── ARCHITECTURE.md ← This file
│       └── index.ts ← Comment functions (to be created)
│
├── routes/
│   ├── api/
│   │   ├── participant/
│   │   │   └── $participantId.comments.ts ← Host API
│   │   └── drawings/
│   │       └── $drawingId/
│   │           └── p/
│   │               └── $participantId.comments.ts ← Participant API
│   │
│   └── drawings/
│       └── $drawingId/
│           ├── m.$participant.tsx ← Add ParticipantComments
│           └── p.$participateId.tsx ← Add ParticipantCommentsView
│
└── components/ (optional)
    └── ParticipantComments.tsx ← Reusable component
```
