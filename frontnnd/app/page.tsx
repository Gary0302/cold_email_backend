"use client"

import { useState, useCallback } from "react"
import { Upload, FileText, X, ArrowRight, Sparkles, Users, ChevronLeft, ChevronRight, Send, Pencil, Check, Mail, Briefcase, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Step = "intro" | "prescreen" | "ai-questions" | "contacts" | "emails"

interface ChatMessage {
  id: string
  role: "ai" | "user"
  content: string
}

const aiQuestions = [
  "Thanks for sharing your background! I see you have experience in this field. What specific role or position are you most interested in pursuing?",
  "Great! And which companies or industries are you most excited about? Any dream companies?",
  "Perfect. What would you say is your strongest skill or achievement that you'd want to highlight in a cold email?",
  "Last one - what's your primary goal with these cold emails? (e.g., coffee chats, referrals, informational interviews, direct job opportunities)",
]

interface Contact {
  id: number
  name: string
  title: string
  email: string
  location: string
  yearsAtCompany: number
}

const companies = [
  "Google", "Apple", "Microsoft", "Amazon", "Meta",
  "Netflix", "Stripe", "Airbnb", "Uber", "Spotify",
  "Salesforce", "Adobe", "Tesla", "Goldman Sachs", "JPMorgan",
  "McKinsey", "BCG", "Bain", "Deloitte", "KPMG"
]

const departments: Record<string, string[]> = {
  default: ["Engineering", "Product", "Design", "Marketing", "Sales", "Finance", "Operations", "HR", "Legal"],
  "Goldman Sachs": ["Investment Banking", "Asset Management", "Securities", "Research", "Operations", "Technology"],
  "JPMorgan": ["Investment Banking", "Asset Management", "Commercial Banking", "Technology", "Operations", "Risk"],
  "McKinsey": ["Strategy", "Operations", "Digital", "M&A", "Organization", "Marketing & Sales"],
  "BCG": ["Strategy", "Digital", "Operations", "Corporate Finance", "People & Organization"],
  "Bain": ["Private Equity", "Strategy", "Performance Improvement", "Digital", "M&A"],
}

// Dummy contacts from "Apollo"
const generateContacts = (company: string, department: string): Contact[] => [
  {
    id: 1,
    name: "Sarah Chen",
    title: `Senior ${department} Manager`,
    email: `s.chen@${company.toLowerCase().replace(/\s/g, "")}.com`,
    location: "San Francisco, CA",
    yearsAtCompany: 4,
  },
  {
    id: 2,
    name: "Michael Torres",
    title: `${department} Lead`,
    email: `m.torres@${company.toLowerCase().replace(/\s/g, "")}.com`,
    location: "New York, NY",
    yearsAtCompany: 6,
  },
  {
    id: 3,
    name: "Emily Johnson",
    title: `Director of ${department}`,
    email: `e.johnson@${company.toLowerCase().replace(/\s/g, "")}.com`,
    location: "Seattle, WA",
    yearsAtCompany: 8,
  },
  {
    id: 4,
    name: "David Kim",
    title: `${department} Associate`,
    email: `d.kim@${company.toLowerCase().replace(/\s/g, "")}.com`,
    location: "Austin, TX",
    yearsAtCompany: 2,
  },
  {
    id: 5,
    name: "Rachel Martinez",
    title: `VP of ${department}`,
    email: `r.martinez@${company.toLowerCase().replace(/\s/g, "")}.com`,
    location: "Chicago, IL",
    yearsAtCompany: 10,
  },
]

// Dummy email drafts
const generateEmails = (company: string, department: string, contactName: string) => [
  {
    id: 1,
    tone: "Professional",
    subject: `Quick question about ${department} at ${company}`,
    body: `Hi ${contactName.split(" ")[0]},

I hope this email finds you well. I came across your profile while researching ${department} opportunities at ${company}, and I was really impressed by your career trajectory.

I'm currently exploring roles in ${department} and would love to learn more about your experience at ${company}. Would you be open to a 15-minute coffee chat sometime in the next few weeks?

I'd be happy to work around your schedule and can meet virtually or in person, whichever is more convenient for you.

Thank you for considering this request. I really appreciate your time.

Best regards`
  },
  {
    id: 2,
    tone: "Casual",
    subject: `Coffee chat about ${company}?`,
    body: `Hey ${contactName.split(" ")[0]}!

I've been following ${company}'s work in ${department} and I'm genuinely curious about what it's like to work there.

I'm currently looking to break into the industry and your background caught my eye. No pressure at all, but if you ever have 15 minutes for a quick virtual coffee, I'd love to hear about your journey.

Totally understand if you're swamped - just thought I'd reach out!

Cheers`
  },
  {
    id: 3,
    tone: "Direct",
    subject: `${department} at ${company} - Quick Chat?`,
    body: `Hi ${contactName.split(" ")[0]},

I'll keep this brief: I'm researching ${department} roles at ${company} and I think your insights would be incredibly valuable.

Specifically, I'd love to know:
- What does a typical day look like in ${department}?
- What skills matter most for success?
- Any advice for someone trying to break in?

Would you have 15 minutes for a quick call this week or next?

Thanks for your time.`
  }
]

interface UploadedFile {
  id: string
  name: string
  size: number
  type: "uploaded" | "text"
}

export default function ColdReachApp() {
  const [step, setStep] = useState<Step>("intro")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [textInput, setTextInput] = useState("")
  const [aboutYou, setAboutYou] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [company, setCompany] = useState("Google")
  const [department, setDepartment] = useState("Engineering")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isAiTyping, setIsAiTyping] = useState(false)

  const contacts = generateContacts(company, department)
  const emails = selectedContact ? generateEmails(company, department, selectedContact.name) : []

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const newFiles: UploadedFile[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: "uploaded" as const
    }))
    setUploadedFiles(prev => [...prev, ...newFiles])
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
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: "uploaded" as const
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
    e.target.value = ""
  }, [])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      const newFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `note-${Date.now()}.txt`,
        size: new Blob([textInput]).size,
        type: "text"
      }
      setUploadedFiles(prev => [...prev, newFile])
      setTextInput("")
    }
  }, [textInput])

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const initializeChat = useCallback(() => {
    setChatMessages([{
      id: "ai-0",
      role: "ai",
      content: aiQuestions[0]
    }])
    setCurrentQuestionIndex(0)
  }, [])

  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: chatInput.trim()
    }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput("")

    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < aiQuestions.length) {
      setIsAiTyping(true)
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: `ai-${nextIndex}`,
          role: "ai",
          content: aiQuestions[nextIndex]
        }
        setChatMessages(prev => [...prev, aiMessage])
        setCurrentQuestionIndex(nextIndex)
        setIsAiTyping(false)
      }, 1000)
    } else {
      setIsAiTyping(true)
      setTimeout(() => {
        const finalMessage: ChatMessage = {
          id: "ai-final",
          role: "ai",
          content: "Perfect! I have everything I need. Let me find the best contacts for you based on your profile and goals."
        }
        setChatMessages(prev => [...prev, finalMessage])
        setIsAiTyping(false)
      }, 1000)
    }
  }, [chatInput, currentQuestionIndex])

  const getDepartments = () => {
    return departments[company] || departments.default
  }

  const nextEmail = () => {
    setCurrentEmailIndex((prev) => (prev + 1) % emails.length)
  }

  const prevEmail = () => {
    setCurrentEmailIndex((prev) => (prev - 1 + emails.length) % emails.length)
  }

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact)
    setCurrentEmailIndex(0)
    setSelectedEmail(null)
    setStep("emails")
  }

  // Intro Screen
  if (step === "intro") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs tracking-widest uppercase text-muted-foreground">AI-Powered Outreach</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-serif tracking-tight text-foreground">
              Cold Reach
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
              Craft personalized cold emails that land coffee chats, referrals, and real connections.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => setStep("prescreen")}
              size="lg"
              className="h-14 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              Resume Analysis
            </span>
            <span className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              Smart Targeting
            </span>
            <span className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              Personalized Drafts
            </span>
          </div>

          <button
            onClick={() => setStep("contacts")}
            className="mt-8 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline"
          >
            Skip to contacts demo
          </button>
        </div>
      </main>
    )
  }

  // Pre-screen
  if (step === "prescreen") {
    const isValid = uploadedFiles.length > 0 // Only document is required, about you is optional

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
            
            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border border-dashed rounded-lg p-6
                flex flex-col items-center justify-center gap-2
                transition-all cursor-pointer
                ${isDragging 
                  ? "border-accent bg-accent/5" 
                  : "border-border hover:border-muted-foreground hover:bg-card/50"
                }
              `}
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
                <p className="text-foreground text-sm">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, TXT, MD
                </p>
              </div>
            </div>

            {/* Text Input for Adding Notes as .txt */}
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type anything else here and add it as a text file..."
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

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} added</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB {file.type === "text" && "• Text note"}
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
              placeholder="Add context not in your docs - goals, specific interests, what you're looking for..."
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

  // AI Questions Chat
  if (step === "ai-questions") {
    const isComplete = currentQuestionIndex >= aiQuestions.length - 1 && chatMessages.length > aiQuestions.length

    return (
      <main className="min-h-screen flex flex-col p-6 relative">
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="py-6 space-y-2">
            <p className="text-xs tracking-widest uppercase text-accent">Step 2 of 3</p>
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
              Let&apos;s learn more about you
            </h1>
            <p className="text-muted-foreground">
              Answer a few questions to help us find the perfect contacts
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-foreground text-background rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
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
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="py-4 space-y-4">
            {!isComplete ? (
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
              <Button
                onClick={() => setStep("contacts")}
                className="w-full h-12 text-base font-medium rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Users className="mr-2 h-4 w-4" />
                Find Contacts
              </Button>
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

  // Contacts Screen - List of people from Apollo
  if (step === "contacts") {
    return (
      <main className="min-h-screen flex flex-col p-6 relative">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="py-6 space-y-2">
            <p className="text-xs tracking-widest uppercase text-accent">Step 3 of 3</p>
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
              Select a contact
            </h1>
            <p className="text-muted-foreground">
              Found {contacts.length} people in {department} at {company}
            </p>
          </div>

          {/* Contacts List */}
          <div className="flex-1 space-y-3 py-4">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleContactSelect(contact)}
                className="w-full p-4 rounded-xl border border-border bg-card hover:border-accent/50 hover:bg-card/80 transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-medium text-accent">
                      {contact.name.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                        {contact.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {contact.yearsAtCompany}y at company
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{contact.title}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {contact.location}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>

          {/* Back button */}
          <div className="py-6">
            <button
              onClick={() => setStep("ai-questions")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to questions
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Email Selection - Tinder-style
  const currentEmail = emails[currentEmailIndex]

  return (
    <main className="min-h-screen flex flex-col p-6 relative">
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center py-6 space-y-2">
          <p className="text-xs tracking-widest uppercase text-accent">Email to {selectedContact?.name}</p>
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground">
            Choose your email
          </h1>
          <p className="text-muted-foreground">
            Swipe through {emails.length} personalized drafts
          </p>
        </div>

        {/* Email Card */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-full">
            {/* Navigation arrows and card */}
            <div className="flex items-center gap-4">
              <button
                onClick={prevEmail}
                className="h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>

              <div 
                className={`flex-1 rounded-xl border bg-card p-6 transition-all ${
                  selectedEmail === currentEmail.id 
                    ? "border-accent ring-2 ring-accent/20" 
                    : "border-border"
                }`}
              >
                {/* Tone badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                    {currentEmail.tone}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {currentEmailIndex + 1} of {emails.length}
                  </span>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                  <p className="text-foreground font-medium">{currentEmail.subject}</p>
                </div>

                {/* Body */}
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Body</p>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-[280px] overflow-y-auto">
                    <p className="text-foreground text-sm whitespace-pre-line leading-relaxed">
                      {currentEmail.body}
                    </p>
                  </div>
                </div>

                {/* Select this email */}
                <button
                  onClick={() => setSelectedEmail(currentEmail.id)}
                  className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedEmail === currentEmail.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {selectedEmail === currentEmail.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    "Select this email"
                  )}
                </button>
              </div>

              <button
                onClick={nextEmail}
                className="h-12 w-12 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {emails.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentEmailIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentEmailIndex 
                      ? "w-6 bg-accent" 
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="py-6 space-y-4">
          {selectedEmail && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-full border-border text-foreground hover:bg-muted"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit It
              </Button>
              <Button
                className="flex-1 h-12 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Right Away
              </Button>
            </div>
          )}
          
          <button
            onClick={() => { setSelectedContact(null); setStep("contacts") }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to contacts
          </button>
        </div>
      </div>
    </main>
  )
}
