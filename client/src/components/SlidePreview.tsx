interface Props {
  slide: any;
  index: number;
}

export default function SlidePreview({ slide, index }: Props) {
  const isFirst = index === 0;
  const isLast = index === 5;

  return (
    <div
      className={`rounded-2xl p-5 border ${
        isLast
          ? 'gradient-green border-emerald-200 dark:border-emerald-800'
          : 'bg-white dark:bg-delta-navy border-delta-border dark:border-delta-navy shadow-card'
      }`}
    >
      {/* Slide counter */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] uppercase tracking-widest font-medium ${isLast ? 'text-delta-muted' : 'text-delta-muted'}`}>
          Slide {index + 1}
        </span>
        {isFirst && (
          <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
            Hook
          </span>
        )}
        {isLast && (
          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
            CTA
          </span>
        )}
      </div>

      {/* Content */}
      {isLast ? (
        <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
          {slide.cta}
        </p>
      ) : (
        <>
          <h4 className="font-bold text-delta-text text-sm leading-tight">
            {slide.title || slide.heading}
          </h4>
          {slide.subtitle && (
            <p className="text-delta-muted text-xs mt-1">{slide.subtitle}</p>
          )}
          {(slide.description || slide.body) && (
            <p className="text-delta-muted/70 text-xs mt-2 leading-relaxed">
              {slide.description || slide.body}
            </p>
          )}
          {slide.swipe_cta && (
            <p className="text-delta-green text-xs mt-2 font-semibold">{slide.swipe_cta}</p>
          )}
          {slide.pro_tip && (
            <div className="mt-2 bg-delta-green/10 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] text-delta-green font-bold">PRO </span>
              <span className="text-xs text-delta-muted">{slide.pro_tip}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
