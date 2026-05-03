"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Search, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import type { CompanySelection } from "@/app/page"

interface CompanySelectionStepProps {
  onSelect: (selection: CompanySelection) => void
  onBack: () => void
}

const companies = [
  { id: "google", name: "Google", sectors: ["Engineering", "Product", "Design", "Sales", "Marketing", "Operations", "HR", "Finance"] },
  { id: "meta", name: "Meta", sectors: ["Engineering", "Product", "Design", "Research", "Marketing", "Operations", "Legal"] },
  { id: "apple", name: "Apple", sectors: ["Engineering", "Product", "Design", "Retail", "Marketing", "Operations", "Hardware"] },
  { id: "amazon", name: "Amazon", sectors: ["Engineering", "Product", "AWS", "Retail", "Operations", "Logistics", "Finance"] },
  { id: "microsoft", name: "Microsoft", sectors: ["Engineering", "Product", "Azure", "Sales", "Marketing", "Research", "Gaming"] },
  { id: "netflix", name: "Netflix", sectors: ["Engineering", "Product", "Content", "Marketing", "Operations", "Finance"] },
  { id: "stripe", name: "Stripe", sectors: ["Engineering", "Product", "Design", "Sales", "Support", "Operations", "Legal"] },
  { id: "airbnb", name: "Airbnb", sectors: ["Engineering", "Product", "Design", "Marketing", "Operations", "Trust & Safety"] },
  { id: "uber", name: "Uber", sectors: ["Engineering", "Product", "Design", "Operations", "Marketing", "Safety", "Logistics"] },
  { id: "spotify", name: "Spotify", sectors: ["Engineering", "Product", "Design", "Content", "Marketing", "Operations"] },
  { id: "salesforce", name: "Salesforce", sectors: ["Engineering", "Product", "Sales", "Customer Success", "Marketing", "Consulting"] },
  { id: "linkedin", name: "LinkedIn", sectors: ["Engineering", "Product", "Design", "Sales", "Marketing", "Talent Solutions"] },
  { id: "twitter", name: "X (Twitter)", sectors: ["Engineering", "Product", "Design", "Trust & Safety", "Marketing", "Operations"] },
  { id: "coinbase", name: "Coinbase", sectors: ["Engineering", "Product", "Design", "Compliance", "Security", "Operations"] },
  { id: "figma", name: "Figma", sectors: ["Engineering", "Product", "Design", "Sales", "Marketing", "Support"] },
  { id: "notion", name: "Notion", sectors: ["Engineering", "Product", "Design", "Sales", "Marketing", "Community"] },
  { id: "slack", name: "Slack", sectors: ["Engineering", "Product", "Design", "Sales", "Customer Success", "Marketing"] },
  { id: "zoom", name: "Zoom", sectors: ["Engineering", "Product", "Sales", "Marketing", "Support", "Operations"] },
  { id: "shopify", name: "Shopify", sectors: ["Engineering", "Product", "Design", "Merchant Success", "Marketing", "Operations"] },
  { id: "databricks", name: "Databricks", sectors: ["Engineering", "Product", "Sales", "Solutions", "Marketing", "Research"] },
]

export function CompanySelectionStep({ onSelect, onBack }: CompanySelectionStepProps) {
  const [selectedCompany, setSelectedCompany] = useState("")
  const [selectedSector, setSelectedSector] = useState("")

  const availableSectors = useMemo(() => {
    const company = companies.find(c => c.id === selectedCompany)
    return company?.sectors || []
  }, [selectedCompany])

  const selectedCompanyData = companies.find(c => c.id === selectedCompany)

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value)
    setSelectedSector("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCompany && selectedSector) {
      onSelect({
        company: selectedCompanyData?.name || "",
        sector: selectedSector,
      })
    }
  }

  const isValid = selectedCompany && selectedSector

  return (
    <Card className="border-2 border-border">
      <CardHeader className="border-b border-border bg-secondary/50">
        <CardTitle className="text-xl font-bold uppercase tracking-wide">
          Step 2: Select Target Company
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a company and department to find the right people to connect with
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup className="space-y-6">
            <Field>
              <FieldLabel>Company *</FieldLabel>
              <Select value={selectedCompany} onValueChange={handleCompanyChange}>
                <SelectTrigger className="border-2 h-12">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                We&apos;ll search Apollo for contacts at this company
              </p>
            </Field>

            <Field>
              <FieldLabel>Department / Sector *</FieldLabel>
              <Select
                value={selectedSector}
                onValueChange={setSelectedSector}
                disabled={!selectedCompany}
              >
                <SelectTrigger className="border-2 h-12">
                  <SelectValue
                    placeholder={
                      selectedCompany
                        ? "Select a department..."
                        : "Select a company first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSectors.map(sector => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Target specific teams to find relevant contacts
              </p>
            </Field>
          </FieldGroup>

          {selectedCompany && selectedSector && (
            <div className="rounded-sm border-2 border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Search className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    Ready to search
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll find contacts in <span className="font-medium text-foreground">{selectedSector}</span> at{" "}
                    <span className="font-medium text-foreground">{selectedCompanyData?.name}</span> and
                    generate a personalized cold email for your coffee chat request.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-2 font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="flex-1 border-2 border-primary font-bold uppercase tracking-wide"
            >
              Generate Email Draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
