'use client'

import { forwardRef } from 'react'

type MiniGameFrameProps = {
  src: string
  title: string
  onLoad: () => void
  allowDownloads?: boolean
}

export const MiniGameFrame = forwardRef<HTMLIFrameElement, MiniGameFrameProps>(function MiniGameFrame(
  { src, title, onLoad, allowDownloads = false },
  ref,
) {
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      onLoad={onLoad}
      sandbox={`allow-scripts allow-same-origin allow-pointer-lock allow-popups${allowDownloads ? ' allow-downloads' : ''}`}
      className="block h-full w-full border-0 bg-[#06182a]"
      allow="fullscreen; autoplay"
    />
  )
})
