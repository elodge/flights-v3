/**
 * @fileoverview Booking Queue Content component
 * 
 * @description Main interface for the employee booking queue showing client selections,
 * hold status, ticketing progress, and available actions.
 * @param N/A - No props, fetches data internally
 * @returns JSX.Element
 * @access Employees only
 * @security Data access controlled by server actions
 * @database Displays client_selections, holds, ticketings data
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, DollarSign, Plane, Filter, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { getBookingQueue } from '@/app/(employee)/a/actions/queue';
import { PlaceHoldDialog } from '@/components/employee/place-hold-dialog';
import { MarkTicketedDialog } from '@/components/employee/mark-ticketed-dialog';
import { HoldCountdown } from '@/components/employee/hold-countdown';

// CONTEXT: Type definitions for queue data
interface QueueItem {
  id: string;
  option_id: string;
  created_at: string;
  price_snapshot: number;
  currency: string;
  selection_groups: {
    id: string;
    label: string;
    type: string;
    passenger_ids: string[];
    legs: {
      id: string;
      label: string;
      origin_city: string;
      destination_city: string;
      departure_date: string;
      projects: {
        id: string;
        name: string;
        artists: {
          id: string;
          name: string;
        };
      };
    };
  };
  options: {
    id: string;
    name: string;
    description: string;
    price_total: number;
    price_currency: string;
    segments: any[];
    is_split: boolean;
  };
  hold?: {
    id: string;
    expires_at: string;
  };
  ticketed_count: number;
  total_passengers: number;
}

/**
 * Booking Queue Content component
 * 
 * @description Displays the prioritized list of client selections with actions for
 * holds, ticketing, and queue management. Includes filtering and real-time updates.
 * @returns JSX.Element
 * @access Employees only
 * @security Server actions handle authorization
 * @database Fetches and displays booking queue data
 * @business_rule Items sorted by hold expiration, departure date, creation time
 * @example
 * ```typescript
 * <BookingQueueContent />
 * ```
 */
export function BookingQueueContent() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistFilter, setArtistFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [dialogType, setDialogType] = useState<'hold' | 'ticket' | null>(null);
  
  const router = useRouter();

  // CONTEXT: Fetch queue data on component mount and when filters change
  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const data = await getBookingQueue(artistFilter === 'all' ? undefined : artistFilter);
      
      // CONTEXT: Apply status filtering client-side
      let filteredData = data;
      if (statusFilter === 'no-hold') {
        filteredData = data.filter((item: any) => !item.hold);
      } else if (statusFilter === 'held') {
        filteredData = data.filter((item: any) => item.hold);
      } else if (statusFilter === 'partial') {
        filteredData = data.filter((item: any) => 
          item.ticketed_count > 0 && item.ticketed_count < item.total_passengers
        );
      }
      
      setQueueItems(filteredData);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      toast.error('Failed to load booking queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, [artistFilter, statusFilter]);

  // CONTEXT: Handle action completions
  const handleActionComplete = () => {
    setDialogType(null);
    setSelectedItem(null);
    fetchQueueData(); // Refresh queue data
  };

  // CONTEXT: Format price display
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // CONTEXT: Get status badge based on hold and ticketing state
  const getStatusBadge = (item: QueueItem) => {
    if (item.ticketed_count === item.total_passengers) {
      return <Badge variant="default" className="bg-green-500">Complete</Badge>;
    }
    if (item.ticketed_count > 0) {
      return <Badge variant="secondary">Partial ({item.ticketed_count}/{item.total_passengers})</Badge>;
    }
    if (item.hold) {
      return <Badge variant="outline">Held</Badge>;
    }
    return <Badge variant="secondary">No Hold</Badge>;
  };

  // CONTEXT: Handle opening leg details
  const handleOpenLeg = (legId: string) => {
    router.push(`/a/tour/${legId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CONTEXT: Filters and controls */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={artistFilter} onValueChange={setArtistFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Artists" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            {/* TODO: Populate with actual artists */}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="no-hold">No Hold</SelectItem>
            <SelectItem value="held">Held</SelectItem>
            <SelectItem value="partial">Partially Ticketed</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchQueueData}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* CONTEXT: Queue summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium">Total Items</span>
            </div>
            <p className="text-2xl font-bold mt-1">{queueItems.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500 mr-2" />
              <span className="text-sm font-medium">With Holds</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueItems.filter(item => item.hold).length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Plane className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium">Partial Ticketed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {queueItems.filter(item => 
                item.ticketed_count > 0 && item.ticketed_count < item.total_passengers
              ).length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-purple-500 mr-2" />
              <span className="text-sm font-medium">Total Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatPrice(
                queueItems.reduce((sum, item) => 
                  sum + (item.price_snapshot * item.total_passengers), 0
                ),
                'USD'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CONTEXT: Queue items list */}
      <div className="space-y-4">
        {queueItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items in queue</h3>
              <p className="text-gray-500">
                Client selections will appear here when they&apos;re ready for booking.
              </p>
            </CardContent>
          </Card>
        ) : (
          queueItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {item.selection_groups.legs.origin_city} → {item.selection_groups.legs.destination_city}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.selection_groups.label} • {item.selection_groups.legs.projects.artists.name}
                    </p>
                  </div>
                  {getStatusBadge(item)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* CONTEXT: Option details */}
                <div>
                  <h4 className="font-medium mb-2">Selected Option</h4>
                  <p className="text-sm text-gray-600">{item.options.name}</p>
                  {item.options.description && (
                    <p className="text-xs text-gray-500 mt-1">{item.options.description}</p>
                  )}
                </div>

                {/* CONTEXT: Passenger and pricing info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Passengers:</span>
                    <span className="ml-2">{item.total_passengers}</span>
                  </div>
                  <div>
                    <span className="font-medium">Total Budget:</span>
                    <span className="ml-2">
                      {formatPrice(item.price_snapshot * item.total_passengers, item.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Selected:</span>
                    <span className="ml-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* CONTEXT: Hold countdown if applicable */}
                {item.hold && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-800">Hold Active</span>
                      <HoldCountdown expiresAt={item.hold.expires_at} />
                    </div>
                  </div>
                )}

                <Separator />

                {/* CONTEXT: Action buttons */}
                <div className="flex items-center gap-2">
                  {!item.hold && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setDialogType('hold');
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Place Hold
                    </Button>
                  )}
                  
                  {item.ticketed_count < item.total_passengers && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setDialogType('ticket');
                      }}
                    >
                      <Plane className="h-4 w-4 mr-2" />
                      Mark Ticketed
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenLeg(item.selection_groups.legs.id)}
                  >
                    Open Leg
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* CONTEXT: Action dialogs */}
      {dialogType === 'hold' && selectedItem && (
        <PlaceHoldDialog
          isOpen={true}
          onClose={() => {
            setDialogType(null);
            setSelectedItem(null);
          }}
          onSuccess={handleActionComplete}
          optionId={selectedItem.option_id}
          legId={selectedItem.selection_groups.legs.id}
          optionName={selectedItem.options.name}
          passengerId={'00000000-0000-0000-0000-000000000000'}
        />
      )}

      {dialogType === 'ticket' && selectedItem && (
        <MarkTicketedDialog
          isOpen={true}
          onClose={() => {
            setDialogType(null);
            setSelectedItem(null);
          }}
          onSuccess={handleActionComplete}
          queueItem={selectedItem}
        />
      )}
    </div>
  );
}
