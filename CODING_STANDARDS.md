# Coding Standards & Documentation Guidelines

## 📝 Documentation Philosophy

**Goal**: Every piece of code should be self-documenting and LLM-friendly. Future AI assistants should understand the codebase without extensive context.

## 🎯 JSDoc Standards

### **Server Actions**

```typescript
/**
 * Assigns passengers to a specific flight leg
 * 
 * @description Removes existing assignments and creates new ones. Used for bulk
 * passenger assignment in the employee portal leg management.
 * 
 * @param formData - Form data containing leg_id and passenger_ids
 * @returns Promise<{success: true} | {error: string}>
 * 
 * @throws {Error} Database validation errors
 * @security Requires authenticated employee (agent/admin)
 * @database Writes to leg_passengers table
 * 
 * @example
 * ```typescript
 * const result = await assignPassengersToLeg(new FormData())
 * if ('error' in result) {
 *   toast.error(result.error)
 * }
 * ```
 */
export async function assignPassengersToLeg(formData: FormData) {
  // Implementation
}
```

### **React Components**

```typescript
/**
 * Employee dashboard showing all tours grouped by artist with statistics
 * 
 * @description Displays tours/events for agents and admins with counts for legs,
 * pending selections, and expiring holds. Includes navigation to individual tours.
 * 
 * @access Employee only (agent, admin roles)
 * @route /a
 * 
 * @example
 * ```tsx
 * // Rendered automatically for authenticated employees
 * <EmployeeDashboard />
 * ```
 */
export default async function EmployeeDashboard() {
  // Component implementation
}
```

### **Business Logic Comments**

```typescript
// BUSINESS_RULE: Passengers must be assigned before creating options
// This ensures we don't create orphaned flight options in the database
if (assignedPassengers.length === 0) {
  throw new Error('Cannot create options without assigned passengers')
}

// ALGORITHM: Multi-step passenger assignment process
// 1. Remove existing assignments for these passengers
// 2. Validate passenger eligibility for this leg
// 3. Create new assignments with party grouping
// 4. Update leg statistics and revalidate cache
```

### **Decision Documentation**

```typescript
/**
 * DECISION: Using passenger_id instead of tour_personnel_id
 * 
 * RATIONALE: Aligns with Supabase generated types and reduces confusion
 * MIGRATION: Updated in migration 20241217180000
 */
```

## 🎯 Key Principles

1. **Every exported function** should have JSDoc with description, params, returns
2. **Every React component** should document purpose, props, and access level
3. **Complex business logic** should have algorithm comments
4. **Architecture decisions** should be documented with context

## 🤖 LLM-Friendly Patterns

### **Context Markers**
```typescript
// CONTEXT: Core flight booking workflow for employee portal
// SECURITY: Requires authenticated employee (agent/admin) 
// DATABASE: Writes to leg_passengers, options, option_components
// BUSINESS_RULE: Party assignments override individual preferences
```

### **File Headers**
```typescript
/**
 * @fileoverview Employee leg management - core booking workflow
 * 
 * @description Handles passenger assignment, flight option creation,
 * and hold management for tour operators and agents.
 * 
 * @route /a/tour/[id]/leg/[legId]
 * @access Employee only
 * @database leg_passengers, options, option_components, holds
 */
```

---

**Remember**: Good documentation is an investment in future productivity. Every comment saves time for the next developer (human or AI) working with the code.
