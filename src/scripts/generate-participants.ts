import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, and } from 'drizzle-orm'
import { parseArgs } from 'util'
import * as schema from '../db/schema'

config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})
const db = drizzle(pool, { schema })

// Random name generator
const firstNames = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Kimberly',
  'Paul',
  'Emily',
  'Andrew',
  'Donna',
  'Joshua',
  'Michelle',
  'Carlos',
  'Maria',
  'Luis',
  'Ana',
  'Pedro',
  'Carmen',
  'Juan',
  'Rosa',
  'Miguel',
  'Sofia',
]

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
]

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateRandomName(): string {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`
}

function generateRandomPhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100
  const prefix = Math.floor(Math.random() * 900) + 100
  const lineNumber = Math.floor(Math.random() * 9000) + 1000
  return `${areaCode}-${prefix}-${lineNumber}`
}

function generateRandomEmail(name: string): string {
  const domains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'email.com',
  ]
  const cleanName = name.toLowerCase().replace(/\s+/g, '.')
  const randomNum = Math.floor(Math.random() * 1000)
  return `${cleanName}${randomNum}@${getRandomElement(domains)}`
}

function getRandomEligibility(): boolean | null {
  const options: (boolean | null)[] = [true, false]
  return getRandomElement(options)
}

async function generateParticipants(drawingId: string, amount: number) {
  console.log(
    `\n🎲 Generating ${amount} participants for drawing: ${drawingId}\n`,
  )

  // Verify drawing exists
  const drawing = await db.query.drawings.findFirst({
    where: eq(schema.drawings.id, drawingId),
  })

  if (!drawing) {
    console.error(`❌ Drawing with ID "${drawingId}" not found`)
    process.exit(1)
  }

  console.log(`📋 Drawing: "${drawing.title}"`)
  console.log(`   Winner Selection: ${drawing.winnerSelection}`)
  console.log(`   Play with Numbers: ${drawing.playWithNumbers}`)
  if (drawing.playWithNumbers) {
    console.log(`   Total Numbers: ${drawing.quantityOfNumbers}`)
  }
  console.log('')

  // For drawings with numbers, get available number slots
  let availableSlots: { id: number; number: number }[] = []
  if (drawing.playWithNumbers) {
    availableSlots = await db.query.numberSlots.findMany({
      where: and(
        eq(schema.numberSlots.drawingId, drawingId),
        eq(schema.numberSlots.status, 'available'),
      ),
      columns: { id: true, number: true },
    })

    if (availableSlots.length < amount) {
      console.warn(
        `⚠️  Warning: Only ${availableSlots.length} available slots, but requested ${amount} participants`,
      )
      console.warn(
        `   Will create ${availableSlots.length} participants instead\n`,
      )
      amount = availableSlots.length
    }

    // Shuffle available slots for random assignment
    availableSlots = availableSlots.sort(() => Math.random() - 0.5)
  }

  // Insert participants one by one to get IDs for number slot association
  let inserted = 0
  for (let i = 0; i < amount; i++) {
    const name = generateRandomName()
    const isEligible = getRandomEligibility()
    const selectedNumber = drawing.playWithNumbers
      ? availableSlots[i]?.number
      : null

    // Insert participant
    const [participant] = await db
      .insert(schema.participants)
      .values({
        drawingId,
        name,
        phone: generateRandomPhone(),
        email: generateRandomEmail(name),
        isEligible,
        selectedNumber,
      })
      .returning({ id: schema.participants.id })

    // Update number slot if drawing uses numbers
    if (drawing.playWithNumbers && availableSlots[i]) {
      await db
        .update(schema.numberSlots)
        .set({
          status: 'taken',
          participantId: participant.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.numberSlots.id, availableSlots[i].id))
    }

    inserted++
    if (inserted % 50 === 0 || inserted === amount) {
      console.log(`   ✅ Inserted ${inserted}/${amount} participants`)
    }
  }

  console.log(
    `\n🎉 Successfully created ${amount} participants for drawing "${drawing.title}"`,
  )

  await pool.end()
}

// Parse CLI arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    d: {
      type: 'string',
      short: 'd',
    },
    a: {
      type: 'string',
      short: 'a',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
})

if (values.help) {
  console.log(`
Usage: npx tsx src/scripts/generate-participants.ts -d <drawingId> -a <amount>

Options:
  -d, --drawing-id   The ID of the drawing to add participants to
  -a, --amount       The number of participants to generate
  -h, --help         Show this help message

Example:
  npx tsx src/scripts/generate-participants.ts -d abc123 -a 100
`)
  process.exit(0)
}

const drawingId = values.d
const amount = parseInt(values.a || '0', 10)

if (!drawingId) {
  console.error('❌ Error: Drawing ID is required (-d <drawingId>)')
  process.exit(1)
}

if (!amount || amount <= 0) {
  console.error('❌ Error: Amount must be a positive number (-a <amount>)')
  process.exit(1)
}

generateParticipants(drawingId, amount)
