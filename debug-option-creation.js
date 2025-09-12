/**
 * Debug script to test option creation flow
 * Run with: node debug-option-creation.js
 */

const { createOptionsForPassengers } = require('./lib/actions/compact-leg-actions');

async function testOptionCreation() {
  console.log('🧪 Testing option creation flow...');
  
  // Test data similar to what the modal would send
  const testRequest = {
    legId: '77777777-7777-7777-7777-777777777777', // Known leg ID
    passengerIds: ['11111111-1111-1111-1111-111111111111'], // Taylor Swift
    options: [{
      passenger: 'Taylor Swift',
      totalFare: 450.00,
      currency: 'USD',
      reference: null,
      segments: [{
        airline: 'AA',
        flightNumber: '1234',
        dateRaw: '01MAR',
        origin: 'BNA',
        destination: 'MIA',
        depTimeRaw: '10:30A',
        arrTimeRaw: '1:45P',
        dayOffset: 0
      }],
      source: 'navitas',
      raw: 'AA 1234 BNA-MIA 01MAR 10:30A-1:45P',
      errors: []
    }]
  };

  console.log('📝 Test request:', JSON.stringify(testRequest, null, 2));

  try {
    const result = await createOptionsForPassengers(testRequest);
    console.log('✅ Result:', result);
    
    if (result.success) {
      console.log('🎉 Option creation succeeded!');
    } else {
      console.log('❌ Option creation failed:', result.error);
    }
  } catch (error) {
    console.log('💥 Test threw an error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testOptionCreation();

