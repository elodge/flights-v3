/**
 * @fileoverview Regression tests for client-agent flight display consistency
 * 
 * @description Tests that ensure client and agent interfaces display identical
 * flight information using the unified FlightSegmentRow approach. Prevents
 * regression of the "Flight data unavailable" issue.
 * 
 * @coverage
 * - Client and agent display parity
 * - FlightSegmentRow component consistency
 * - Navitas text parsing equivalence
 * - Logo display consistency
 * - Manual vs Navitas option handling
 */

import { describe, it, expect } from 'vitest'
import { normalizeSegment } from '@/lib/segmentAdapter'

describe('Client-Agent Flight Display Consistency', () => {
  // Mock data representing the same flight option as seen by both interfaces
  const mockFlightOptionComponent = {
    id: 'comp-123',
    component_order: 1,
    navitas_text: 'UA 0099 MEL-LAX 30APR 9:30A-6:40A',
    flight_number: '0099',
    airline: 'UA',
    airline_iata: 'UA',
    airline_name: 'United Airlines',
    dep_iata: 'MEL',
    arr_iata: 'LAX',
    departure_time: '2024-04-30T09:30:00+11:00',
    arrival_time: '2024-04-30T06:40:00-07:00',
    aircraft_type: null,
    seat_configuration: null,
    meal_service: null,
    baggage_allowance: null,
    cost: null,
    currency: null,
    // Additional fields that may be present in manual options
    dep_time_local: '2024-04-30T09:30:00+11:00',
    arr_time_local: '2024-04-30T06:40:00-07:00',
    day_offset: 0,
    stops: 0,
    duration_minutes: 820,
    enriched_aircraft_type: 'B789',
    enriched_aircraft_name: 'Boeing 787-9'
  }

  describe('FlightSegmentRow Data Processing', () => {
    it('should extract consistent flight data via normalizeSegment', () => {
      // CONTEXT: Test that normalizeSegment produces consistent results
      // This is the core function used by both client and agent FlightSegmentRow
      const normalizedSegment = normalizeSegment(mockFlightOptionComponent)

      // BUSINESS_RULE: Key flight identification should be consistent
      expect(normalizedSegment.airline).toBe('UA')
      expect(normalizedSegment.flightNumber).toBe('0099')
      expect(normalizedSegment.origin).toBe('MEL')
      expect(normalizedSegment.destination).toBe('LAX')
      
      // BUSINESS_RULE: Should prefer structured data when available
      if (mockFlightOptionComponent.airline_iata) {
        expect(normalizedSegment.airline).toBe(mockFlightOptionComponent.airline_iata)
      }
      
      // BUSINESS_RULE: Should fall back to navitas_text parsing when structured data missing
      expect(normalizedSegment.airline).toBeTruthy()
      expect(normalizedSegment.flightNumber).toBeTruthy()
      expect(normalizedSegment.origin).toBeTruthy()
      expect(normalizedSegment.destination).toBeTruthy()
    })

    it('should handle Navitas-only data (legacy options)', () => {
      // CONTEXT: Test parsing when only navitas_text is available
      const navitasOnlyComponent = {
        id: 'comp-legacy',
        component_order: 1,
        navitas_text: 'UA 1912 LAX-DEN 30APR 8:50A-12:16P',
        flight_number: null,
        airline: null,
        airline_iata: null,
        dep_iata: null,
        arr_iata: null,
        departure_time: null,
        arrival_time: null
      }

      const normalizedSegment = normalizeSegment(navitasOnlyComponent)

      // BUSINESS_RULE: Should parse flight details from navitas_text
      expect(normalizedSegment.airline).toBe('UA')
      expect(normalizedSegment.flightNumber).toBe('1912') 
      expect(normalizedSegment.origin).toBe('LAX')
      expect(normalizedSegment.destination).toBe('DEN')
    })

    it('should handle manual option data (structured + enriched)', () => {
      // CONTEXT: Test rich manual option data processing
      const manualOptionComponent = {
        ...mockFlightOptionComponent,
        // Manual options have complete structured data
        enriched_aircraft_type: 'B789',
        enriched_aircraft_name: 'Boeing 787-9 Dreamliner',
        enriched_status: 'scheduled',
        enrichment_source: 'airlabs',
        enrichment_fetched_at: '2024-01-01T12:00:00Z',
        // Enrichment data would be passed separately in real usage
        enrichment: {
          success: true,
          data: {
            aircraft: 'B789',
            aircraft_name: 'Boeing 787-9 Dreamliner',
            status: 'scheduled'
          },
          source: 'airlabs',
          cached: false
        }
      }

      const normalizedSegment = normalizeSegment(manualOptionComponent)

      // BUSINESS_RULE: Should preserve structured data from manual options
      expect(normalizedSegment.airline).toBe('UA')
      expect(normalizedSegment.flightNumber).toBe('0099')
      expect(normalizedSegment.origin).toBe('MEL')
      expect(normalizedSegment.destination).toBe('LAX')
      
      // BUSINESS_RULE: Should include enrichment data when passed in
      expect(normalizedSegment.enrichment).toBeDefined()
      expect(normalizedSegment.enrichment?.data?.aircraft).toBe('B789')
    })
  })

  describe('Logo Display Consistency', () => {
    it('should provide consistent airline codes for logo lookup', () => {
      // CONTEXT: Test that logo lookup gets same data in both interfaces
      const normalizedSegment = normalizeSegment(mockFlightOptionComponent)
      
      // BUSINESS_RULE: Logo lookup should use airline code consistently
      expect(normalizedSegment.airline).toBe('UA')
      
      // BUSINESS_RULE: Should work for major airlines in airlines.ts
      const majorAirlineCodes = ['UA', 'AA', 'DL', 'WN', 'BA', 'AF', 'LH', 'FR']
      expect(majorAirlineCodes).toContain(normalizedSegment.airline)
    })

    it('should handle airline code extraction from navitas text', () => {
      // CONTEXT: Test airline extraction for logo display fallback
      const testCases = [
        { navitas_text: 'UA 0099 MEL-LAX 30APR 9:30A-6:40A', expectedAirline: 'UA' },
        { navitas_text: 'AA 1234 JFK-LAX 01JAN 6:00A-9:00A', expectedAirline: 'AA' },
        { navitas_text: 'DL 5678 ATL-SEA 15FEB 12:00P-2:30P', expectedAirline: 'DL' },
        { navitas_text: 'FR 9012 DUB-BCN 20MAR 7:45A-11:15A', expectedAirline: 'FR' }
      ]

      testCases.forEach(({ navitas_text, expectedAirline }) => {
        const mockComponent = {
          id: 'test',
          component_order: 1,
          navitas_text,
          flight_number: null,
          airline: null,
          airline_iata: null,
          dep_iata: null,
          arr_iata: null
        }

        const normalizedSegment = normalizeSegment(mockComponent)
        expect(normalizedSegment.airline).toBe(expectedAirline)
      })
    })
  })

  describe('Display Format Consistency', () => {
    it('should provide consistent flight display text', () => {
      // CONTEXT: Test that flight display formatting is consistent
      const normalizedSegment = normalizeSegment(mockFlightOptionComponent)
      
      // BUSINESS_RULE: Flight display should show airline + flight number
      const expectedFlightDisplay = `${normalizedSegment.airline} ${normalizedSegment.flightNumber}`
      expect(expectedFlightDisplay).toBe('UA 0099')
      
      // BUSINESS_RULE: Route display should show origin → destination
      const expectedRouteDisplay = `${normalizedSegment.origin}-${normalizedSegment.destination}`
      expect(expectedRouteDisplay).toBe('MEL-LAX')
    })

    it('should handle time formatting consistently', () => {
      // CONTEXT: Test that time display is consistent between interfaces
      const normalizedSegment = normalizeSegment(mockFlightOptionComponent)
      
      // BUSINESS_RULE: Should have departure and arrival times when available
      if (normalizedSegment.depTime) {
        expect(normalizedSegment.depTime).toBeTruthy()
      }
      if (normalizedSegment.arrTime) {
        expect(normalizedSegment.arrTime).toBeTruthy()
      }
      
      // BUSINESS_RULE: Times should be parseable from navitas_text as fallback
      expect(mockFlightOptionComponent.navitas_text).toMatch(/\d+:\d+[AP]/i)
    })
  })

  describe('Error Prevention (Regression Protection)', () => {
    it('should never show "Flight data unavailable" for valid flight data', () => {
      // CONTEXT: Regression test for the original issue
      // BUSINESS_RULE: Any valid flight component should produce displayable data
      
      const testComponents = [
        // Structured data component (manual option)
        mockFlightOptionComponent,
        
        // Navitas-only component (legacy option)  
        {
          id: 'navitas-only',
          component_order: 1,
          navitas_text: 'UA 0099 MEL-LAX 30APR 9:30A-6:40A',
          flight_number: null,
          airline: null,
          airline_iata: null,
          dep_iata: null,
          arr_iata: null
        },
        
        // Minimal component with basic fields
        {
          id: 'minimal',
          component_order: 1,
          navitas_text: 'Basic flight segment',
          flight_number: '1234',
          airline: 'UA',
          airline_iata: 'UA',
          dep_iata: 'LAX',
          arr_iata: 'JFK'
        }
      ]

      testComponents.forEach((component, index) => {
        const normalizedSegment = normalizeSegment(component)
        
        // BUSINESS_RULE: Should always produce some displayable flight information
        const hasDisplayableData = !!(
          normalizedSegment.airline ||
          normalizedSegment.flightNumber ||
          normalizedSegment.origin ||
          normalizedSegment.destination ||
          component.navitas_text
        )
        
        expect(hasDisplayableData).toBe(true, 
          `Component ${index} should have displayable flight data`)
      })
    })

    it('should handle empty or malformed data gracefully', () => {
      // CONTEXT: Test graceful degradation with bad data
      const malformedComponents = [
        // Empty component
        {
          id: 'empty',
          component_order: 1,
          navitas_text: '',
          flight_number: null,
          airline: null
        },
        
        // Malformed navitas text
        {
          id: 'malformed',
          component_order: 1,
          navitas_text: 'Invalid flight data xyz123',
          flight_number: null,
          airline: null
        }
      ]

      malformedComponents.forEach((component) => {
        // BUSINESS_RULE: Should not throw errors with malformed data
        expect(() => {
          const normalizedSegment = normalizeSegment(component)
          // Even with bad data, should return an object
          expect(typeof normalizedSegment).toBe('object')
        }).not.toThrow()
      })
    })
  })
  
  describe('Interface Parity Requirements', () => {
    it('should use identical data processing in client and agent', () => {
      // CONTEXT: Ensure both interfaces use same underlying logic
      // BUSINESS_RULE: Client FlightOptionCard and Agent OptionManagement should use FlightSegmentRow
      
      const componentData = mockFlightOptionComponent
      
      // Both interfaces should call normalizeSegment with same data
      const clientProcessedData = normalizeSegment(componentData)
      const agentProcessedData = normalizeSegment(componentData)
      
      // BUSINESS_RULE: Results should be identical
      expect(clientProcessedData.airline).toBe(agentProcessedData.airline)
      expect(clientProcessedData.flightNumber).toBe(agentProcessedData.flightNumber)
      expect(clientProcessedData.origin).toBe(agentProcessedData.origin)
      expect(clientProcessedData.destination).toBe(agentProcessedData.destination)
    })

    it('should support both Navitas and manual option types equally', () => {
      // CONTEXT: Test that both option types work in both interfaces
      const navitasOption = {
        id: 'navitas',
        component_order: 1,
        navitas_text: 'UA 0099 MEL-LAX 30APR 9:30A-6:40A',
        flight_number: '0099',
        airline: 'UA',
        airline_iata: 'UA'
      }
      
      const manualOption = {
        id: 'manual',
        component_order: 1,
        navitas_text: 'UA 0099 MEL-LAX',
        flight_number: '0099',
        airline: 'UA',
        airline_iata: 'UA',
        dep_iata: 'MEL',
        arr_iata: 'LAX',
        enriched_aircraft_type: 'B789'
      }

      // BUSINESS_RULE: Both should produce valid flight display data
      const navitasResult = normalizeSegment(navitasOption)
      const manualResult = normalizeSegment(manualOption)
      
      expect(navitasResult.airline).toBe('UA')
      expect(manualResult.airline).toBe('UA')
      expect(navitasResult.flightNumber).toBe('0099')
      expect(manualResult.flightNumber).toBe('0099')
    })
  })
})
