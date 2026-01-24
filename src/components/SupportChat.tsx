import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramAuthContext } from "@/components/TelegramAuthProvider";
import { hapticNotification, hapticSelection } from "@/lib/haptics";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

interface Message {
  id: string;
  ticket_id: string;
  sender_role: "user" | "admin" | "supplier";
  message_text: string;
  created_at: string;
}

interface Ticket {
  id: string;
  type: "tech_support" | "supplier_question";
  status: "open" | "closed";
  created_at: string;
}

export default function SupportChat() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { profile } = useTelegramAuthContext();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch ticket and messages
  useEffect(() => {
    const fetchData = async () => {
      if (!ticketId) return;

      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (ticketError) {
        console.error("Error fetching ticket:", ticketError);
        navigate("/support");
        return;
      }

      setTicket(ticketData as Ticket);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (!messagesError && messagesData) {
        setMessages(messagesData as Message[]);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [ticketId, navigate]);

  // Real-time subscription
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Haptic feedback for incoming messages
          if (newMsg.sender_role !== "user") {
            hapticNotification("success");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticketId || !profile?.id || isSending) return;

    setIsSending(true);
    hapticSelection();

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      ticket_id: ticketId,
      sender_role: "user",
      message_text: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_role: "user",
        message_text: messageText,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      hapticNotification("error");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } else {
      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? (data as Message) : m))
      );
      hapticNotification("success");
    }

    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleBack = () => {
    hapticSelection();
    navigate("/support");
  };

  const getTicketTypeLabel = (type: string) => {
    switch (type) {
      case "tech_support":
        return "Технічна підтримка";
      case "supplier_question":
        return "Питання до постачальника";
      default:
        return "Підтримка";
    }
  };

  const getSenderLabel = (role: string) => {
    switch (role) {
      case "user":
        return "Ви";
      case "admin":
        return "Підтримка";
      case "supplier":
        return "Постачальник";
      default:
        return "Система";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Чат підтримки #{ticketId?.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">
              {ticket && getTicketTypeLabel(ticket.type)}
              {ticket?.status === "closed" && " • Закрито"}
            </p>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              ticket?.status === "open"
                ? "bg-green-500/10 text-green-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {ticket?.status === "open" ? "Активний" : "Закрито"}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-medium mb-1">Початок чату</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Опишіть своє питання, і наша команда відповість вам найближчим часом
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isUser = message.sender_role === "user";
              const showDate =
                index === 0 ||
                new Date(message.created_at).toDateString() !==
                  new Date(messages[index - 1].created_at).toDateString();

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(message.created_at), "d MMMM", { locale: uk })}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-muted rounded-2xl rounded-bl-md"
                      } px-4 py-2.5`}
                    >
                      {!isUser && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {getSenderLabel(message.sender_role)}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message_text}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(message.created_at), "HH:mm")}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      {ticket?.status === "open" ? (
        <div className="sticky bottom-0 bg-background border-t p-4 pb-safe">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишіть повідомлення..."
              className="flex-1 bg-muted border-0"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || isSending}
              className="shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-muted/50 border-t p-4 pb-safe text-center">
          <p className="text-sm text-muted-foreground">
            Цей чат закрито. Створіть нове звернення, якщо потрібна допомога.
          </p>
        </div>
      )}
    </div>
  );
}
