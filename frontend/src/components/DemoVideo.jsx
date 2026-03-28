import { useRef, useState } from 'react'
import { Play } from 'lucide-react'

/**
 * Add `public/demo.mp4`, or set `VITE_DEMO_VIDEO_SRC` (MP4 URL), or `VITE_DEMO_YOUTUBE_ID` in `.env`.
 */
const youtubeId = import.meta.env.VITE_DEMO_YOUTUBE_ID
const videoSrc = import.meta.env.VITE_DEMO_VIDEO_SRC || '/demo.mp4'

/** 16:9 frame with a capped height (roughly 2× the minimal strip) so it stays balanced on the page. */
const demoFrameLayout =
  'relative mx-auto aspect-video h-[min(60vh,480px)] w-auto max-w-full sm:h-[min(64vh,520px)] md:h-[min(68vh,560px)]'

export default function DemoVideo() {
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [showPlayOverlay, setShowPlayOverlay] = useState(true)

  if (youtubeId) {
    return (
      <div className={`${demoFrameLayout} bg-black`}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
          title="SnapSense product demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center ${demoFrameLayout}`}
      >
        <p className="text-sm text-neutral-500">No demo video found.</p>
        <p className="max-w-md text-xs text-neutral-600">
          Add <span className="font-mono text-neutral-400">public/demo.mp4</span> or set{' '}
          <span className="font-mono text-neutral-400">VITE_DEMO_VIDEO_SRC</span> /{' '}
          <span className="font-mono text-neutral-400">VITE_DEMO_YOUTUBE_ID</span>.
        </p>
      </div>
    )
  }

  return (
    <div className={`${demoFrameLayout} bg-black`}>
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload="metadata"
        src={videoSrc}
        onError={() => setFailed(true)}
        onPlay={() => setShowPlayOverlay(false)}
        onEnded={() => setShowPlayOverlay(true)}
      >
        Your browser does not support embedded video.
      </video>

      {showPlayOverlay && (
        <button
          type="button"
          aria-label="Play product demo"
          className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/50 transition-colors hover:bg-black/40"
          onClick={() => videoRef.current?.play()}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-500/25 transition-transform hover:scale-105 md:h-[4.5rem] md:w-[4.5rem]">
            <Play className="ml-1 h-8 w-8 fill-current md:h-9 md:w-9" aria-hidden />
          </span>
        </button>
      )}
    </div>
  )
}
