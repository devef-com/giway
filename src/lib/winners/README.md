# Winner Selection System

## Overview

This module provides comprehensive winner selection logic for drawings, supporting both **random participant selection** and **number-based selection** methods.

## Core Features

### Selection Methods

1. **Random Selection** (`winnerSelection: 'random'`)
   - Randomly selects winners from all eligible participants
   - No number matching involved
   - Always guarantees winners if eligible participants exist

2. **Number-Based Selection** (`winnerSelection: 'number'`)
   - Selects winners based on matching winning numbers
   - Winning numbers can be randomly generated or pre-defined
   - **Option 1 Implementation**: Always guarantees winners by assigning available numbers to eligible participants

## Architecture

### File Structure

```
src/lib/winners/
├── utils.ts              # Helper utilities
├── select-winners.ts     # Core selection logic
└── README.md            # This file

src/routes/api/drawings/
└── $drawingId.select-winners.ts  # API endpoint
```

### Key Functions

#### `selectWinners(drawingId: string)`

Main orchestrator function that:

- Validates drawing state (must have ended)
- Prevents duplicate winner selection
- Delegates to appropriate selection method
- Returns complete winner information

#### `selectRandomWinners(params)`

Random selection implementation:

- Fetches all eligible participants (`isEligible = true`)
- Uses Fisher-Yates shuffle for randomization
- Selects first N participants where N = `winnersAmount`
- Inserts into `drawingWinners` table

#### `selectNumberWinners(params)`

Number-based selection implementation:

- Generates random winning numbers OR uses pre-defined numbers
- Matches numbers to participants via `numberSlots` table
- Implements **Option 1 logic**: If a winning number has no eligible participant, randomly assigns it to any eligible participant
- Updates `drawing.winnerNumbers` if generated
- Inserts into `drawingWinners` table

#### `getDrawingWinners(drawingId: string)`

Query function to retrieve winners:

- Returns participant details
- Includes winning numbers (for number-based drawings)
- Includes selection method used

## API Endpoints

### POST `/api/drawings/:drawingId/select-winners`

Select winners for a drawing.

**Authentication**: Required (must be drawing owner)

**Requirements**:

- Drawing must have ended (`endAt < now`)
- Winners must not have been selected previously
- User must own the drawing

**Response**:

```json
{
  "success": true,
  "message": "Successfully selected 3 winner(s)",
  "data": {
    "drawingId": "abc123",
    "winners": [
      {
        "participantId": 42,
        "participantName": "John Doe",
        "winningNumber": 7
      }
    ],
    "winnerNumbers": [7, 13, 21],
    "selectionMethod": "number",
    "timestamp": "2025-11-24T10:30:00.000Z"
  }
}
```

**Error Responses**:

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the drawing owner
- `404 Not Found` - Drawing doesn't exist
- `400 Bad Request` - Drawing hasn't ended, winners already selected, or no eligible participants

### GET `/api/drawings/:drawingId/select-winners`

Retrieve winners for a drawing.

**Authentication**: Not required (public)

**Response**:

```json
{
  "drawingId": "abc123",
  "winners": [
    {
      "participantId": 42,
      "participantName": "John Doe",
      "participantEmail": "john@example.com",
      "participantPhone": "+1234567890",
      "selectedAt": "2025-11-24T10:30:00.000Z"
    }
  ],
  "winnerNumbers": [7, 13, 21],
  "selectionMethod": "number"
}
```

## Database Schema

### Tables Used

#### `drawings`

- `winnerSelection`: 'random' | 'number'
- `winnersAmount`: Number of winners to select
- `quantityOfNumbers`: Total numbers available (number method only)
- `isWinnerNumberRandom`: Generate numbers vs use pre-defined
- `winnerNumbers`: Array of winning numbers (populated on selection)

#### `participants`

- `isEligible`: null (pending) | true (approved) | false (rejected)
- `selectedNumber`: For tracking (random method)
- `logNumbers`: Tracks numbers of rejected participants

#### `numberSlots`

- `status`: 'available' | 'reserved' | 'taken'
- `participantId`: Foreign key to participants
- `number`: The slot number

#### `drawingWinners`

- Junction table linking drawings to winning participants
- `drawingId`: Foreign key to drawings
- `participantId`: Foreign key to participants
- `selectedAt`: Timestamp of selection

## Selection Rules

### Random Method

1. Fetch all participants with `isEligible = true`
2. Validate at least `winnersAmount` eligible participants exist
3. Randomly shuffle participants
4. Select first N participants
5. Insert into `drawingWinners` table

### Number Method - Option 1 (Guaranteed Winners)

1. **Generate/Use Winning Numbers**:
   - If `isWinnerNumberRandom = true`: Generate N random numbers from 1 to `quantityOfNumbers`
   - Else: Use existing `winnerNumbers` array

2. **Match Numbers to Participants**:
   - Query `numberSlots` for winning numbers
   - Join with `participants` to check eligibility
   - Filter where `status = 'taken'` AND `isEligible = true`

3. **Handle Unmatched Numbers (Option 1)**:
   - If a winning number has no eligible participant (available/rejected):
   - Randomly assign to any eligible participant who hasn't won yet
   - This guarantees `winnersAmount` winners

4. **Insert Winners**:
   - Add all winners to `drawingWinners` table
   - Update `drawing.winnerNumbers` if generated

### Edge Cases Handled

- **No eligible participants**: Throws error
- **Fewer participants than winners**: Throws error
- **Winner number with rejected participant**: Reassigns to another eligible participant
- **Duplicate winners**: Prevented by tracking `participantIdsUsed` set
- **Drawing hasn't ended**: Validated before selection
- **Winners already selected**: Checked to prevent duplicates

## Usage Example

### From API (Frontend)

```typescript
// Select winners
const response = await fetch(`/api/drawings/${drawingId}/select-winners`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})

const result = await response.json()

if (result.success) {
  console.log(`Selected ${result.data.winners.length} winners`)
  console.log('Winners:', result.data.winners)
}

// Get winners
const winners = await fetch(`/api/drawings/${drawingId}/select-winners`)
const winnersData = await winners.json()
console.log('Winners:', winnersData.winners)
```

### From Server Code

```typescript
import { selectWinners, getDrawingWinners } from '@/lib/winners/select-winners'

// Select winners
try {
  const result = await selectWinners('abc123')
  console.log('Selection complete:', result)
} catch (error) {
  console.error('Selection failed:', error.message)
}

// Query winners
const winners = await getDrawingWinners('abc123')
```

## Testing Scenarios

### Random Selection

1. **Standard case**: 100 participants, select 3 winners
2. **Edge case**: Exact match (3 participants, select 3 winners)
3. **Error case**: 2 participants, select 3 winners (should fail)

### Number Selection - Random Numbers

1. **Full match**: All winning numbers have eligible participants
2. **Partial match**: Some winning numbers available, reassigned to eligible participants
3. **All available**: No participants selected numbers, all reassigned

### Number Selection - Pre-defined Numbers

1. **With pre-defined numbers**: Drawing has `winnerNumbers` array set
2. **Matching participants**: Participants have selected the winning numbers
3. **Mixed availability**: Some matches, some reassignments

### Rejection Scenarios

1. **Rejected participant with winning number**: Number reassigned
2. **All participants rejected**: Should fail (no eligible participants)

## Future Enhancements

### Option 2: Allow No Winners

For number-based selection, add configuration to allow drawings with no winners if all winning numbers are available/rejected.

```typescript
// Add to drawings table
allowNoWinners: boolean // Default false

// Modified logic
if (allowNoWinners && noEligibleMatch) {
  return { winners: [], winnerNumbers }
}
```

### Winner Notifications

- Email/SMS notification system
- Webhook triggers
- Admin notification dashboard

### Analytics

- Winner selection history
- Selection timing metrics
- Participant-to-winner conversion rates

## Notes

- Winner selection is a one-time operation per drawing
- Once winners are selected, they cannot be changed (prevents fraud)
- Only approved participants (`isEligible = true`) are eligible
- Rejected participants have their numbers logged in `logNumbers` field
- System uses cryptographically secure randomization for fairness
