import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Package, HelpCircle, Sparkles, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickActions = [
  { icon: Package, label: "Де моє замовлення?", prompt: "Де моє замовлення?" },
  { icon: HelpCircle, label: "Допоможи обрати розмір", prompt: "Допоможи обрати правильний розмір" },
  { icon: Sparkles, label: "Акції дня", prompt: "Які зараз є акції та знижки?" },
  { icon: MapPin, label: "Знайти магазин", prompt: "Знайти найближче відділення Нової Пошти" },
];

export const AIChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Вітаю! 👋 Я ваш AI-асистент Taverna. Чим можу допомогти? Можу знайти товари, перевірити статус замовлення або підібрати розмір.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Де моє замовлення?": "Перевіряю статус вашого замовлення... 📦\n\nВаше останнє замовлення #TV-2847 вже в дорозі! Очікувана дата доставки: завтра до 18:00.\n\nНомер ТТН: 20450123456789",
        "Допоможи обрати правильний розмір": "Звичайно! 📏\n\nДля правильного вибору розміру виміряйте:\n• Обхват грудей\n• Обхват талії\n• Довжину рукава\n\nМожете скинути фото або назву товару — підберу ідеальний розмір!",
        "Які зараз є акції та знижки?": "🔥 Актуальні акції:\n\n• -20% на перше замовлення\n• Flash Sale: до -50% на тактичне взуття\n• Безкоштовна доставка від 2000₴\n• Бонуси за відгуки з фото!",
        "Знайти найближче відділення Нової Пошти": "📍 Для пошуку відділення перейдіть в оформлення замовлення — там є зручний вибір міста та відділення з картою!\n\nАбо скажіть назву вашого міста, і я допоможу знайти.",
      };

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[messageText] || `Дякую за ваше питання! 🤖\n\nЯ зараз аналізую запит "${messageText}".\n\nНаразі я працюю в демо-режимі. У повній версії зможу:\n• Шукати товари за параметрами\n• Відстежувати замовлення\n• Консультувати по розмірах\n• Надавати персоналізовані рекомендації`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-40",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-primary to-accent",
          "text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "hover:scale-110 active:scale-95",
          "transition-all duration-200",
          "animate-pulse-slow",
          isOpen && "hidden"
        )}
      >
        <Bot className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-live rounded-full animate-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-x-4 bottom-24 z-50",
            "max-w-md mx-auto",
            "bg-card border border-border rounded-2xl",
            "shadow-2xl overflow-hidden",
            "animate-scale-in",
            "flex flex-col",
            "h-[70vh] max-h-[500px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Taverna AI</h3>
                <p className="text-xs opacity-80">Завжди онлайн</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      message.role === "user" ? "opacity-70" : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString("uk-UA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5",
                      "bg-muted hover:bg-muted/80 rounded-full",
                      "text-xs text-foreground",
                      "transition-colors"
                    )}
                  >
                    <action.icon className="h-3 w-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напишіть повідомлення..."
                className={cn(
                  "flex-1 h-11 px-4 rounded-xl",
                  "bg-muted border border-border",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "transition-all"
                )}
                disabled={isTyping}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping}
                className="h-11 w-11 rounded-xl"
              >
                {isTyping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
