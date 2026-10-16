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
