# Changelog

## 0.1.2 - 2025-09-27
- Added implicit multiplication (2(3+4), (1+2)(3+4), 40%(50%+2))
- Icon refresh

## 0.1.1 - 2025-09-25
- Added dual themes (Blue default, Beige secondary) with persisted toggle
- Implemented unary minus (supports -5, 5*-2, -(3+2))
- Added percent handling (50% -> 0.5, negative percents supported)
- Division by zero now shows ∞ (distinct error code)
- Short, clear error labels (Syntax, Mismatch (), Number, Invalid, Op, Math, ∞)
- History entry dedup + guard against rapid double evaluation
- Keyboard support for % and all operators expanded
- Improved parser with canonical error codes (no regex guessing)
- Layout stability: result line no longer shifts on error
- Minor UI polish (themes, colors, typography)
- Internal rounding to 12 significant digits to reduce float noise

## 0.1.0 - 2025-09-25
- Initial release (basic arithmetic, history, keyboard, percent, persistence)