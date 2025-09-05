/**
 * @fileoverview Realtime leg chat component for client and employee communication
 * 
 * @description Shared chat interface supporting realtime messaging between clients
 * and employees for a specific leg. Features optimistic send, infinite scroll,
 * typing indicators, and unread tracking.
 * 
 * @access Both client and employee portals
 * @security RLS enforced - users can only access chats for legs they have access to
 * @database Reads/writes chat_messages and chat_reads tables
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/use-auth'
import { Database } from '@/lib/database.types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'] & {
  users?: {
    full_name: string | null
    role: string | null
  }
}

interface OptimisticMessage {
  id: string
  leg_id: string
  user_id: string
  message: string
  sender_role: string
  created_at: string
  optimistic?: boolean
  error?: boolean
}

interface LegChatProps {
  legId: string
}

interface TypingUser {
  userId: string
  fullName: string
  timestamp: number
}

/**
 * Realtime leg chat component
 * 
 * @description Interactive chat interface with realtime messaging, optimistic sends,
 * infinite scroll, typing indicators, and read status tracking. Supports both
 * client and employee users with role-based message display.
 * 
 * @param legId - UUID of the leg to show chat for
 * @returns JSX.Element - Chat interface with message list and composer
 * 
 * @security Uses RLS-protected queries for message access
 * @database Queries chat_messages and updates chat_reads for read tracking
 * @business_rule Users can only access chats for legs they have permission to view
 * @business_rule Messages are immutable once sent (no edit/delete in MVP)
 * 
 * @example
 * ```tsx
 * <LegChat legId="leg-uuid" />
 * ```
 */
export function LegChat({ legId }: LegChatProps) {
  const { user, role, loading } = useUser()
  const [messages, setMessages] = useState<OptimisticMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingRef = useRef<number>(0)

  // CONTEXT: Generate optimistic message ID for immediate UI feedback
  const generateOptimisticId = () => `optimistic_${Date.now()}_${Math.random()}`

  /**
   * Loads initial chat messages for the leg
   * 
   * @description Fetches the latest 50 messages with user information.
   * Sets up the initial message state and marks chat as read.
   * 
   * @security RLS ensures user can only load messages for accessible legs
   * @database Queries chat_messages with user join for display names
   */
  const loadMessages = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      // CONTEXT: Load latest messages with user information for display
      // BUSINESS_RULE: Show latest 50 messages, reverse chronological order
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          leg_id,
          user_id,
          message,
          body,
          sender_role,
          created_at,
          users:user_id (
            full_name,
            role
          )
        `)
        .eq('leg_id', legId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading messages:', error)
        toast.error('Failed to load chat messages')
        return
      }

      // CONTEXT: Convert to optimistic message format and reverse for chronological order
      const formattedMessages = (data || []).reverse().map(msg => ({
        id: msg.id,
        leg_id: msg.leg_id,
        user_id: msg.user_id,
        message: msg.message || msg.body, // Use message field primarily, fallback to body
        sender_role: msg.sender_role || getUserRole(msg.users?.role),
        created_at: msg.created_at,
        optimistic: false
      }))

      setMessages(formattedMessages)
      setHasMore(data?.length === 50)

      // CONTEXT: Mark chat as read when messages load
      await markAsRead()
      
    } catch (error) {
      console.error('Error in loadMessages:', error)
      toast.error('Failed to load chat messages')
    } finally {
      setIsLoading(false)
    }
  }, [legId, user])

  /**
   * Loads older messages for infinite scroll
   * 
   * @description Fetches messages older than the current oldest message.
   * Used when user scrolls to top of chat.
   * 
   * @security RLS protection applied to historical message access
   */
  const loadOlderMessages = useCallback(async () => {
    if (!user || !hasMore || isLoadingMore || messages.length === 0) return

    const oldestMessage = messages[0]
    if (!oldestMessage) return

    try {
      setIsLoadingMore(true)

      // CONTEXT: Load messages older than the current oldest
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          users:user_id (
            full_name,
            role
          )
        `)
        .eq('leg_id', legId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading older messages:', error)
        return
      }

      const formattedMessages = (data || []).reverse().map(msg => ({
        id: msg.id,
        leg_id: msg.leg_id,
        user_id: msg.user_id,
        message: msg.message,
        sender_role: msg.sender_role || getUserRole(msg.users?.role),
        created_at: msg.created_at,
        optimistic: false
      }))

      setMessages(prev => [...formattedMessages, ...prev])
      setHasMore(data?.length === 50)

    } catch (error) {
      console.error('Error loading older messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [legId, user, hasMore, isLoadingMore, messages])

  /**
   * Marks the chat as read for the current user
   * 
   * @description Updates the chat_reads table with the current timestamp.
   * Used when chat opens and when new messages are viewed.
   * 
   * @database Upserts chat_reads record for user/leg combination
   */
  const markAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('chat_reads')
        .upsert({
          user_id: user.id,
          leg_id: legId,
          last_read_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error marking as read:', error)
      }
    } catch (error) {
      console.error('Error in markAsRead:', error)
    }
  }, [legId, user])

  /**
   * Sends a chat message with optimistic updates
   * 
   * @description Immediately adds message to UI, then sends to server.
   * On success, replaces optimistic message with server response.
   * On error, marks message as failed and shows error toast.
   * 
   * @param text - Message text to send
   * 
   * @security Uses RLS-protected insert on chat_messages
   * @business_rule Messages are permanent once sent (no edit/delete)
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!user || !text.trim()) return

    const optimisticId = generateOptimisticId()
    const optimisticMessage: OptimisticMessage = {
      id: optimisticId,
      leg_id: legId,
      user_id: user.id,
      message: text.trim(),
      sender_role: role, // Use role from useUser hook
      created_at: new Date().toISOString(),
      optimistic: true
    }

    try {
      setIsSending(true)
      
      // CONTEXT: Optimistic update - show message immediately
      setMessages(prev => [...prev, optimisticMessage])
      setMessageText('')
      
      // Scroll to bottom after optimistic update
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)

      // CONTEXT: Send message to server
      const insertData = {
        leg_id: legId,
        user_id: user.id,
        message: text.trim(), // Required field
        body: text.trim(),    // Also set body for consistency
        sender_role: role, // Use role from useUser hook, not user.role
        is_system_message: false // Explicit false for user messages
      }
      
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(insertData)
        .select(`
          id,
          leg_id,
          user_id,
          body,
          sender_role,
          created_at,
          users:user_id (
            full_name,
            role
          )
        `)
        .single()

      if (error) {
        throw error
      }

      // CONTEXT: Replace optimistic message with server response
      setMessages(prev => {
        // Check if we already have a message with the server ID
        const hasServerMessage = prev.some(m => m.id === data.id)
        if (hasServerMessage) {
          // If we already have the server message, just remove the optimistic one
          return prev.filter(msg => msg.id !== optimisticId)
        }
        
        // Otherwise, replace the optimistic message with the server response
        return prev.map(msg => 
          msg.id === optimisticId 
            ? {
                id: data.id,
                leg_id: data.leg_id,
                user_id: data.user_id,
                message: data.message || data.body, // Use message field primarily
                sender_role: data.sender_role || getUserRole(data.users?.role),
                created_at: data.created_at,
                optimistic: false
              }
            : msg
        )
      })

    } catch (error) {
      console.error('Error sending message:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      
      // CONTEXT: Mark optimistic message as failed
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticId 
          ? { ...msg, error: true }
          : msg
      ))
      
      toast.error(`Failed to send message: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsSending(false)
    }
  }, [legId, user, role])

  /**
   * Handles message text change and sends typing indicators
   * 
   * @description Updates message state and broadcasts typing status.
   * Throttles typing broadcasts to avoid spam.
   * 
   * @param value - New message text value
   */
  const handleMessageChange = useCallback((value: string) => {
    setMessageText(value)
    
    // CONTEXT: Send typing indicator (throttled)
    const now = Date.now()
    if (user && channelRef.current && now - lastTypingRef.current > 1000) {
      lastTypingRef.current = now
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          fullName: user.full_name || user.email,
          timestamp: now
        }
      })
    }
  }, [user])

  /**
   * Handles keyboard shortcuts in message composer
   * 
   * @description Enter sends message, Shift+Enter adds newline.
   * 
   * @param e - Keyboard event
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (messageText.trim() && !isSending) {
        sendMessage(messageText)
      }
    }
  }, [messageText, isSending, sendMessage])

  /**
   * Maps database user role to display role
   * 
   * @description Converts user.role to sender_role format.
   * 
   * @param dbRole - Role from users table
   * @returns Standardized role string
   */
  const getUserRole = (dbRole: string | null | undefined): string => {
    switch (dbRole) {
      case 'client': return 'client'
      case 'agent': 
      case 'admin': return 'agent'
      default: return 'client'
    }
  }

  /**
   * Formats message timestamp for display
   * 
   * @description Shows relative time with absolute time in tooltip.
   * 
   * @param timestamp - ISO timestamp string
   * @returns Formatted time string
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  /**
   * Handles scroll events for infinite loading
   * 
   * @description Triggers loadOlderMessages when user scrolls near top.
   */
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget
    
    // CONTEXT: Load more when scrolled near top
    if (scrollTop < 100 && hasMore && !isLoadingMore) {
      loadOlderMessages()
    }
  }, [hasMore, isLoadingMore, loadOlderMessages])

  // CONTEXT: Set up realtime subscriptions and load initial data
  useEffect(() => {
    if (!user) return

    loadMessages()

    // CONTEXT: Subscribe to new messages for this leg
    const channel = supabase
      .channel(`chat_leg_${legId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `leg_id=eq.${legId}`
        },
        (payload) => {
          const newMessage = payload.new as any // Use any due to schema mismatch
          
          // CONTEXT: Don't add if this is our own optimistic message
          const isOwnMessage = newMessage.user_id === user.id
          const messageText = newMessage.message || newMessage.body
          
          // CONTEXT: Check if we already have this exact message (by ID or optimistic match)
          const hasExistingMessage = messages.some(m => 
            m.id === newMessage.id || 
            (m.user_id === newMessage.user_id && 
             m.message === messageText &&
             m.optimistic &&
             Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000)
          )
          
          if (!hasExistingMessage) {
            const formattedMessage: OptimisticMessage = {
              id: newMessage.id,
              leg_id: newMessage.leg_id,
              user_id: newMessage.user_id,
              message: newMessage.message || newMessage.body, // Use message field primarily
              sender_role: newMessage.sender_role || 'client',
              created_at: newMessage.created_at,
              optimistic: false
            }
            
            // CONTEXT: Use functional update to ensure we're working with latest state
            setMessages(prev => {
              // Double-check for duplicates in the current state
              const alreadyExists = prev.some(m => m.id === newMessage.id)
              if (alreadyExists) {
                return prev // Don't add if already exists
              }
              return [...prev, formattedMessage]
            })
            
            // CONTEXT: Auto-scroll if user is near bottom
            setTimeout(() => {
              const scrollArea = scrollAreaRef.current
              if (scrollArea) {
                const { scrollTop, scrollHeight, clientHeight } = scrollArea
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
                
                if (isNearBottom) {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                } else if (!isOwnMessage) {
                  toast('New message received', {
                    action: {
                      label: 'View',
                      onClick: () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }
                  })
                }
              }
            }, 50)
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, fullName, timestamp } = payload.payload
        
        if (userId === user.id) return // Don't show our own typing
        
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== userId)
          return [...filtered, { userId, fullName, timestamp }]
        })
      })
      .subscribe()

    channelRef.current = channel

    // CONTEXT: Clean up typing indicators periodically
    const typingCleanup = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 3000))
    }, 1000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(typingCleanup)
    }
  }, [legId, user, loadMessages])

  // CONTEXT: Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      }, 100)
    }
  }, [isLoading, messages.length])

  // CONTEXT: Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  // CONTEXT: Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access chat</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[600px]">
      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-full p-4"
          onScrollCapture={handleScroll}
        >
        {/* Loading older messages indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        
        {/* Initial loading skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Message list */}
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant={message.sender_role === 'client' ? 'secondary' : 'default'}>
                    {message.sender_role === 'client' ? 'Client' : 'Agent'}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.user_id === user.id ? 'You' : 'User'}
                    </span>
                    <span 
                      className="text-xs text-muted-foreground"
                      title={new Date(message.created_at).toLocaleString()}
                    >
                      {formatTimestamp(message.created_at)}
                    </span>
                    {message.optimistic && (
                      <Badge variant="outline" className="text-xs">
                        Sending...
                      </Badge>
                    )}
                    {message.error && (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    )}
                  </div>
                  
                  <div className={`rounded-lg p-3 ${
                    message.user_id === user.id 
                      ? 'bg-primary text-primary-foreground ml-8' 
                      : 'bg-muted'
                  } ${message.error ? 'opacity-50' : ''}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="flex gap-3">
                <Badge variant="outline">Agent</Badge>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground italic">
                    {typingUsers.map(u => u.fullName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
        </ScrollArea>
      </div>

      {/* Message Composer */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            value={messageText}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={() => sendMessage(messageText)}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
