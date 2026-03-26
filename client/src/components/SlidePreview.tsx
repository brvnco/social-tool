interface Props {
  slide: any;
  index: number;
}

export default function SlidePreview({ slide, index }: Props) {
  const isFirst = index === 0;
  const isLast = index === 5;

  return (
    <div
      className={`rounded-lg p-4 border ${
        isLast
          ? 'bg-delta-green/20 border-delta-green/30'
          : 'bg-black/40 border-delta-border'
      }`}
    >
      {/* Slide counter */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest">
          Slide {index + 1}
        </span>
        {isFirst && (
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            Hook
          </span>
        )}
        {isLast && (
          <span className="text-[10px] bg-delta-green/30 text-delta-green px-2 py-0.5 rounded-full">
            CTA
          </span>
        )}
      </div>

      {/* Content */}
      {isLast ? (
        <p className={`font-bold text-lg ${isLast ? 'text-delta-green' : 'text-white'}`}>
          {slide.cta}
        </p>
      ) : (
        <>
          <h4 className="font-semibold text-white text-sm leading-tight">
            {slide.title || slide.heading}
          </h4>
          {slide.subtitle && (
            <p className="text-gray-400 text-xs mt-1">{slide.subtitle}</p>
          )}
          {(slide.description || slide.body) && (
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              {slide.description || slide.body}
            </p>
          )}
          {slide.swipe_cta && (
            <p className="text-delta-green text-xs mt-2 font-medium">{slide.swipe_cta}</p>
          )}
          {slide.pro_tip && (
            <div className="mt-2 bg-delta-green/10 rounded px-2 py-1">
              <span className="text-[10px] text-delta-green font-semibold">PRO </span>
              <span className="text-xs text-gray-400">{slide.pro_tip}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
