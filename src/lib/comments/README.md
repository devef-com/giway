# Participant Comments System

## Quick Start

This directory contains the proposal and implementation details for the participant comments feature.

## Documents

- **[PROPOSAL.md](./PROPOSAL.md)**: Complete technical proposal with database schema, API design, UI/UX implementation, and migration strategy

## Overview

The participant comments feature allows drawing hosts to add comments to individual participants. These comments can be:

- **Public**: Visible to both the host and the participant
- **Private**: Visible only to the host (for internal notes)

## Key Features

1. **Host Management View** (`/drawings/$drawingId/m/$participant`)
   - Add comments with visibility toggle
   - View all comments (public and private)
   - See comment metadata (author, timestamp)

2. **Participant View** (`/drawings/$drawingId/p/$participateId`)
   - View public comments from the host
   - Clean, simple message display

3. **Database Schema**
   - New `participant_comments` table
   - Proper foreign key relationships
   - Cascade delete support

4. **API Endpoints**
   - `GET/POST /api/participant/:participantId/comments` (Host)
   - `GET /api/drawings/:drawingId/p/:participantId/comments` (Participant)

## Implementation Summary

### Database
- Single table: `participant_comments`
- Relations to `participants` and `user` tables
- Visibility flag for comment control

### Backend
- Library functions in `src/lib/comments/index.ts`
- Authorization checks for host-only operations
- Public read-only access for participants

### Frontend
- Reusable comment components
- Integration with existing routes
- Proper state management

## Security

- ✅ Authorization: Only drawing owners can manage comments
- ✅ Visibility control: Private/public flag
- ✅ Input validation: Comment text sanitization
- ✅ Cascade deletion: Comments deleted with participants

## Next Steps

See [PROPOSAL.md](./PROPOSAL.md) for detailed implementation instructions.
