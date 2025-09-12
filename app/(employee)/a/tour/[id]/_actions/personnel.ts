/**
 * @fileoverview Server actions for tour personnel management
 * 
 * @description Server actions for adding and updating tour personnel in the Employee Portal
 * @route /a/tour/[id] - Employee tour management
 * @access Employee only (agent/admin)
 * @security Enforces employee role authentication and RLS
 * @database tour_personnel table operations
 * @business_rule Personnel management restricted to employees with proper authorization
 */

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addPersonSchema, updatePersonSchema, PartyEnum, parsePhoneInput } from '@/lib/validation/personnel';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Require employee role for personnel operations
 * @description Validates that the user has agent or admin role
 * @param role - User role from database
 * @throws Error if user is not authorized
 * @security Prevents unauthorized access to personnel management
 */
function requireEmployeeRole(role?: string) {
  if (!role || (role !== 'agent' && role !== 'admin')) {
    throw new Error('Unauthorized: employee role required');
  }
}

/**
 * Add new personnel to a tour
 * @description Creates a new personnel record with validated data and automatically
 * assigns them to all existing legs in the tour for immediate availability
 * @param projectId - UUID of the tour/project
 * @param raw - Raw form data to be validated
 * @returns Object with created personnel ID
 * @throws Error for validation failures or database errors
 * @security Enforces employee role and validates input
 * @database Inserts into tour_personnel table and creates leg_passengers assignments
 * @business_rule Personnel must have valid name and party assignment
 * @business_rule Auto-assigns new personnel to all active legs with default group behavior
 */
export async function addTourPerson(projectId: string, raw: unknown) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    requireEmployeeRole(profile?.role);

    const input = addPersonSchema.parse(raw);
    
    // CONTEXT: Normalize name by collapsing multiple spaces
    const full_name = input.full_name.replace(/\s+/g, ' ').trim();

    // CONTEXT: Parse phone number into E.164 and component parts
    // BUSINESS_RULE: Store E.164 format as primary, keep legacy field for backward compatibility
    const phoneData = parsePhoneInput(input.phone);
    
    const { data, error } = await supabase
      .from('tour_personnel')
      .insert([{
        project_id: projectId,
        full_name,
        party: input.party,
        email: input.email ?? null,
        // Legacy phone field for backward compatibility
        phone: input.phone ?? null,
        // New E.164 phone fields
        phone_e164: phoneData?.e164 ?? null,
        phone_country: phoneData?.country ?? null,
        phone_national_number: phoneData?.nationalNumber ?? null,
        phone_extension: phoneData?.extension ?? null,
        seat_pref: input.seat_pref ?? null,
        ff_numbers: input.ff_numbers ?? null,
        notes: input.notes ?? null,
        created_by: user.id,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Error adding tour person:', error);
      throw new Error(error.message);
    }

    // BUSINESS_RULE: Auto-assign new personnel to all existing legs in the tour
    // This matches user expectation that adding a passenger makes them available for all legs
    const { data: legs } = await supabase
      .from('legs')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (legs && legs.length > 0) {
      const legAssignments = legs.map(leg => ({
        leg_id: leg.id,
        passenger_id: data.id,
        treat_as_individual: false, // Default to group behavior
        created_by: user.id
      }));

      const { error: assignmentError } = await supabase
        .from('leg_passengers')
        .insert(legAssignments);

      if (assignmentError) {
        console.warn('Failed to auto-assign passenger to legs:', assignmentError);
        // Don't fail the whole operation - passenger was created successfully
      }
    }

    // CONTEXT: Revalidate the tour page to show new personnel
    revalidatePath(`/a/tour/${projectId}`);
    
    return { id: data.id as string };
  } catch (error) {
    console.error('Error in addTourPerson:', error);
    
    if (error instanceof z.ZodError) {
      // CONTEXT: Access ZodError issues directly since errors property may not be serializable
      const issues = error.issues || []
      const firstIssue = issues[0]
      return { 
        success: false, 
        error: firstIssue?.message || 'Validation failed' 
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

/**
 * Update existing personnel information
 * @description Updates personnel record with validated partial data
 * @param personId - UUID of the personnel record
 * @param raw - Raw form data to be validated
 * @returns Success confirmation
 * @throws Error for validation failures or database errors
 * @security Enforces employee role and validates input
 * @database Updates tour_personnel table
 * @business_rule Allows partial updates of personnel information
 */
export async function updateTourPerson(personId: string, raw: unknown) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    requireEmployeeRole(profile?.role);

    const input = updatePersonSchema.parse(raw);
    
    // CONTEXT: Build update payload with only provided fields
    const payload: any = { updated_at: new Date().toISOString() };
    
    if (input.full_name !== undefined) {
      payload.full_name = input.full_name.replace(/\s+/g, ' ').trim();
    }
    if (input.party !== undefined) payload.party = input.party;
    if (input.email !== undefined) payload.email = input.email ?? null;
    
    // CONTEXT: Handle phone number update with E.164 parsing
    if (input.phone !== undefined) {
      const phoneData = parsePhoneInput(input.phone);
      
      // Update legacy phone field for backward compatibility
      payload.phone = input.phone ?? null;
      
      // Update new E.164 phone fields
      payload.phone_e164 = phoneData?.e164 ?? null;
      payload.phone_country = phoneData?.country ?? null;
      payload.phone_national_number = phoneData?.nationalNumber ?? null;
      payload.phone_extension = phoneData?.extension ?? null;
    }
    
    if (input.seat_pref !== undefined) payload.seat_pref = input.seat_pref ?? null;
    if (input.ff_numbers !== undefined) payload.ff_numbers = input.ff_numbers ?? null;
    if (input.notes !== undefined) payload.notes = input.notes ?? null;
    if (input.status !== undefined) payload.status = input.status;

    const { error } = await supabase
      .from('tour_personnel')
      .update(payload)
      .eq('id', personId);

    if (error) {
      console.error('Error updating tour person:', error);
      throw new Error(error.message);
    }

    // CONTEXT: Revalidate the tour page to show updated personnel
    // Extract project_id from the personnel record for revalidation
    const { data: personnel } = await supabase
      .from('tour_personnel')
      .select('project_id')
      .eq('id', personId)
      .single();
    
    if (personnel?.project_id) {
      revalidatePath(`/a/tour/${personnel.project_id}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateTourPerson:', error);
    
    if (error instanceof z.ZodError) {
      // CONTEXT: Access ZodError issues directly since errors property may not be serializable
      const issues = error.issues || []
      const firstIssue = issues[0]
      return { 
        success: false, 
        error: firstIssue?.message || 'Validation failed' 
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}
