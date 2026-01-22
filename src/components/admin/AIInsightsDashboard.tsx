import { useState } from "react";
import { Brain, TrendingUp, AlertTriangle, BarChart3, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Insight {
  id: string;
  type: "trend" | "risk" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  category?: string;
}

export function AIInsightsDashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([
    {
      id: "1",
      type: "trend",
      title: "Зростання попиту на тактичне взуття",
      description: "За останній тиждень попит на тактичне взуття зріс на 35%. Рекомендуємо збільшити закупівлі.",
      confidence: 87,
      category: "Взуття",
    },
    {
      id: "2",
      type: "risk",
      title: "Підозріла активність постачальника",
      description: "Постачальник 'TechSupplies' має незвично високу кількість відмін замовлень (23%).",
      confidence: 72,
    },
    {
      id: "3",
      type: "opportunity",
      title: "Потенціал для крос-селінгу",
      description: "78% покупців рюкзаків також цікавляться тактичними аксесуарами.",
      confidence: 91,
      category: "Рюкзаки",
    },
    {
      id: "4",
      type: "trend",
      title: "Сезонний тренд: зимовий одяг",
      description: "Прогнозується зростання попиту на зимовий тактичний одяг на 45% протягом наступного місяця.",
      confidence: 83,
      category: "Одяг",
    },
  ]);

  const handleRefreshInsights = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast.success("Аналіз оновлено");
    setIsAnalyzing(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case "risk":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "opportunity":
        return <Sparkles className="h-5 w-5 text-warning" />;
      default:
        return <BarChart3 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getInsightBadge = (type: string) => {
    switch (type) {
      case "trend":
        return <Badge variant="default">Тренд</Badge>;
      case "risk":
        return <Badge variant="destructive">Ризик</Badge>;
      case "opportunity":
        return <Badge className="bg-warning text-warning-foreground">Можливість</Badge>;
      default:
        return <Badge variant="secondary">Інше</Badge>;
    }
  };

  const trendInsights = insights.filter((i) => i.type === "trend");
  const riskInsights = insights.filter((i) => i.type === "risk");
  const opportunityInsights = insights.filter((i) => i.type === "opportunity");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Powered by Gemini</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshInsights}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{trendInsights.length}</p>
            <p className="text-xs text-muted-foreground">Трендів</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{riskInsights.length}</p>
            <p className="text-xs text-muted-foreground">Ризиків</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Sparkles className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{opportunityInsights.length}</p>
            <p className="text-xs text-muted-foreground">Можливостей</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {isAnalyzing ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="font-medium text-foreground">Аналізуємо дані...</p>
              <p className="text-sm text-muted-foreground">
                Gemini AI обробляє інформацію про продажі та постачальників
              </p>
            </CardContent>
          </Card>
        ) : (
          insights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getInsightBadge(insight.type)}
                      {insight.category && (
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-foreground">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        Впевненість:
                      </span>
                      <Progress value={insight.confidence} className="flex-1 h-2" />
                      <span className="text-xs font-medium">{insight.confidence}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Placeholder for future features */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium text-foreground mb-2">Розширена аналітика</h4>
          <p className="text-sm text-muted-foreground">
            Детальні звіти про продажі, прогнозування попиту та автоматичні рекомендації 
            будуть доступні після повної інтеграції з Gemini AI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
