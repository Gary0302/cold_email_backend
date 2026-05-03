"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Copy, Check, RefreshCw, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { CompanySelection } from "@/app/page"

interface EmailDraftStepProps {
  email: string
  isGenerating: boolean
  companySelection: CompanySelection
  onRestart: () => void
  onBack: () => void
}

export function EmailDraftStep({
  email,
  isGenerating,
  companySelection,
  onRestart,
  onBack,
}: EmailDraftStepProps) {
  const [editedEmail, setEditedEmail] = useState(email)
  const [copied, setCopied] = useState(false)

  // Update edited email when generation completes
  useEffect(() => {
    if (email && !isGenerating) {
      setEditedEmail(email)
    }
  }, [email, isGenerating])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedEmail || email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isGenerating) {
    return (
      <Card className="border-2 border-border">
        <CardHeader className="border-b border-border bg-secondary/50">
          <CardTitle className="text-xl font-bold uppercase tracking-wide">
            Step 3: Your Email Draft
          </CardTitle>
        </CardHeader>
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative">
              <Spinner className="h-12 w-12 text-primary" />
              <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-primary animate-pulse" />
            </div>
            <p className="mt-6 text-lg font-medium text-foreground">
              Generating your personalized email...
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Searching for contacts at {companySelection.company} in {companySelection.sector}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-sm border border-border bg-secondary px-2 py-1">
                Analyzing your profile
              </span>
              <span className="rounded-sm border border-border bg-secondary px-2 py-1">
                Finding decision makers
              </span>
              <span className="rounded-sm border border-border bg-secondary px-2 py-1">
                Crafting personalized message
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-border">
      <CardHeader className="border-b border-border bg-secondary/50">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold uppercase tracking-wide">
              Step 3: Your Email Draft
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review, edit, and copy your personalized cold email
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-sm border-2 border-primary/30 bg-primary/10 px-3 py-1.5">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {companySelection.company} • {companySelection.sector}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="rounded-sm border-2 border-border bg-card p-1">
            <Textarea
              value={editedEmail || email}
              onChange={e => setEditedEmail(e.target.value)}
              className="min-h-80 border-0 font-mono text-sm leading-relaxed focus-visible:ring-0 resize-none"
              placeholder="Your email will appear here..."
            />
          </div>

          <div className="rounded-sm border-2 border-border bg-secondary/50 p-4">
            <h4 className="font-medium text-foreground">Tips for success:</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Replace [Name] with the actual contact&apos;s name from Apollo</li>
              <li>• Keep the email concise - under 150 words performs best</li>
              <li>• Send during Tuesday-Thursday mornings for higher response rates</li>
              <li>• Follow up once after 5-7 days if no response</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-2 font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Company
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRestart}
              className="border-2 font-medium"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            <Button
              type="button"
              onClick={handleCopy}
              className="flex-1 border-2 border-primary font-bold uppercase tracking-wide"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
