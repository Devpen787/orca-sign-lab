export function PlaybackIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M5 3v10M11 3v10" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m5 3 8 5-8 5Z" />
    </svg>
  )
}
