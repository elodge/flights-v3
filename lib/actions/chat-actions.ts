/**
 * @fileoverview Chat message server actions
 * 
 * @description Server-side actions for sending chat messages with notification events
 * @access Both client and employee users
 * @security Uses RLS for message access control
 * @database Inserts into chat_messages and notification_events
 * @business_rule Notifications created when clients send messages to employees
 */

'use server';

import { createServerClient } from '@/lib/supabase-server';
import { getServerUser } from '@/lib/auth';
import { pushNotification } from '@/lib/notifications/push';

export interface SendChatMessageParams {
  legId: string;
  message: string;
}

export interface SendChatMessageResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send a chat message and create notification if from client
 * 
 * @description Sends a chat message and creates notification for employees when client sends
 * @param params - Message parameters including leg ID and message text
 * @returns Promise with result including message ID or error
 * @security Uses RLS to ensure user can only send messages to accessible legs
 * @database Inserts into chat_messages and notification_events
 * @business_rule Only client messages trigger notifications to employees
 * @example
 * ```typescript
 * const result = await sendChatMessage({
 *   legId: 'leg-123',
 *   message: 'Hello, I have a question about the flight'
 * });
 * ```
 */
export async function sendChatMessage(params: SendChatMessageParams): Promise<SendChatMessageResult> {
  try {
    const authUser = await getServerUser();
    
    if (!authUser?.user) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    const { legId, message } = params;
    
    if (!legId || !message?.trim()) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }

    const supabase = await createServerClient();
    
    // CONTEXT: Insert chat message
    const { data: chatMessage, error: chatError } = await supabase
      .from('chat_messages')
      .insert({
        leg_id: legId,
        user_id: authUser.user.id,
        message: message.trim(),
        body: message.trim(),
        sender_role: authUser.role || 'client',
        is_system_message: false
      })
      .select('id')
      .single();

    if (chatError) {
      console.error('Chat message error:', chatError);
      return {
        success: false,
        error: chatError.message || 'Failed to send message'
      };
    }

    // CONTEXT: Create notification if message is from client
    // BUSINESS_RULE: Only notify employees when clients send messages
    if (authUser.role === 'client') {
      try {
        // Get leg details for notification
        const { data: legData } = await supabase
          .from('legs')
          .select('project_id')
          .eq('id', legId)
          .single();

        if (legData) {
          // Get project details to find artist_id
          const { data: projectData } = await supabase
            .from('projects')
            .select('artist_id')
            .eq('id', legData.project_id)
            .single();

          if (projectData) {
            await pushNotification({
              type: 'chat_message',
              severity: 'info',
              artistId: projectData.artist_id,
              projectId: legData.project_id,
              legId: legId,
              title: 'New client message',
              body: `Client sent a message in leg chat`,
              actorUserId: authUser.user.id
            });
          }
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't fail the message if notification fails
      }
    }

    return {
      success: true,
      messageId: chatMessage.id
    };

  } catch (error: any) {
    console.error('Error in sendChatMessage:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}
