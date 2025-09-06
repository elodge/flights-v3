/**
 * @fileoverview Server action for deleting tour personnel
 * 
 * @description Handles safe deletion of personnel from tours with role enforcement
 * @access agent, admin
 * @security Requires agent or admin role, validates user authentication
 * @database tour_personnel table deletion
 */

'use server';

import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// CONTEXT: Schema validation for person ID
const DeletePersonSchema = z.object({
  personId: z.string().uuid('Invalid person ID format')
});

/**
 * Deletes a person from tour personnel with proper authorization
 * 
 * @description Removes a person from tour_personnel table after validating user permissions
 * @param personId - UUID of the person to delete
 * @returns Promise<{ success: boolean }>
 * @security Requires agent or admin role
 * @database Deletes from tour_personnel table
 * @throws Error if unauthorized or database operation fails
 * @example
 * ```typescript
 * const result = await deleteTourPerson('550e8400-e29b-41d4-a716-446655440000');
 * // Returns: { success: true }
 * ```
 */
export async function deleteTourPerson(personId: string) {
  // CONTEXT: Validate input parameters
  const { personId: validatedPersonId } = DeletePersonSchema.parse({ personId });

  // SECURITY: Create authenticated Supabase client
  const supabase = await createServerClient();
  
  // SECURITY: Verify user authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // SECURITY: Check user role permissions
  const { data: me, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (userError) {
    throw new Error(`Failed to verify user permissions: ${userError.message}`);
  }

  if (!me || (me.role !== 'agent' && me.role !== 'admin')) {
    throw new Error('Unauthorized: Insufficient permissions. Agent or admin role required.');
  }

  // DATABASE: Delete the person from tour_personnel
  const { error: deleteError } = await supabase
    .from('tour_personnel')
    .delete()
    .eq('id', validatedPersonId);

  if (deleteError) {
    throw new Error(`Failed to delete person: ${deleteError.message}`);
  }

  return { success: true };
}
