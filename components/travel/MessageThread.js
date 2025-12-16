"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Reply,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MessageThread({ 
  communication, 
  currentUser, 
  onSendMessage, 
  onEditMessage,
  onDeleteMessage,
  onMarkAsRead,
  className = "" 
}) {
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [communication?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      messageType: "text",
      replyTo: replyingTo?._id,
    };

    try {
      await onSendMessage(messageData);
      setNewMessage("");
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;

    try {
      await onEditMessage(messageId, editText.trim());
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await onDeleteMessage(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(messageDate, "HH:mm");
    } else if (diffInHours < 24 * 7) {
      return format(messageDate, "EEE HH:mm");
    } else {
      return format(messageDate, "MMM dd, HH:mm");
    }
  };

  const isMessageRead = (message) => {
    return message.readBy?.some(read => read.user === currentUser?.id);
  };

  const getMessageStatus = (message) => {
    if (message.senderType === "agent") return null;
    
    if (message.isDeleted) return "deleted";
    if (message.readAt) return "read";
    if (message.editedAt) return "edited";
    return "sent";
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "edited":
        return <Edit className="w-3 h-3 text-orange-500" />;
      case "deleted":
        return <Trash2 className="w-3 h-3 text-red-500" />;
      default:
        return <Check className="w-3 h-3 text-gray-400" />;
    }
  };

  const canEditMessage = (message) => {
    return message.sender === currentUser?.id && !message.isDeleted;
  };

  const canDeleteMessage = (message) => {
    return message.sender === currentUser?.id && !message.isDeleted;
  };

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{communication?.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={communication?.status === "active" ? "default" : "secondary"}>
                {communication?.status}
              </Badge>
              {communication?.priority !== "medium" && (
                <Badge variant="outline">{communication?.priority}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {communication?.participants?.length || 0} participants
              </span>
            </div>
          </div>
          <div className="flex -space-x-2">
            {communication?.participants?.slice(0, 3).map((participant, index) => (
              <Avatar key={index} className="w-8 h-8 border-2 border-background">
                <AvatarImage src={participant.user?.profileImage} />
                <AvatarFallback>
                  {participant.user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            ))}
            {communication?.participants?.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                +{communication.participants.length - 3}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {communication?.messages?.map((message) => (
              <div
                key={message._id}
                className={`flex gap-3 ${
                  message.sender === currentUser?.id ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.sender?.profileImage} />
                  <AvatarFallback>
                    {message.sender?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex-1 max-w-[70%] ${message.sender === currentUser?.id ? "text-right" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.sender?.firstName} {message.sender?.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.senderType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.createdAt)}
                    </span>
                    {getMessageStatus(message) && (
                      <div className="flex items-center gap-1">
                        {getMessageStatusIcon(getMessageStatus(message))}
                      </div>
                    )}
                  </div>

                  {editingMessage === message._id ? (
                    <div className="space-y-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="Edit your message..."
                        className="w-full"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMessage(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleEditMessage(message._id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : message.isDeleted ? (
                    <div className="text-sm text-muted-foreground italic">
                      This message was deleted
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-3">
                      {message.replyTo && (
                        <div className="text-xs text-muted-foreground mb-2 border-l-2 border-primary pl-2">
                          Replying to {message.replyTo.sender?.firstName}: {message.replyTo.content}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.editedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Edited {formatMessageTime(message.editedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{attachment.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {canEditMessage(message) || canDeleteMessage(message) ? (
                    <div className="flex justify-end mt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={message.sender === currentUser?.id ? "end" : "start"}>
                          {canEditMessage(message) && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingMessage(message._id);
                                setEditText(message.content);
                              }}
                            >
                              <Edit className="w-3 h-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDeleteMessage(message) && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(message._id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {replyingTo && (
          <div className="border-t p-3 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Replying to {replyingTo.sender?.firstName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="text-sm text-muted-foreground bg-background p-2 rounded border-l-2 border-primary">
              {replyingTo.content}
            </div>
          </div>
        )}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}