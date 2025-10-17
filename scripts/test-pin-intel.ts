/**
 * Test script for pin-intel gateway
 * Run: npx ts-node scripts/test-pin-intel.ts
 */

import assert from "assert"

async function run() {
  const base = process.env.LOCAL_BASE ?? "http://localhost:3000"
  const lat = -33.9249
  const lng = 18.4241 // Cape Town CBD (example)
  
  const hdrs = {
    "Content-Type": "application/json",
    "x-idempotency-key": "test-key-1"
  }
  
  console.log(`🧪 Testing pin-intel endpoint at ${base}`)
  console.log(`📍 Coordinates: ${lat}, ${lng}`)
  
  const res = await fetch(`${base}/api/pinit/pin-intel`, {
    method: "POST",
    headers: hdrs as any,
    body: JSON.stringify({ lat, lng, precision: 5 })
  })
  
  assert.strictEqual(res.ok, true, `HTTP ${res.status}`)
  
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
  
  assert.ok(json.geocode?.formatted, 'Missing geocode.formatted')
  assert.ok(Array.isArray(json.places), 'places is not an array')
  
  console.log(`✅ Test passed!`)
  console.log(`📍 Location: ${json.geocode.formatted}`)
  console.log(`🏪 Found ${json.places.length} nearby places`)
  console.log(`⚡ Request took ${json.meta.duration_ms}ms`)
  console.log(`💾 Cache hits: geocode=${json.meta.cached.geocode}, places=${json.meta.cached.places}`)
}

run().catch((e) => {
  console.error('❌ Test failed:', e)
  process.exit(1)
})

