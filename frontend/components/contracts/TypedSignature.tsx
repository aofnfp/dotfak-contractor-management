'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface TypedSignatureProps {
  onChange: (dataUrl: string | null, name: string) => void
}

export function TypedSignature({ onChange }: TypedSignatureProps) {
  const [name, setName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderSignature = useCallback((text: string) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!text.trim()) {
      onChange(null, '')
      return
    }

    ctx.fillStyle = '#000000'
    ctx.font = 'italic 36px "Georgia", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl, text)
  }, [onChange])

  useEffect(() => {
    renderSignature(name)
  }, [name, renderSignature])

  return (
    <div className="space-y-3">
      <Input
        placeholder="Type your full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-background border-border text-lg"
      />
      <div className="border border-border rounded-md overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={120}
          className="w-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Your typed name will be rendered as a signature
      </p>
    </div>
  )
}
