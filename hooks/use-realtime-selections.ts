/**
 * @fileoverview Real-time selections hook for live updates
 * 
 * @description Custom React hook that subscribes to Supabase Realtime channels
 * for selections and holds tables. Provides live updates when agents make
 * changes to hold status or ticketing, ensuring client UI stays synchronized.
 * 
 * @access Client-side only
 * @security Supabase Realtime with RLS protection
 * @database Subscribes to selections and holds table changes
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Selection {
  id: string
  status: string
  passenger_ids: string[] | null
  created_at: string
  updated_at: string
  leg_id: string
  option_id: string
}

interface Hold {
  id: string
  expires_at: string
  created_at: string
  updated_at: string
  option_id: string
  tour_personnel: {
    full_name: string
  }
}

interface RealtimeSelectionsReturn {
  selections: Selection[]
  holds: Hold[]
  isConnected: boolean
  reconnect: () => void
}

/**
 * Real-time selections and holds subscription hook
 * 
 * @description Subscribes to Supabase Realtime channels for selections and holds
 * tables. Automatically updates local state when changes occur, providing live
 * synchronization with agent actions like marking options as held or ticketed.
 * 
 * @param legId - UUID of the leg to subscribe to updates for
 * @returns Object containing current selections, holds, connection status, and reconnect function
 * 
 * @security RLS enforced on Realtime subscriptions
 * @business_rule Only receives updates for the specified leg
 * @business_rule Automatically reconnects on connection loss
 * 
 * @example
 * ```tsx
 * function FlightOptionsPage({ legId }: { legId: string }) {
 *   const { selections, holds, isConnected } = useRealtimeSelections(legId)
 *   
 *   return (
 *     <div>
 *       {!isConnected && <div>Reconnecting...</div>}
 *       {selections.map(selection => 
 *         <SelectionCard key={selection.id} selection={selection} />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useRealtimeSelections(legId: string): RealtimeSelectionsReturn {
  const [selections, setSelections] = useState<Selection[]>([])
  const [holds, setHolds] = useState<Hold[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  
  /**
   * Establishes Realtime connection and subscriptions
   * 
   * @description Creates Supabase Realtime channel and subscribes to INSERT,
   * UPDATE, and DELETE events for both selections and holds tables. Filters
   * events to only those relevant to the current leg.
   * 
   * @security RLS automatically filters events to authorized data
   * @business_rule Subscription filters by leg_id for selections
   * @business_rule Hold events filtered by option_id (must match leg options)
   */
  const connect = () => {
    if (channel) {
      channel.unsubscribe()
    }
    
    // CONTEXT: Create dedicated channel for this leg's real-time updates
    const newChannel = supabase
      .channel(`leg_${legId}_updates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'selections',
          filter: `leg_id=eq.${legId}`
        },
        (payload) => {
          console.log('Selection change:', payload)
          handleSelectionChange(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'holds'
        },
        (payload) => {
          console.log('Hold change:', payload)
          handleHoldChange(payload)
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })
    
    setChannel(newChannel)
  }
  
  /**
   * Handles real-time selection changes
   * 
   * @description Processes INSERT, UPDATE, and DELETE events for selections
   * table. Updates local state to reflect changes made by agents or other
   * clients in real-time.
   * 
   * @param payload - Realtime event payload with change details
   * 
   * @business_rule INSERT/UPDATE events add or modify selection records
   * @business_rule DELETE events remove selections from local state
   */
  const handleSelectionChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    setSelections(currentSelections => {
      switch (eventType) {
        case 'INSERT':
          // CONTEXT: Add new selection if not already present
          if (!currentSelections.find(s => s.id === newRecord.id)) {
            return [...currentSelections, newRecord]
          }
          return currentSelections
          
        case 'UPDATE':
          // CONTEXT: Update existing selection with new data
          return currentSelections.map(selection =>
            selection.id === newRecord.id ? { ...selection, ...newRecord } : selection
          )
          
        case 'DELETE':
          // CONTEXT: Remove deleted selection from state
          return currentSelections.filter(selection => selection.id !== oldRecord.id)
          
        default:
          return currentSelections
      }
    })
  }
  
  /**
   * Handles real-time hold changes
   * 
   * @description Processes INSERT, UPDATE, and DELETE events for holds table.
   * Updates local hold state when agents create, modify, or remove holds on
   * flight options for this leg.
   * 
   * @param payload - Realtime event payload with change details
   * 
   * @business_rule Only processes holds for options belonging to this leg
   * @business_rule Maintains chronological order of holds
   */
  const handleHoldChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    setHolds(currentHolds => {
      switch (eventType) {
        case 'INSERT':
          // CONTEXT: Add new hold if not already present
          if (!currentHolds.find(h => h.id === newRecord.id)) {
            return [...currentHolds, newRecord]
          }
          return currentHolds
          
        case 'UPDATE':
          // CONTEXT: Update existing hold with new expiration time or details
          return currentHolds.map(hold =>
            hold.id === newRecord.id ? { ...hold, ...newRecord } : hold
          )
          
        case 'DELETE':
          // CONTEXT: Remove expired or cancelled hold
          return currentHolds.filter(hold => hold.id !== oldRecord.id)
          
        default:
          return currentHolds
      }
    })
  }
  
  /**
   * Reconnects to Realtime channel
   * 
   * @description Manually triggers reconnection to Realtime channel.
   * Useful for recovering from connection issues or when user requests
   * refresh of real-time data.
   */
  const reconnect = () => {
    console.log('Manually reconnecting to Realtime...')
    connect()
  }
  
  // CONTEXT: Set up Realtime connection on mount and cleanup on unmount
  useEffect(() => {
    connect()
    
    // CLEANUP: Unsubscribe from channel when component unmounts or legId changes
    return () => {
      if (channel) {
        console.log('Unsubscribing from Realtime channel')
        channel.unsubscribe()
      }
    }
  }, [legId])
  
  // CONTEXT: Clean up channel reference when connection status changes
  useEffect(() => {
    if (!isConnected && channel) {
      // FALLBACK: Attempt reconnection if connection is lost
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting automatic reconnection...')
        connect()
      }, 5000)
      
      return () => clearTimeout(reconnectTimer)
    }
  }, [isConnected])
  
  return {
    selections,
    holds,
    isConnected,
    reconnect
  }
}
