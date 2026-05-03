"use client"

import { Check, User, Building2, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  currentStep: number
}

const steps = [
  { id: 1, name: "Your Profile", icon: User },
  { id: 2, name: "Target Company", icon: Building2 },
  { id: 3, name: "Email Draft", icon: Mail },
]

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center gap-4 md:gap-8">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const Icon = step.icon

          return (
            <li key={step.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-sm border-2 transition-colors",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-card text-primary",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 bg-card text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium md:block",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "ml-2 h-0.5 w-8 md:w-12",
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
