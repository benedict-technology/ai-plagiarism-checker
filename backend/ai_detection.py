import statistics
from dataclasses import dataclass

from .preprocessing import split_sentences, tokenize


# Data structure used to return a compact AI writing analysis result.
@dataclass
class AIContentAnalysis:
    score: int
    label: str
    confidence: str
    signals: list[str]


# Common phrases that often appear in more formal or AI-generated prose.
AI_STYLE_PHRASES = {
    "it is important to note",
    "in today's world",
    "plays a crucial role",
    "it is essential to",
    "overall",
    "in conclusion",
    "furthermore",
    "moreover",
    "additionally",
    "as a result",
    "this highlights",
    "this demonstrates",
}


def ai_likeness_score(text: str) -> int:
    """Return only the AI-likeness integer score for the given text."""
    return analyze_ai_content(text).score


def analyze_ai_content(text: str) -> AIContentAnalysis:
    """Analyze a text sample and return a heuristic AI-likeness score and signals."""
    words = tokenize(text, remove_stop_words=False)
    if not words:
        # Empty or insufficient text cannot be analyzed reliably.
        return AIContentAnalysis(0, "Human or insufficient text", "low", [])

    normalized_text = " ".join(words)
    sentences = split_sentences(text)
    sentence_lengths = [len(tokenize(sentence, remove_stop_words=False)) for sentence in sentences]

    # Compute several heuristic signals over the text.
    unique_ratio = len(set(words)) / len(words)
    avg_word_len = sum(len(word) for word in words) / len(words)
    transition_words = {
        "moreover", "therefore", "however", "furthermore", "additionally",
        "consequently", "overall", "notably",
    }
    transition_phrases = {"in conclusion"}
    transition_hits = sum(1 for word in words if word in transition_words)
    transition_hits += sum(1 for phrase in transition_phrases if phrase in normalized_text)
    ai_phrase_hits = sum(1 for phrase in AI_STYLE_PHRASES if phrase in normalized_text)
    sentence_length_stdev = statistics.pstdev(sentence_lengths) if len(sentence_lengths) > 1 else 0
    average_sentence_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0

    score = 0
    signals: list[str] = []

    # Rule-based scoring, based on vocabulary breadth, phrase usage, and sentence patterns.
    if unique_ratio < 0.48:
        score += 25
        signals.append("Low vocabulary diversity")
    if 4.5 <= avg_word_len <= 6.5:
        score += 15
        signals.append("Highly regular average word length")
    if transition_hits:
        score += min(25, transition_hits * 6)
        signals.append("Frequent formal transition words")
    if ai_phrase_hits:
        score += min(35, ai_phrase_hits * 10)
        signals.append("Common AI-style academic phrases")
    if len(sentence_lengths) >= 3 and sentence_length_stdev <= 4 and average_sentence_length >= 12:
        score += 15
        signals.append("Very uniform sentence lengths")
    if len(words) >= 80:
        score += min(20, (len(words) - 80) // 25)
        signals.append("Long polished passage structure")

    score = min(100, score)
    if score >= 75:
        label = "Likely AI-generated"
        confidence = "high"
    elif score >= 45:
        label = "Possibly AI-generated"
        confidence = "medium"
    else:
        label = "Unlikely AI-generated"
        confidence = "low"

    return AIContentAnalysis(score, label, confidence, signals)
