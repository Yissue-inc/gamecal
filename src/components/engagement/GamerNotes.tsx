'use client'

import { useEffect, useRef, useState } from 'react'
import { getEventNote, setEventNote } from '@/lib/engagement-store'

interface GamerNotesProps {
  eventId: string
}

export function GamerNotes({ eventId }: GamerNotesProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNote(getEventNote(eventId))
    setEditing(false)
    setSaved(false)
  }, [eventId])

  function startEditing() {
    setEditing(true)
    window.setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleSave() {
    setEventNote(eventId, note)
    setNote(getEventNote(eventId))
    setEditing(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  function handleCancel() {
    setNote(getEventNote(eventId))
    setEditing(false)
  }

  if (!editing && !note) {
    return (
      <button
        type="button"
        data-testid="gamer-notes-add"
        onClick={startEditing}
        className="w-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2 text-left text-xs font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
      >
        + Add a prep note for yourself
      </button>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        data-testid="gamer-notes-display"
        onClick={startEditing}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-left text-xs text-zinc-300 transition hover:border-zinc-700"
      >
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Prep Note {saved && <span className="text-emerald-400">· Saved</span>}
        </span>
        <span className="line-clamp-3">{note}</span>
      </button>
    )
  }

  return (
    <div data-testid="gamer-notes-editor" className="rounded-lg border border-indigo-800/50 bg-zinc-950/70 p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prep Note</div>
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSave()
        }}
        maxLength={280}
        rows={3}
        placeholder="Example: farm tokens before reset, check drop table, ping squad..."
        className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-indigo-500/70"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-600">{note.length}/280</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleCancel} className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
