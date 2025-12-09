# Participant Comments System

## Quick Start

This directory contains the proposal and implementation details for the **bidirectional** participant comments feature.

## Documents

- **[INDEX.md](./INDEX.md)**: Documentation navigation hub
- **[PROPOSAL.md](./PROPOSAL.md)**: Complete technical proposal with database schema, API design, UI/UX implementation, and migration strategy
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Visual architecture diagrams and system design

## Overview

The participant comments feature enables **two-way communication** between drawing hosts and participants. Both parties can add comments, creating a conversation thread for each participant.

### Key Characteristics

- **Bidirectional**: Both hosts AND participants can add comments
- **No Login Required**: Participants comment using their unique participant link (no authentication needed)
- **Public/Private**: Host comments can be public or private; participant comments are always visible
- **Real-time Conversation**: Comments flow chronologically like a chat thread

## Key Features

1. **Host Management View** (`/drawings/$drawingId/m/$participant`)
   - Add comments with visibility toggle (public/private)
   - View entire conversation thread (including participant replies)
   - See all comments with author type badges
   - Distinguish between host and participant messages

2. **Participant View** (`/drawings/$drawingId/p/$participateId`)
   - View all public host comments
   - Reply to host messages
   - See conversation history
   - **No login required** - uses unique participant link

3. **Database Schema**
   - New `participant_comments` table
   - Support for both host and participant comments
   - `author_type` field to distinguish comment source
   - `author_name` stored for participants (no user account)
   - Proper foreign key relationships
   - Cascade delete support

4. **API Endpoints**
   - `GET/POST /api/participant/:participantId/comments` (Host - authenticated)
   - `GET/POST /api/drawings/:drawingId/p/:participantId/comments` (Participant - public)

## Implementation Summary

### Database

- Single table: `participant_comments`
- Relations to `participants` and `user` tables
- `author_type` enum: 'host' or 'participant'
- `author_id` nullable (NULL for participant comments)
- Visibility flag for host comment control

### Backend

- Library functions in `src/lib/comments/index.ts`
- Separate functions: `createHostComment()` and `createParticipantComment()`
- Authorization checks for host-only operations
- **No authentication required** for participant comments

### Frontend

- Bidirectional conversation UI components
- Clear visual distinction between host and participant messages
- Reply functionality for participants
- Integration with existing routes

## Security

- ✅ Authorization: Only drawing owners can manage host comments
- ✅ **No auth required**: Participants use unique link (participant ID)
- ✅ Visibility control: Private/public flag for host comments
- ✅ Input validation: Comment text sanitization
- ✅ Cascade deletion: Comments deleted with participants
- ✅ Rate limiting: Consider for spam prevention

## Next Steps

See [PROPOSAL.md](./PROPOSAL.md) for detailed implementation instructions.
