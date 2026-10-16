const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seedDemoCourses, removeDemoCourses } = require('../prisma/demo-catalog/manage.cjs');
const fixture = require('../prisma/demo-catalog/courses.json');
function database(categories = [...new Set(fixture.map(c => c.category))].map(slug => ({id:slug,slug,name_en:slug,name_ar:slug}))) {
  const rows = []; const links = [];
  const matches = (row, where) => (!where.slug?.startsWith || row.slug.startsWith(where.slug.startsWith)) &&
    (!where.slug?.in || where.slug.in.includes(row.slug)) &&
    (!where.description_en?.startsWith || row.description_en?.startsWith(where.description_en.startsWith)) &&
    (!where.id?.in || where.id.in.includes(row.id));
  const tx = {
    course_categories: {findMany: async () => categories},
    courses: {
      createMany: async ({data,skipDuplicates}) => {
        assert.equal(skipDuplicates,true); let count=0;
        for (const row of data) if (!rows.some(r => r.slug === row.slug)) {rows.push({...row,id:row.slug,_count:{enrollments:0,reviews:0}});count++;}
        return {count};
      },
      findMany: async ({where}) => rows.filter(row => matches(row,where)),
      deleteMany: async ({where}) => {let count=0;for(let i=rows.length-1;i>=0;i--) if(matches(rows[i],where)){rows.splice(i,1);count++;}return {count};},
    },
    course_category_links: {createMany: async ({data}) => {for(const link of data) if(!links.some(l=>l.course_id===link.course_id && l.category_id===link.category_id)) links.push(link);}},
  };
  return {rows,links,$transaction: async fn => fn(tx)};
}
test('Prisma seed inserts 27 published bilingual samples and is additive on rerun',async()=>{
  const db=database();db.rows.push({id:'real',slug:'real',title_en:'Keep'});
  const first=await seedDemoCourses(db);const second=await seedDemoCourses(db);
  assert.equal(first.inserted,27);assert.equal(second.inserted,0);
  assert.ok(second.categories.every(c=>c.demo_courses===3));assert.equal(db.links.length,27);
  assert.equal(db.rows.find(c=>c.slug==='real').title_en,'Keep');
  for(const sample of fixture){const row=db.rows.find(c=>c.slug===`demo-catalog-v1-${sample.category}-${sample.position}`);assert.equal(row.cover_image_url,sample.cover);assert.equal(row.status,'PUBLISHED');assert.equal(row.title_ar,sample.title_ar);}
});
test('Prisma seed refuses an empty category set and supports future categories',async()=>{
  await assert.rejects(seedDemoCourses(database([])),/No active categories/);
  const db=database([{id:'new',slug:'new-field',name_en:'New',name_ar:'جديد'}]);
  const result=await seedDemoCourses(db);assert.equal(result.inserted,3);assert.match(db.rows[0].cover_image_url,/generic-1.jpg$/);
});
test('Prisma preserves a non-demo slug collision and reports fewer demos',async()=>{
  const db=database();db.rows.push({id:'collision',slug:`demo-catalog-v1-${fixture[0].category}-1`,description_en:'Real course'});
  const result=await seedDemoCourses(db);assert.equal(result.inserted,26);assert.equal(result.categories[0].demo_courses,2);
  assert.ok(!db.links.some(l=>l.course_id==='collision'));await removeDemoCourses(db);
  assert.equal(db.rows.length,1);assert.equal(db.rows[0].id,'collision');
});
test('Prisma cleanup refuses learner history, then deletes only marked demos',async()=>{
  const db=database();await seedDemoCourses(db);db.rows[0]._count.enrollments=1;
  await assert.rejects(removeDemoCourses(db),/Removal cancelled/);assert.equal(db.rows.length,27);
  db.rows[0]._count.enrollments=0;db.rows[1]._count.reviews=1;
  await assert.rejects(removeDemoCourses(db),/Removal cancelled/);db.rows[1]._count.reviews=0;
  const result=await removeDemoCourses(db);assert.equal(result.count,27);
});

const { demoConnectionUrl, connectWithRetry } = require('../prisma/demo-catalog/manage.cjs');
test('CLI connection budget is isolated, preserves SSL and does not mutate the input environment', () => {
  const env = {DATABASE_URL:'postgresql://user:example@db.example.test/catalog?sslmode=require&connect_timeout=60&pool_timeout=10&connection_limit=13'};
  const original = env.DATABASE_URL;
  const url = new URL(demoConnectionUrl(env));
  assert.equal(url.searchParams.get('connection_limit'),'1');
  assert.equal(url.searchParams.get('connect_timeout'),'30');
  assert.equal(url.searchParams.get('pool_timeout'),'60');
  assert.equal(url.searchParams.get('sslmode'),'require');
  assert.equal(url.hostname,'db.example.test');
  assert.equal(env.DATABASE_URL,original);
});
test('optional demo Direct URL is used without modifying or guessing the backend endpoint', () => {
  const env = {DATABASE_URL:'postgresql://user:example@pool.example.test/catalog',DEMO_DATABASE_URL:'postgresql://user:example@direct.example.test/catalog?sslmode=require'};
  assert.equal(new URL(demoConnectionUrl(env)).hostname,'direct.example.test');
  assert.match(env.DATABASE_URL,/pool.example.test/);
});
test('invalid connection settings produce safe messages without echoing credentials', () => {
  assert.throws(()=>demoConnectionUrl({}),/DATABASE_URL is missing/);
  assert.throws(()=>demoConnectionUrl({DATABASE_URL:'private-secret-invalid'}),error=>!error.message.includes('private-secret'));
  assert.throws(()=>demoConnectionUrl({DATABASE_URL:'https://example.test'}),/PostgreSQL/);
});
test('transient initialization and pool failures are retried before data transactions', async () => {
  let attempts=0;let disconnects=0;const delays=[];
  const prisma={
    $connect:async()=>{attempts++;if(attempts===1)throw {errorCode:'P1001'};if(attempts===2)throw {code:'P2024'};},
    $disconnect:async()=>{disconnects++;},
  };
  await connectWithRetry(prisma,{wait:async ms=>delays.push(ms),log:()=>{}});
  assert.equal(attempts,3);assert.equal(disconnects,2);assert.deepEqual(delays,[2000,4000]);
});
test('authentication failures are not retried', async () => {
  let attempts=0;const error={errorCode:'P1000'};
  await assert.rejects(connectWithRetry({$connect:async()=>{attempts++;throw error;}},{log:()=>{}}),e=>e===error);
  assert.equal(attempts,1);
});
test('connection retries are bounded and return the final error', async () => {
  let attempts=0;const error={code:'P1002'};
  await assert.rejects(connectWithRetry({$connect:async()=>{attempts++;throw error;},$disconnect:async()=>{}},{wait:async()=>{},log:()=>{}}),e=>e===error);
  assert.equal(attempts,3);
});
