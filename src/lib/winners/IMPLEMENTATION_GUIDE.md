# Winner Selection Implementation Guide

## Quick Start

The winner selection system is now fully implemented. Here's how to use it:

### API Usage

#### 1. Select Winners (Host Only)

```bash
# POST request to select winners
curl -X POST http://localhost:3000/api/drawings/{drawingId}/select-winners \
  -H "Authorization: Bearer {token}"
```

**Response:**

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

#### 2. Get Winners (Public)

```bash
# GET request to retrieve winners
curl http://localhost:3000/api/drawings/{drawingId}/select-winners
```

### From Server Code

```typescript
import { selectWinners, getDrawingWinners } from '@/lib/winners/select-winners'

// Select winners
const result = await selectWinners('drawingId123')

// Get existing winners
const winners = await getDrawingWinners('drawingId123')
```

## How It Works

### Random Method (`winnerSelection: 'random'`)

1. System fetches all eligible participants
2. Randomly shuffles the list
3. Selects first N participants
4. No number matching involved

### Number Method (`winnerSelection: 'number'`)

1. **Generate winning numbers** (if `isWinnerNumberRandom = true`)
   - OR use pre-defined `winnerNumbers`
2. **Match numbers to participants**:
   - Find participants who selected those numbers
   - Only eligible participants (`isEligible = true`)
3. **Guarantee winners** (Option 1):
   - If a winning number has no participant → assign to random eligible participant
   - Ensures there are always `winnersAmount` winners

## Implementation Details

### Files Created

1. **`src/lib/winners/utils.ts`**
   - `shuffleArray()` - Fisher-Yates shuffle
   - `generateUniqueRandomNumbers()` - Random number generation
   - `validateDrawingEnded()` - Drawing state validation
   - `validateWinnerSelection()` - Parameter validation

2. **`src/lib/winners/select-winners.ts`**
   - `selectWinners()` - Main orchestrator
   - `selectRandomWinners()` - Random selection logic
   - `selectNumberWinners()` - Number-based selection logic
   - `getDrawingWinners()` - Query winners

3. **`src/routes/api/drawings/$drawingId.select-winners.ts`**
   - POST endpoint for selecting winners
   - GET endpoint for retrieving winners
   - Authentication and authorization checks

### Business Rules

✅ **Implemented:**

- Only eligible participants (`isEligible = true`) can win
- Drawing must have ended (`endAt < now`)
- Winners can only be selected once per drawing
- Number method: Always guarantees winners (Option 1)
- Random method: Always has winners if eligible participants exist
- Rejected participants' numbers are released and can be reassigned

### Validations

- ✅ Drawing exists
- ✅ User is drawing owner (for selection)
- ✅ Drawing has ended
- ✅ Winners not already selected
- ✅ Sufficient eligible participants
- ✅ Valid winner count

## Testing Checklist

### Random Selection Tests

- [ ] Select 3 winners from 10 participants
- [ ] Select 1 winner from 1 participant (exact match)
- [ ] Try selecting 5 winners from 3 participants (should fail)
- [ ] Try selecting winners before drawing ends (should fail)
- [ ] Try selecting winners twice (should fail)

### Number Selection Tests - Random Numbers

- [ ] Generate 3 random numbers, all have participants
- [ ] Generate 3 random numbers, some available → reassign
- [ ] Generate 3 random numbers, all available → all reassigned
- [ ] Verify `winnerNumbers` updated in database

### Number Selection Tests - Pre-defined Numbers

- [ ] Use pre-defined `winnerNumbers` array
- [ ] Match participants to their numbers
- [ ] Handle rejected participant with winning number

### Edge Cases

- [ ] No eligible participants (all rejected/pending)
- [ ] Winning number assigned to rejected participant
- [ ] Multiple participants, ensure no duplicates
- [ ] Drawing with `isPaid = true` and pending participants

## Database Changes

No migrations needed! The implementation uses existing schema:

- ✅ `drawings.winnerNumbers` - Stores winning numbers
- ✅ `drawingWinners` - Junction table for winners
- ✅ `participants.isEligible` - Eligibility filter
- ✅ `numberSlots` - Number ownership tracking

## Next Steps (Optional)

### 1. Frontend Integration

Create UI components for:

- Host dashboard to trigger winner selection
- Winners announcement page
- Winner badges/indicators

### 2. Notifications

- Email winners
- SMS notifications
- Push notifications

### 3. Winner Management

- View winner history
- Export winner list
- Winner verification workflow

### 4. Analytics

- Selection success rate
- Average participants per drawing
- Winner distribution metrics

## Common Issues & Solutions

### "Drawing has not ended yet"

**Cause:** Trying to select winners before `endAt` timestamp  
**Solution:** Wait until drawing ends or adjust `endAt` for testing

### "Winners have already been selected"

**Cause:** Attempting to select winners multiple times  
**Solution:** Check `drawingWinners` table, delete records for re-selection (testing only)

### "No eligible participants found"

**Cause:** All participants are `isEligible = null` (pending) or `false` (rejected)  
**Solution:** Approve at least `winnersAmount` participants first

### "Cannot select N winners from M participants"

**Cause:** Not enough eligible participants  
**Solution:** Reduce `winnersAmount` or approve more participants

## Code Examples

### Create Drawing with Winner Configuration

```typescript
// Random selection
await fetch('/api/drawings', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Random Drawing',
    winnerSelection: 'random',
    winnersAmount: 3,
    endAt: new Date(Date.now() + 86400000), // 24 hours
  }),
})

// Number selection with random numbers
await fetch('/api/drawings', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Number Drawing',
    winnerSelection: 'number',
    winnersAmount: 5,
    quantityOfNumbers: 100,
    isWinnerNumberRandom: true,
    endAt: new Date(Date.now() + 86400000),
  }),
})

// Number selection with pre-defined numbers
await fetch('/api/drawings', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Fixed Number Drawing',
    winnerSelection: 'number',
    winnersAmount: 3,
    quantityOfNumbers: 100,
    isWinnerNumberRandom: false,
    winnerNumbers: [7, 42, 99],
    endAt: new Date(Date.now() + 86400000),
  }),
})
```

## Support

For detailed documentation, see `src/lib/winners/README.md`
