from dataclasses import dataclass
from difflib import SequenceMatcher

from .similarity import analyze_similarity


# Represents a single benchmark evaluation case for plagiarism scoring.
@dataclass
class BenchmarkCase:
    name: str
    submitted_text: str
    source_text: str
    expected_plagiarized: bool


# Sample cases used to verify the plagiarism and similarity heuristics.
BENCHMARK_CASES = [
    BenchmarkCase(
        name="direct_copy",
        submitted_text=(
            "Academic integrity requires students to acknowledge ideas, words, "
            "and research that come from another author."
        ),
        source_text=(
            "Academic integrity requires students to acknowledge ideas, words, "
            "and research that come from another author."
        ),
        expected_plagiarized=True,
    ),
    BenchmarkCase(
        name="close_paraphrase",
        submitted_text=(
            "Students must credit another writer when they use that person's "
            "ideas, wording, or research in an assignment."
        ),
        source_text=(
            "Academic integrity requires students to acknowledge ideas, words, "
            "and research that come from another author."
        ),
        expected_plagiarized=True,
    ),
    BenchmarkCase(
        name="unrelated_topic",
        submitted_text=(
            "Photosynthesis converts sunlight into chemical energy inside plants "
            "through chlorophyll and cellular reactions."
        ),
        source_text=(
            "Academic integrity requires students to acknowledge ideas, words, "
            "and research that come from another author."
        ),
        expected_plagiarized=False,
    ),
    BenchmarkCase(
        name="ai_policy_overlap",
        submitted_text=(
            "Generative AI can help with planning and revision, but submitted "
            "coursework should show the student's own understanding."
        ),
        source_text=(
            "Generative AI tools can support brainstorming and revision, but "
            "students should disclose assistance when required and ensure the "
            "submitted work reflects their own understanding, evidence, and voice."
        ),
        expected_plagiarized=True,
    ),
]


def sequence_matcher_score(submitted_text: str, source_text: str) -> int:
    """Return a simple ratio score for direct text similarity."""
    return round(SequenceMatcher(None, submitted_text.lower(), source_text.lower()).ratio() * 100)


def compute_metrics(predictions: list[bool], expected: list[bool]) -> dict[str, float]:
    """Compute standard classification metrics for benchmark predictions."""
    true_positive = sum(pred and truth for pred, truth in zip(predictions, expected))
    false_positive = sum(pred and not truth for pred, truth in zip(predictions, expected))
    false_negative = sum(not pred and truth for pred, truth in zip(predictions, expected))
    true_negative = sum(not pred and not truth for pred, truth in zip(predictions, expected))

    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    accuracy = (true_positive + true_negative) / len(expected) if expected else 0.0

    return {
        "accuracy": round(accuracy, 3),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
    }


def evaluate_benchmark(threshold: int = 25) -> dict[str, object]:
    """Evaluate the benchmark cases and return summary metrics."""
    expected = [case.expected_plagiarized for case in BENCHMARK_CASES]
    tfidf_scores: list[int] = []
    baseline_scores: list[int] = []

    for case in BENCHMARK_CASES:
        tfidf_scores.append(analyze_similarity(case.submitted_text, case.source_text).percentage)
        baseline_scores.append(sequence_matcher_score(case.submitted_text, case.source_text))

    tfidf_predictions = [score >= threshold for score in tfidf_scores]
    baseline_predictions = [score >= threshold for score in baseline_scores]

    return {
        "threshold": threshold,
        "case_count": len(BENCHMARK_CASES),
        "cases": [
            {
                "name": case.name,
                "expected_plagiarized": case.expected_plagiarized,
                "tfidf_cosine_score": tfidf_score,
                "sequence_matcher_score": baseline_score,
            }
            for case, tfidf_score, baseline_score in zip(BENCHMARK_CASES, tfidf_scores, baseline_scores)
        ],
        "tfidf_cosine": compute_metrics(tfidf_predictions, expected),
        "sequence_matcher_baseline": compute_metrics(baseline_predictions, expected),
    }
