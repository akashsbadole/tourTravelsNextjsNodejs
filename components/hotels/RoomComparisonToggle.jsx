"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Scale, Plus, Minus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function RoomComparisonToggle({ 
  roomId, 
  onToggle, 
  variant = "default",
  size = "default",
  className = "",
  showCount = false 
}) {
  const [isInComparison, setIsInComparison] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    checkComparisonStatus();
  }, [roomId]);

  const checkComparisonStatus = async () => {
    try {
      const response = await fetch('/api/hotels/rooms/compare', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const roomInList = data.data.rooms.some(
            room => room.roomId._id === roomId
          );
          setIsInComparison(roomInList);
          setComparisonCount(data.data.rooms.length);
          onToggle?.(roomInList);
        }
      }
    } catch (error) {
      console.error('Error checking comparison status:', error);
    }
  };

  const handleToggleComparison = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const endpoint = isInComparison ? 
        `/api/hotels/rooms/compare?roomId=${roomId}` : 
        '/api/hotels/rooms/compare';
      
      const method = isInComparison ? 'DELETE' : 'POST';
      const body = isInComparison ? undefined : JSON.stringify({ roomId });

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const data = await response.json();

      if (data.success) {
        const newStatus = !isInComparison;
        setIsInComparison(newStatus);
        setComparisonCount(prev => newStatus ? prev + 1 : prev - 1);
        onToggle?.(newStatus);

        toast.success(
          newStatus ? 'Room added to comparison' : 'Room removed from comparison',
          {
            description: newStatus ? 
              `You can compare up to 5 rooms` : 
              'Room removed from comparison list'
          }
        );
      } else {
        toast.error(data.message || 'Failed to update comparison');
      }
    } catch (error) {
      console.error('Error toggling comparison:', error);
      toast.error('Failed to update comparison');
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = () => {
    if (variant === "icon") {
      return isInComparison ? (
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
      ) : (
        <Heart className="h-4 w-4" />
      );
    }
    
    if (variant === "scale") {
      return <Scale className="h-4 w-4" />;
    }
    
    return isInComparison ? (
      <Minus className="h-4 w-4" />
    ) : (
      <Plus className="h-4 w-4" />
    );
  };

  const getText = () => {
    if (variant === "icon") return '';
    if (variant === "scale") return 'Compare';
    return isInComparison ? 'Remove' : 'Compare';
  };

  const getVariant = () => {
    if (isInComparison) return "secondary";
    return "outline";
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={getVariant()}
        size={size}
        onClick={handleToggleComparison}
        disabled={isLoading}
        className={`${className} ${isInComparison ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : ''}`}
      >
        {getIcon()}
        {getText()}
      </Button>
      
      {showCount && (
        <Badge variant="secondary" className="text-xs">
          {comparisonCount}/5
        </Badge>
      )}
    </div>
  );
}

export default RoomComparisonToggle;