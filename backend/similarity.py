import math
from dataclasses import dataclass
from difflib import SequenceMatcher
from .preprocessing import inverse_document_frequency, split_sentences, term_frequency, tokenize

@dataclass
class SentenceMatch:
    submitted_sentence: str
    source_sentence: str
    similarity: float

@dataclass
class SimilarityResult:
    percentage: int
    matched_sentences: list[str]
    sentence_matches: list[SentenceMatch]
    document_similarity: float

def cosine_similarity(a, b):
    common = set(a) & set(b)
    if not common: return 0.0
    dot = sum(a[t]*b[t] for t in common)
    ma = math.sqrt(sum(v*v for v in a.values()))
    mb = math.sqrt(sum(v*v for v in b.values()))
    return dot/(ma*mb) if ma and mb else 0.0

def _build_tfidf_vector(tokens, idf):
    counts = term_frequency(tokens)
    total = max(1, len(tokens))
    return {t: (c/total)*idf.get(t,1.0) for t,c in counts.items()}

def tfidf_vectors(documents):
    tokenized = [tokenize(d) for d in documents]
    idf = inverse_document_frequency(tokenized)
    return [_build_tfidf_vector(t, idf) for t in tokenized]

def analyze_similarity(text, source_text, *, threshold=0.30):
    submitted = split_sentences(text)
    sources   = split_sentences(source_text)
    if not submitted or not sources:
        return SimilarityResult(0, [], [], 0.0)
    doc_vecs = tfidf_vectors([text, source_text])
    doc_sim  = cosine_similarity(doc_vecs[0], doc_vecs[1])
    all_tok  = [tokenize(s) for s in submitted+sources]
    idf      = inverse_document_frequency(all_tok)
    sub_vecs = [_build_tfidf_vector(tokenize(s), idf) for s in submitted]
    src_vecs = [_build_tfidf_vector(tokenize(s), idf) for s in sources]
    matches, scores = [], []
    for sub_s, sv in zip(submitted, sub_vecs):
        best, best_src = 0.0, ""
        for src_s, rv in zip(sources, src_vecs):
            sc = cosine_similarity(sv, rv)
            if sc > best:
                best, best_src = sc, src_s
                if best >= 0.85: break
        if best_src:
            lex = SequenceMatcher(None, sub_s.lower(), best_src.lower()).ratio()*0.75
            best = max(best, lex)
        scores.append(best)
        if best >= threshold:
            matches.append(SentenceMatch(sub_s, best_src, best))
    avg = sum(scores)/max(1,len(scores))
    pct = min(100, round((doc_sim*0.4 + avg*0.6)*100))
    return SimilarityResult(pct, [m.submitted_sentence for m in matches[:5]], matches[:10], doc_sim)