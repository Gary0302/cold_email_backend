"use client"

import { useState, useCallback } from "react"
import { Upload, X, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import type { UserProfile } from "@/app/page"

interface OnboardingStepProps {
  initialProfile: UserProfile
  onComplete: (profile: UserProfile) => void
}

export function OnboardingStep({ initialProfile, onComplete }: OnboardingStepProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const [skillInput, setSkillInput] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = (file: File) => {
    if (file.type === "application/pdf" || file.type === "application/msword" || 
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain") {
      setProfile(prev => ({ ...prev, resumeFile: file }))
      // In a real app, you'd parse the resume here
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setProfile(prev => ({ ...prev, resumeFile: null, resumeText: "" }))
  }

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }))
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete(profile)
  }

  const isValid = profile.name.trim() && profile.email.trim()

  return (
    <Card className="border-2 border-border">
      <CardHeader className="border-b border-border bg-secondary/50">
        <CardTitle className="text-xl font-bold uppercase tracking-wide">
          Step 1: Tell Us About Yourself
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help us personalize your cold emails by sharing your background
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Full Name *</FieldLabel>
              <Input
                placeholder="John Doe"
                value={profile.name}
                onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className="border-2"
              />
            </Field>
            <Field>
              <FieldLabel>Email Address *</FieldLabel>
              <Input
                type="email"
                placeholder="john@example.com"
                value={profile.email}
                onChange={e => setProfile(prev => ({ ...prev, email: e.target.value }))}
                className="border-2"
              />
            </Field>
          </FieldGroup>

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Current Role</FieldLabel>
              <Input
                placeholder="Software Engineer"
                value={profile.currentRole}
                onChange={e => setProfile(prev => ({ ...prev, currentRole: e.target.value }))}
                className="border-2"
              />
            </Field>
            <Field>
              <FieldLabel>Target Role</FieldLabel>
              <Input
                placeholder="Product Manager"
                value={profile.targetRole}
                onChange={e => setProfile(prev => ({ ...prev, targetRole: e.target.value }))}
                className="border-2"
              />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel>Years of Experience</FieldLabel>
            <Input
              placeholder="e.g., 5 years"
              value={profile.experience}
              onChange={e => setProfile(prev => ({ ...prev, experience: e.target.value }))}
              className="border-2"
            />
          </Field>

          <Field>
            <FieldLabel>Key Skills</FieldLabel>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-2"
              />
              <Button
                type="button"
                onClick={addSkill}
                variant="outline"
                size="icon"
                className="border-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {profile.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="border-2 border-border gap-1 pr-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-sm hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>Upload Resume (Optional)</FieldLabel>
            <div
              className={`relative border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {profile.resumeFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{profile.resumeFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(profile.resumeFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Drag and drop your resume here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse (PDF, DOC, DOCX, TXT)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileInput}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel>Your Goals</FieldLabel>
            <Textarea
              placeholder="What do you hope to achieve from these coffee chats? (e.g., learning about company culture, getting career advice, exploring job opportunities)"
              value={profile.goals}
              onChange={e => setProfile(prev => ({ ...prev, goals: e.target.value }))}
              className="min-h-24 border-2"
            />
          </Field>

          <Button
            type="submit"
            disabled={!isValid}
            className="w-full border-2 border-primary font-bold uppercase tracking-wide"
          >
            Continue to Company Selection
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
