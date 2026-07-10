import { db } from './db';
import { clients, personas } from './db/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Load environment variables for the standalone script
dotenv.config();
dotenv.config({ path: '.env.local' });

async function testDatabase() {
  console.log('Connecting to database and running tests...');

  try {
    // 1. Insert a dummy client
    console.log('Inserting dummy client...');
    const insertedClients = await db.insert(clients).values({
      name: 'Test Agency Client',
      website: 'https://testagency.com',
      status: 'active'
    }).returning();
    
    const newClient = insertedClients[0];
    console.log(`Successfully inserted client with ID: ${newClient.id}`);

    // 2. Insert a dummy persona linked to the client
    console.log('Inserting dummy persona...');
    const insertedPersonas = await db.insert(personas).values({
      clientId: newClient.id,
      name: 'Tech Enthusiast',
      systemPrompt: 'You are a tech enthusiast who loves reviewing gadgets.',
      targetSubreddits: ['r/gadgets', 'r/technology'],
      tone: 'excited'
    }).returning();
    
    const newPersona = insertedPersonas[0];
    console.log(`Successfully inserted persona with ID: ${newPersona.id}`);

    // 3. Query it back (Read Test)
    console.log('Querying back the data using relations...');
    const fetchedClient = await db.query.clients.findFirst({
      where: eq(clients.id, newClient.id),
      with: {
        personas: true
      }
    });

    console.log('--- TEST RESULTS ---');
    console.dir(fetchedClient, { depth: null });
    console.log('--------------------');
    console.log('Database read/write connection test passed successfully!');

  } catch (error) {
    console.error('Database test failed:', error);
  }
}

// Execute the test function
testDatabase();
