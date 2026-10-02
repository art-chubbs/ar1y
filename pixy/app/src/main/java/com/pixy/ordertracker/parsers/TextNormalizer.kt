package com.pixy.ordertracker.parsers

import java.text.Normalizer

/** Cleans notification text: strips emoji, unifies dashes/quotes/spaces, keeps line breaks. */
object TextNormalizer {

    fun clean(input: String?): String {
        if (input.isNullOrBlank()) return ""
        val nfkc = Normalizer.normalize(input, Normalizer.Form.NFKC)
        val sb = StringBuilder(nfkc.length)
        var i = 0
        while (i < nfkc.length) {
            val cp = nfkc.codePointAt(i)
            i += Character.charCount(cp)
            when {
                cp == '\n'.code -> sb.append('\n')
                cp == 0x2018 || cp == 0x2019 || cp == 0x2032 -> sb.append('\'')
                cp == 0x201C || cp == 0x201D -> sb.append('"')
                cp in 0x2010..0x2015 || cp == 0x2212 -> sb.append('-')
                cp == 0x2026 -> sb.append("...")
                isDecoration(cp) -> sb.append(' ')
                Character.isWhitespace(cp) || Character.isSpaceChar(cp) -> sb.append(' ')
                else -> sb.appendCodePoint(cp)
            }
        }
        return sb.toString()
            .lines()
            .map { it.replace(Regex("\\s+"), " ").trim() }
            .filter { it.isNotEmpty() }
            .joinToString("\n")
    }

    /** Lower-cased clean text used for rule matching. */
    fun forMatching(input: String?): String = clean(input).lowercase()

    private fun isDecoration(cp: Int): Boolean {
        if (cp == 0x200D || cp in 0xFE00..0xFE0F || cp in 0x1F3FB..0x1F3FF || cp == 0x20E3) return true // ZWJ, variation selectors, skin tones, keycap
        if (cp in 0x1F000..0x1FAFF || cp in 0x2600..0x27BF || cp in 0x1F900..0x1F9FF) return true    // emoji blocks
        val type = Character.getType(cp)
        return type == Character.OTHER_SYMBOL.toInt() || type == Character.SURROGATE.toInt() ||
            type == Character.PRIVATE_USE.toInt() || type == Character.UNASSIGNED.toInt()
    }
}
