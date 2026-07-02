import math
import re
from collections import Counter


# A small set of stop words removed from token streams for TF-IDF analysis.
STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "he", "in", "is", "it", "its", "of", "on", "or", "that", "the", "this",
    "to", "was", "were", "will", "with",
}


def normalize_text(text: str) -> str:
    """Collapse whitespace so sentence splitting works consistently."""
    return re.sub(r"\s+", " ", text.strip())


def split_sentences(text: str) -> list[str]:
    """Split text into sentence-like segments using punctuation delimiters."""
    normalized = normalize_text(text)
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", normalized)
        if sentence.strip()
    ]


def tokenize(text: str, *, remove_stop_words: bool = True) -> list[str]:
    """Extract normalized word tokens, optionally filtering common stop words."""
    words = re.findall(r"\b[a-zA-Z0-9']+\b", text.lower())
    if not remove_stop_words:
        return words
    return [word for word in words if word not in STOP_WORDS]


def term_frequency(tokens: list[str]) -> Counter[str]:
    """Count token frequency in a single document."""
    return Counter(tokens)


def inverse_document_frequency(documents: list[list[str]]) -> dict[str, float]:
    """Compute IDF weights across a collection of tokenized documents."""
    total_docs = len(documents)
    document_counts: Counter[str] = Counter()
    for tokens in documents:
        document_counts.update(set(tokens))

    return {
        token: math.log((1 + total_docs) / (1 + count)) + 1
        for token, count in document_counts.items()
    }
