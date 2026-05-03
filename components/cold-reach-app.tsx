"use client"

// main app client component — drives the multi-step ColdReach flow and wires
// the v0 UI to the real /api/agent + /api/drafts backend endpoints
import { useState, useCallback, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Upload,
  FileText,
  X,
  ArrowRight,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
  Send,
  Pencil,
  Check,
  Mail,
  Briefcase,
  MapPin,
  AlertCircle,
  RefreshCw,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { Draft } from "@/lib/types"

// ----- types ----------------------------------------------------------------

type AppStep = "intro" | "prescreen" | "ai-questions" | "generating" | "contacts" | "emails"

interface LocalChatMessage {
  id: string
  role: "ai" | "user"
  content: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  content?: string // text content when type="text"
  type: "uploaded" | "text"
}

// contacts are derived by grouping drafts from KV by contactId
interface ContactWithDrafts {
  contactId: string
  contactName: string
  contactEmail: string
  contactCompany?: string
  contactTitle?: string
  drafts: Draft[]
}

// ----- constants ------------------------------------------------------------

const AI_QUESTIONS = [
  "Thanks for sharing your background! What specific role or position are you most interested in pursuing?",
  "Great! Which companies or industries are you most excited about? Any dream companies?",
  "Perfect. What would you say is your strongest skill or achievement that you'd want to highlight in a cold email?",
  "Last one — what's your primary goal with these cold emails? (e.g., coffee chats, referrals, informational interviews, direct job opportunities)",
]

const COMPANIES = [
  "Google", "Apple", "Microsoft", "Amazon", "Meta",
  "Netflix", "Stripe", "Airbnb", "Uber", "Spotify",
  "Salesforce", "Adobe", "Tesla", "Goldman Sachs", "JPMorgan",
  "McKinsey", "BCG", "Bain", "Deloitte", "KPMG",
]

const DEPARTMENTS: Record<string, string[]> = {
  default: ["Engineering", "Product", "Design", "Marketing", "Sales", "Finance", "Operations", "HR", "Legal"],
  "Goldman Sachs": ["Investment Banking", "Asset Management", "Securities", "Research", "Operations", "Technology"],
  "JPMorgan": ["Investment Banking", "Asset Management", "Commercial Banking", "Technology", "Operations", "Risk"],
  "McKinsey": ["Strategy", "Operations", "Digital", "M&A", "Organization", "Marketing & Sales"],
  "BCG": ["Strategy", "Digital", "Operations", "Corporate Finance", "People & Organization"],
  "Bain": ["Private Equity", "Strategy", "Performance Improvement", "Digital", "M&A"],
}

// ----- helpers --------------------------------------------------------------

function getDepartments(company: string): string[] {
  return DEPARTMENTS[company] ?? DEPARTMENTS.default
}

/** Build the message sent to the AI agent with all collected user context. */
function buildAgentMessage(
  aboutYou: string,
  chatAnswers: LocalChatMessage[],
  company: string,
  department: string,
): string {
  const userAnswers = chatAnswers
    .filter((m) => m.role === "user")
    .map((m, i) => `- ${AI_QUESTIONS[i]?.split("!")[0] ?? "Q"}: ${m.content}`)
    .join("\n")

  return [
    `Find 3-5 contacts and draft 2 cold emails per contact in the ${department} team at ${company}.`,
    "",
    "USER PROFILE:",
    aboutYou ? `Background: ${aboutYou}` : "",
    userAnswers ? `\nAnswers from intake:\n${userAnswers}` : "",
    "",
    `TARGET: ${company} — ${department}`,
    "Draft personalized cold emails for each contact using different angles (personal_pitch, mutual_interest, or value_first).",
  ]
    .filter(Boolean)
    .join("\n")
}

// ----- main component -------------------------------------------------------

interface ColdReachAppProps {
  isSignedIn: boolean
}

export function ColdReachApp({ isSignedIn }: ColdReachAppProps) {
  const [step, setStep] = useState<AppStep>("intro")

  // prescreen state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [textInput, setTextInput] = useState("")
  const [aboutYou, setAboutYou] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  // ai-questions state (local chat, no backend)
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isAiTyping, setIsAiTyping] = useState(false)

  // company/department selection (shown at end of ai-questions step)
  const [company, setCompany] = useState("")
  const [department, setDepartment] = useState("")

  // contacts/emails state (populated from real API after agent run)
  const [contacts, setContacts] = useState<ContactWithDrafts[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactWithDrafts | null>(null)
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)

  // editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // sending state
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // generation state
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [agentStatusText, setAgentStatusText] = useState("")
  // flag to know when we should react to useChat reaching 'ready'
  const pendingGenerate = useRef(false)

  // agent chat hook — talks to the existing /api/agent route handler
  const { sendMessage, status: agentStatus, messages: agentMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  })

  // watch for agent completing to fetch real drafts
  useEffect(() => {
    if (!pendingGenerate.current) return
    if (agentStatus === "ready") {
      pendingGenerate.current = false
      fetchDraftsAndTransition()
    }
    if (agentStatus === "error") {
      pendingGenerate.current = false
      setGenerationError("The agent encountered an error. Please try again.")
      setStep("contacts")
    }
  }, [agentStatus])

  // show last agent text in the generating step
  useEffect(() => {
    if (!agentMessages.length) return
    const last = agentMessages[agentMessages.length - 1]
    if (!last) return
    const textPart = last.parts.find((p) => p.type === "text")
    if (textPart && "text" in textPart) {
      setAgentStatusText(textPart.text)
    }
  }, [agentMessages])

  // --- draft fetching ---------------------------------------------------------

  async function fetchDraftsAndTransition() {
    try {
      const res = await fetch("/api/drafts?status=pending")
      if (!res.ok) {
        if (res.status === 401) {
          setGenerationError("You need to sign in with Google before generating emails.")
        } else {
          setGenerationError("Could not load your drafts. Please try again.")
        }
        setStep("contacts")
        return
      }
      const { drafts } = (await res.json()) as { drafts: Draft[] }

      // group drafts by contactId
      const map = new Map<string, ContactWithDrafts>()
      for (const draft of drafts) {
        if (!map.has(draft.contactId)) {
          map.set(draft.contactId, {
            contactId: draft.contactId,
            contactName: draft.contactName,
            contactEmail: draft.contactEmail,
            contactCompany: draft.contactCompany,
            contactTitle: draft.contactTitle,
            drafts: [],
          })
        }
        map.get(draft.contactId)!.drafts.push(draft)
      }

      const grouped = Array.from(map.values())
      setContacts(grouped)
      setStep("contacts")
    } catch {
      setGenerationError("Network error loading drafts. Please try again.")
      setStep("contacts")
    }
  }

  // --- generation trigger -----------------------------------------------------

  function handleGenerate() {
    if (!company || !department) return
    setGenerationError(null)
    setAgentStatusText("")
    setContacts([])
    pendingGenerate.current = true
    setStep("generating")
    sendMessage({
      text: buildAgentMessage(aboutYou, chatMessages, company, department),
    })
  }

  // --- prescreen handlers -----------------------------------------------------

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      size: file.size,
      type: "uploaded",
    }))
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      size: file.size,
      type: "uploaded",
    }))
    setUploadedFiles((prev) => [...prev, ...newFiles])
    e.target.value = ""
  }, [])

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return
    const newFile: UploadedFile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: `note-${Date.now()}.txt`,
      size: new Blob([textInput]).size,
      content: textInput.trim(),
      type: "text",
    }
    setUploadedFiles((prev) => [...prev, newFile])
    setTextInput("")
  }, [textInput])

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // --- ai-questions handlers --------------------------------------------------

  const initializeChat = useCallback(() => {
    setChatMessages([{ id: "ai-0", role: "ai", content: AI_QUESTIONS[0] }])
    setCurrentQuestionIndex(0)
  }, [])

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim()) return
    const userMessage: LocalChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
    }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")

    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < AI_QUESTIONS.length) {
      setIsAiTyping(true)
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          { id: `ai-${nextIndex}`, role: "ai", content: AI_QUESTIONS[nextIndex] },
        ])
        setCurrentQuestionIndex(nextIndex)
        setIsAiTyping(false)
      }, 900)
    } else {
      setIsAiTyping(true)
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: "ai-final",
            role: "ai",
            content:
              "Perfect! I have everything I need. Select a company and department below, then click Find Contacts to generate your personalized emails.",
          },
        ])
        setIsAiTyping(false)
      }, 900)
    }
  }, [chatInput, currentQuestionIndex])

  // --- email deck actions -----------------------------------------------------

  async function handleSend(draft: Draft) {
    setSendingDraftId(draft.id)
    setSendError(null)
    try {
      const res = await fetch(`/api/drafts/${draft.id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setSendError(data.error === "no_gmail_access_token"
          ? "Sign in with Google first so we can send via Gmail."
          : data.message ?? "Send failed. Please try again.")
        return
      }
      // update local draft status
      if (selectedContact) {
        setSelectedContact((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            drafts: prev.drafts.map((d) =>
              d.id === draft.id ? { ...d, status: "sent" as const } : d,
            ),
          }
        })
      }
      // advance to next draft if available
      if (currentDraftIndex < (selectedContact?.drafts.length ?? 1) - 1) {
        setCurrentDraftIndex((i) => i + 1)
      }
    } finally {
      setSendingDraftId(null)
    }
  }

  async function handleQueueForEdit(draft: Draft) {
    await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "queued_for_edit" }),
    })
    // advance to next draft
    if (currentDraftIndex < (selectedContact?.drafts.length ?? 1) - 1) {
      setCurrentDraftIndex((i) => i + 1)
    }
  }

  async function handleSaveEdit(draft: Draft) {
    if (!editBody.trim()) return
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody }),
      })
      if (res.ok) {
        const { draft: updated } = await res.json()
        if (selectedContact) {
          setSelectedContact((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              drafts: prev.drafts.map((d) => (d.id === updated.id ? updated : d)),
            }
          })
        }
        setEditingDraftId(null)
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  // intro screen
  if (step === "intro") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs tracking-widest uppercase text-muted-foreground">
                AI-Powered Outreach
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-serif tracking-tight text-foreground">
              Cold Reach
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
              Craft personalized cold emails that land coffee chats, referrals, and real connections.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            {isSignedIn ? (
              <Button
                onClick={() => setStep("prescreen")}
                size="lg"
                className="h-14 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <>
                <a
                  href="/api/auth/signin"
                  className="inline-flex items-center gap-2 h-14 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-colors"
                >
                  Sign in with Google
                  <ArrowRight className="h-5 w-5" />
                </a>
                <p className="text-sm text-muted-foreground">
                  Sign in to enable Gmail sending — browsing works without signing in.
                </p>
                <button
                  onClick={() => setStep("prescreen")}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline"
                >
                  Continue without signing in (limited)
                </button>
              </>
            )}
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            {["Resume Analysis", "Smart Targeting", "Personalized Drafts"].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // prescreen step
  if (step === "prescreen") {
    const isValid = uploadedFiles.length > 0

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-lg space-y-8">
          <div className="space-y-2">
            <p className="text-xs tracking-widest uppercase text-accent">Step 1 of 3</p>
            <h1 className="text-4xl font-serif tracking-tight text-foreground">
              Tell us about yourself
            </h1>
            <p className="text-muted-foreground">
              Upload anything that helps us know you better
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Your documents</label>
            <p className="text-xs text-muted-foreground -mt-1">
              Resume, cover letter, portfolio, GitHub profile, or anything else
            </p>

            {/* drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={[
                "relative border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                isDragging
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground hover:bg-card/50",
              ].join(" ")}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground text-sm">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD</p>
              </div>
            </div>

            {/* text input for notes */}
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type anything else here and add it as a text note..."
                className="min-h-[60px] bg-card border-border resize-none text-foreground placeholder:text-muted-foreground text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleTextSubmit()
                  }
                }}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                size="icon"
                className="h-[60px] w-12 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* file list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} added
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB{file.type === "text" && " • Text note"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              Anything else?
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={aboutYou}
              onChange={(e) => setAboutYou(e.target.value)}
              placeholder="Add context not in your docs — goals, specific interests, what you're looking for..."
              className="min-h-[80px] bg-card border-border resize-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>

          <Button
            onClick={() => {
              initializeChat()
              setStep("ai-questions")
            }}
            disabled={!isValid}
            className="w-full h-12 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    )
  }

  // ai-questions step — local chat UI, no backend
  if (step === "ai-questions") {
    const questionsComplete =
      currentQuestionIndex >= AI_QUESTIONS.length - 1 &&
      chatMessages.filter((m) => m.role === "user").length >= AI_QUESTIONS.length
    const availableDepts = getDepartments(company)
    const canGenerate = questionsComplete && company && department

    return (
      <main className="min-h-screen flex flex-col p-6 relative">
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <div className="py-6 space-y-2">
            <p className="text-xs tracking-widest uppercase text-accent">Step 2 of 3</p>
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
              Let&apos;s learn more about you
            </h1>
            <p className="text-muted-foreground">
              Answer a few questions to help us find the perfect contacts
            </p>
          </div>

          {/* chat messages */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md",
                  ].join(" ")}
                >
                  {message.role === "ai" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span className="text-xs text-accent font-medium">Cold Reach AI</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-3 w-3 text-accent" />
                    <span className="text-xs text-accent font-medium">Cold Reach AI</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 150, 300].map((delay) => (
                      <div
                        key={delay}
                        className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* input area */}
          <div className="py-4 space-y-4">
            {!questionsComplete ? (
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="min-h-[50px] max-h-[120px] bg-card border-border resize-none text-foreground placeholder:text-muted-foreground text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleChatSubmit()
                    }
                  }}
                  disabled={isAiTyping}
                />
                <Button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isAiTyping}
                  size="icon"
                  className="h-[50px] w-12 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs tracking-widest uppercase text-accent">
                  Now pick your target
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Company</label>
                    <Select
                      value={company}
                      onValueChange={(v) => {
                        setCompany(v)
                        setDepartment("")
                      }}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground">
                        <SelectValue placeholder="Select company..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {c}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Department</label>
                    <Select
                      value={department}
                      onValueChange={setDepartment}
                      disabled={!company}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground">
                        <SelectValue placeholder={company ? "Select dept..." : "Select company first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDepts.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full h-12 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Find Contacts & Generate Emails
                </Button>
              </div>
            )}

            <button
              onClick={() => setStep("prescreen")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to previous step
            </button>
          </div>
        </div>
      </main>
    )
  }

  // generating step — shows while agent is running
  if (step === "generating") {
    const isRunning = agentStatus === "submitted" || agentStatus === "streaming"
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="relative z-10 w-full max-w-md text-center space-y-6">
          <div className="relative inline-flex">
            <Spinner className="h-14 w-14 text-accent" />
            <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-accent animate-pulse" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              {isRunning ? "Generating your personalized emails…" : "Wrapping up…"}
            </p>
            <p className="text-sm text-muted-foreground">
              Searching {department} contacts at {company}
            </p>
          </div>

          {agentStatusText && (
            <p className="text-xs text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
              {agentStatusText}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {["Analyzing profile", "Finding decision makers", "Crafting messages"].map((label) => (
              <span
                key={label}
                className="rounded-sm border border-border bg-card px-2 py-1"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // contacts step — shows real contacts from KV, grouped from drafts
  if (step === "contacts") {
    return (
      <main className="min-h-screen flex flex-col p-6 relative">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <div className="py-6 space-y-2">
            <p className="text-xs tracking-widest uppercase text-accent">Step 3 of 3</p>
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
              Select a contact
            </h1>
            <p className="text-muted-foreground">
              {contacts.length > 0
                ? `Found ${contacts.length} contact${contacts.length > 1 ? "s" : ""} in ${department} at ${company}`
                : generationError
                ? "Something went wrong — see below"
                : "No contacts found — try different filters"}
            </p>
          </div>

          {generationError && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">{generationError}</p>
                {generationError.includes("Sign in") && (
                  <a
                    href="/api/auth/signin"
                    className="inline-block text-sm text-accent underline underline-offset-4"
                  >
                    Sign in with Google →
                  </a>
                )}
              </div>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="flex-1 space-y-3 py-4">
              {contacts.map((contact) => (
                <button
                  key={contact.contactId}
                  onClick={() => {
                    setSelectedContact(contact)
                    setCurrentDraftIndex(0)
                    setSelectedDraftId(null)
                    setEditingDraftId(null)
                    setSendError(null)
                    setStep("emails")
                  }}
                  className="w-full p-4 rounded-xl border border-border bg-card hover:border-accent/50 hover:bg-card/80 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-medium text-accent">
                        {contact.contactName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                          {contact.contactName}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {contact.drafts.length} draft{contact.drafts.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      {contact.contactTitle && (
                        <div className="flex items-center gap-1 mt-1">
                          <Briefcase className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{contact.contactTitle}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {contact.contactEmail}
                        </span>
                        {contact.contactCompany && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {contact.contactCompany}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="py-6 flex gap-3">
            <button
              onClick={() => setStep("ai-questions")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Change filters
            </button>
            <button
              onClick={() => {
                setContacts([])
                setGenerationError(null)
                handleGenerate()
              }}
              className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </button>
          </div>
        </div>
      </main>
    )
  }

  // emails step — tinder-style draft deck for a selected contact
  if (!selectedContact) {
    setStep("contacts")
    return null
  }

  const currentDraft = selectedContact.drafts[currentDraftIndex]

  return (
    <main className="min-h-screen flex flex-col p-6 relative">
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="text-center py-6 space-y-2">
          <p className="text-xs tracking-widest uppercase text-accent">
            Email to {selectedContact.contactName}
          </p>
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
            Choose your email
          </h1>
          <p className="text-muted-foreground">
            Swipe through {selectedContact.drafts.length} personalized draft
            {selectedContact.drafts.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-full">
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setCurrentDraftIndex(
                    (i) => (i - 1 + selectedContact.drafts.length) % selectedContact.drafts.length,
                  )
                }
                className="h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>

              <div
                className={[
                  "flex-1 rounded-xl border bg-card p-6 transition-all",
                  selectedDraftId === currentDraft?.id
                    ? "border-accent ring-2 ring-accent/20"
                    : "border-border",
                ].join(" ")}
              >
                {/* angle badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent capitalize">
                    {currentDraft?.angle?.replace(/_/g, " ") ?? "draft"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {currentDraftIndex + 1} of {selectedContact.drafts.length}
                  </span>
                </div>

                {/* subject */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                  <p className="text-foreground font-medium">{currentDraft?.subject}</p>
                </div>

                {/* body */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Body</p>
                  {editingDraftId === currentDraft?.id ? (
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="min-h-[200px] bg-card border-border text-sm font-mono resize-none"
                      autoFocus
                    />
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-4 max-h-[280px] overflow-y-auto">
                      <p className="text-foreground text-sm whitespace-pre-line leading-relaxed">
                        {currentDraft?.body}
                      </p>
                    </div>
                  )}
                </div>

                {/* status badge if already sent */}
                {currentDraft?.status === "sent" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Sent</span>
                  </div>
                )}

                {/* send error */}
                {sendError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{sendError}</p>
                  </div>
                )}

                {/* select / edit actions */}
                {editingDraftId === currentDraft?.id ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingDraftId(null)}
                      className="flex-1 rounded-lg border-border"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => currentDraft && handleSaveEdit(currentDraft)}
                      disabled={isSavingEdit}
                      className="flex-1 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {isSavingEdit ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (currentDraft?.status === "sent") return
                      setSelectedDraftId(currentDraft?.id ?? null)
                    }}
                    disabled={currentDraft?.status === "sent"}
                    className={[
                      "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                      selectedDraftId === currentDraft?.id
                        ? "bg-accent text-accent-foreground"
                        : currentDraft?.status === "sent"
                        ? "bg-muted text-muted-foreground cursor-default"
                        : "bg-muted text-foreground hover:bg-muted/80",
                    ].join(" ")}
                  >
                    {selectedDraftId === currentDraft?.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        Selected
                      </>
                    ) : currentDraft?.status === "sent" ? (
                      "Already sent"
                    ) : (
                      "Select this email"
                    )}
                  </button>
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentDraftIndex(
                    (i) => (i + 1) % selectedContact.drafts.length,
                  )
                }
                className="h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* dot indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {selectedContact.drafts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDraftIndex(index)}
                  className={[
                    "h-2 rounded-full transition-all",
                    index === currentDraftIndex
                      ? "w-6 bg-accent"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>

        {/* bottom actions */}
        <div className="py-6 space-y-4">
          {selectedDraftId && currentDraft && currentDraft.status !== "sent" && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingDraftId(currentDraft.id)
                  setEditBody(currentDraft.body)
                }}
                className="flex-1 h-12 rounded-full border-border text-foreground hover:bg-muted"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit It
              </Button>
              <Button
                onClick={() => currentDraft && handleSend(currentDraft)}
                disabled={sendingDraftId === currentDraft?.id}
                className="flex-1 h-12 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                {sendingDraftId === currentDraft?.id ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Right Away
              </Button>
            </div>
          )}

          {selectedDraftId && currentDraft && currentDraft.status !== "sent" && (
            <button
              onClick={() => currentDraft && handleQueueForEdit(currentDraft)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Save for later (queue for edit)
            </button>
          )}

          <button
            onClick={() => {
              setSelectedContact(null)
              setSendError(null)
              setEditingDraftId(null)
              setStep("contacts")
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to contacts
          </button>
        </div>
      </div>
    </main>
  )
}
