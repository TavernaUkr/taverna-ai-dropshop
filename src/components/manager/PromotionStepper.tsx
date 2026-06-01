import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface StepDef {
  id: number;
  label: string;
  icon: LucideIcon;
}

interface PromotionStepperProps {
  steps: StepDef[];
  currentStep: number;
}

export function PromotionStepper({ steps, currentStep }: PromotionStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-between px-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0",
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium text-center leading-tight max-w-[64px]",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 -mt-4 rounded",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StepNavProps {
  step: number;
  totalSteps: number;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  finalSlot?: React.ReactNode;
}

export function StepNav({
  step,
  totalSteps,
  canProceed,
  onBack,
  onNext,
  nextLabel = "Далі",
  finalSlot,
}: StepNavProps) {
  const isLast = step >= totalSteps;
  return (
    <div className="flex items-center gap-2 pt-1">
      {step > 1 && (
        <Button variant="outline" size="lg" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
      )}
      {isLast ? (
        <div className="flex-1">{finalSlot}</div>
      ) : (
        <Button
          size="lg"
          className="flex-1"
          onClick={onNext}
          disabled={!canProceed}
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
