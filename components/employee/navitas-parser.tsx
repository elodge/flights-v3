'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Star, Plane } from 'lucide-react'
import { parseNavitasText, createFlightOption } from '@/lib/actions/employee-actions'
import { toast } from 'sonner'

interface NavitasParserProps {
  legId: string
  onOptionCreated?: () => void
}

interface ParsedOption {
  name: string
  description?: string
  total_cost?: number
  currency: string
  components: Array<{
    description: string
    component_order: number
  }>
}

export function NavitasParser({ legId, onOptionCreated }: NavitasParserProps) {
  const [navitasText, setNavitasText] = useState('')
  const [isRecommended, setIsRecommended] = useState(false)
  const [parsedOption, setParsedOption] = useState<ParsedOption | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handlePreview = async () => {
    const parsed = await parseNavitasText(navitasText)
    if (parsed) {
      setParsedOption(parsed)
      toast.success('Flight option parsed successfully')
    } else {
      toast.error('Unable to parse flight data. Please check the format.')
    }
  }

  const handleSave = async () => {
    if (!parsedOption) {
      toast.error('Please preview the option first')
      return
    }

    setIsCreating(true)
    try {
      const formData = new FormData()
      formData.append('leg_id', legId)
      formData.append('name', parsedOption.name)
      if (parsedOption.description) {
        formData.append('description', parsedOption.description)
      }
      if (parsedOption.total_cost) {
        formData.append('total_cost', parsedOption.total_cost.toString())
      }
      formData.append('currency', parsedOption.currency)
      formData.append('is_recommended', isRecommended.toString())
      formData.append('components', JSON.stringify(parsedOption.components))

      const result = await createFlightOption(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Flight option created successfully')
        setNavitasText('')
        setParsedOption(null)
        setIsRecommended(false)
        onOptionCreated?.()
      }
    } catch (error) {
      toast.error('Failed to create flight option')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClear = () => {
    setNavitasText('')
    setParsedOption(null)
    setIsRecommended(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plane className="h-5 w-5" />
            <span>Flight Option Entry</span>
          </CardTitle>
          <CardDescription>
            Paste Navitas text to create flight options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Navitas Flight Details</label>
            <Textarea 
              value={navitasText}
              onChange={(e) => setNavitasText(e.target.value)}
              placeholder="Paste Navitas flight text here...

Examples:
UA 123 LAX→JFK 15MAR 0800/1630
DL 456 JFK→LAX 16MAR 1200/1500
Fare: $450 per person
Reference: ABC123

Or:
American Airlines 2456
Los Angeles, CA (LAX) → New York, NY (JFK)
March 15, 2024 - 8:00 AM → 4:30 PM
Business Class - $1,200"
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="recommended" 
              checked={isRecommended}
              onCheckedChange={setIsRecommended}
            />
            <label htmlFor="recommended" className="text-sm font-medium flex items-center space-x-1">
              <Star className="h-4 w-4" />
              <span>Mark as Recommended</span>
            </label>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handlePreview}
              disabled={!navitasText.trim()}
              className="flex-1"
            >
              <Plus className="mr-2 h-4 w-4" />
              Preview Option
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!parsedOption || isCreating}
              variant="outline"
            >
              {isCreating ? 'Saving...' : 'Save Option'}
            </Button>
            <Button 
              onClick={handleClear}
              variant="ghost"
              disabled={!navitasText && !parsedOption}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedOption && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Preview: {parsedOption.name}</span>
                  {isRecommended && (
                    <Badge variant="default" className="flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Recommended</span>
                    </Badge>
                  )}
                </CardTitle>
                {parsedOption.description && (
                  <CardDescription>{parsedOption.description}</CardDescription>
                )}
              </div>
              {parsedOption.total_cost && (
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    ${(parsedOption.total_cost / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {parsedOption.currency}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {parsedOption.components.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Flight Segments</h5>
                <div className="space-y-1">
                  {parsedOption.components.map((component, index) => (
                    <div key={index} className="text-sm p-2 bg-background rounded-md">
                      <Badge variant="outline" className="mr-2">
                        Segment {component.component_order}
                      </Badge>
                      {component.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
