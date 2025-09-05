import { describe, it, expect } from 'vitest'
import { parseNavitasText } from '@/lib/actions/employee-actions'

describe.skip('parseNavitasText', () => {
  describe('Single Itinerary Parsing', () => {
    it('should parse basic single flight with fare and reference', async () => {
      const navitasText = `
UA 123 LAX→JFK 15MAR 0800/1630
Business Class
Fare: $450 per person
Reference: ABC123
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toEqual({
        name: 'UA 123 LAX→JFK 15MAR 0800/1630',
        description: 'UA 123 LAX→JFK 15MAR 0800/1630',
        total_cost: 45000, // $450 in cents
        currency: 'USD',
        components: [
          {
            description: 'UA 123 LAX→JFK 15MAR 0800/1630',
            component_order: 1,
          }
        ],
      })
    })

    it('should parse multi-segment single itinerary', async () => {
      const navitasText = `
American Airlines 2456
Los Angeles, CA (LAX) → New York, NY (JFK)
March 15, 2024 - 8:00 AM → 4:30 PM
DL 789 JFK→MIA 16MAR 1200/1500
Economy Plus
Total: $650.00 per person
PNR: XYZ789
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toEqual({
        name: 'American Airlines 2456',
        description: 'American Airlines 2456',
        total_cost: 65000, // $650 in cents
        currency: 'USD',
        components: [
          {
            description: 'American Airlines 2456',
            component_order: 1,
          }
        ],
      })
    })

    it('should handle missing fare information', async () => {
      const navitasText = `
UA 123 LAX→JFK 15MAR 0800/1630
Business Class
Reference: ABC123
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toEqual({
        name: 'UA 123 LAX→JFK 15MAR 0800/1630',
        description: 'UA 123 LAX→JFK 15MAR 0800/1630',
        total_cost: null,
        currency: 'USD',
        components: [
          {
            description: 'UA 123 LAX→JFK 15MAR 0800/1630',
            component_order: 1,
          }
        ],
      })
    })

    it('should truncate very long flight names', async () => {
      const navitasText = `
UA 123456789 This is a very long flight name that should be truncated to fifty characters exactly
Economy Class
Fare: $300 per person
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toBeTruthy()
      expect(result!.name).toHaveLength(50)
      expect(result!.name).toBeLessThanOrEqual(50)
      expect(result!.name).toBe('UA 123456789 This is a very long flight name th…')
    })
  })

  describe('Split Option Parsing', () => {
    it('should parse split option with multiple itineraries', async () => {
      const navitasText = `
Option A (8 passengers):
UA 456 LAX→JFK 20DEC 0900/1730
Business Class
Fare: $580 per person

Option B (4 passengers):  
DL 789 LAX→JFK 20DEC 1100/1945
First Class
Fare: $1200 per person

Total Group Fare: $850 per person average
PNR: SPLIT123
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toBeTruthy()
      expect(result!.name).toBe('Split Option')
      expect(result!.total_cost).toBe(85000) // $850 in cents
      expect(result!.components).toHaveLength(2)
      expect(result!.components[0].component_order).toBe(1)
      expect(result!.components[1].component_order).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should return null for empty input', async () => {
      const result = await parseNavitasText('')
      expect(result).toBeNull()
    })

    it('should return null for whitespace-only input', async () => {
      const result = await parseNavitasText('   \n\t   ')
      expect(result).toBeNull()
    })

    it('should handle text with no flight lines', async () => {
      const navitasText = `
Just some random text
No flight information here
Fare: $500 per person
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toBeTruthy()
      expect(result!.name).toBe('Flight Option')
      expect(result!.total_cost).toBe(50000)
    })

    it('should handle malformed fare amounts', async () => {
      const navitasText = `
UA 123 LAX→JFK 15MAR 0800/1630
Business Class
Fare: invalid amount
`
      
      const result = await parseNavitasText(navitasText)
      
      expect(result).toBeTruthy()
      expect(result!.total_cost).toBeNull()
    })
  })

  describe('Fare Extraction', () => {
    it('should extract various fare formats', async () => {
      const testCases = [
        { input: 'Fare: $450 per person', expected: 45000 },
        { input: 'Total: $1,200.50 per person', expected: 120050 },
        { input: 'Cost: 850.75', expected: 85075 },
        { input: 'Price: $999', expected: 99900 },
      ]

      for (const testCase of testCases) {
        const navitasText = `
UA 123 LAX→JFK 15MAR 0800/1630
Business Class
${testCase.input}
`
        const result = await parseNavitasText(navitasText)
        expect(result!.total_cost).toBe(testCase.expected)
      }
    })
  })
})
