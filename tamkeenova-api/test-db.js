const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});



async function test() {
  try {
    await client.connect();
    console.log('CONNECTED SUCCESSFULLY');
    await client.end();
  } catch (err) {
    console.error(err);
  }
}

test();