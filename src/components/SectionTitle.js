export default function SectionTitle({ text }) {
  return (
    <>
      <style>{`
        @keyframes shimmerTitle {
          0%   { background-position: -300% center; }
          100% { background-position:  300% center; }
        }
        .shimmer-section-title {
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: clamp(56px, 10vw, 100px);
          font-weight: 300;
          letter-spacing: 0.15em;
          display: inline-block;
          background: linear-gradient(90deg,
            #f4b8cc 0%, #a8d8f0 20%, #f9d0e0 40%, #c8e8f8 60%, #f4b8cc 80%, #a8d8f0 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerTitle 10s linear infinite;
          filter: drop-shadow(2px 5px 10px rgba(13,31,58,0.45)) drop-shadow(0px 2px 4px rgba(13,31,58,0.25));
        }
      `}</style>
      <span className="shimmer-section-title">{text}</span>
    </>
  )
}
