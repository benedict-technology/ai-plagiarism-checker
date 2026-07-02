import os, re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import urlparse
import httpx
from sqlalchemy.orm import Session
from .models import SourceDocument
from .preprocessing import split_sentences
from .similarity import SimilarityResult, analyze_similarity

DEFAULT_LOCAL_SOURCES = [
    {"title":"Academic Integrity Policy Sample","source_type":"local","url":None,
     "content":"Academic integrity requires students to acknowledge ideas, words, and research that come from another author. Plagiarism includes copying text without citation, submitting purchased work, and closely paraphrasing a source without proper acknowledgement."},
    {"title":"Responsible AI Writing Guidance","source_type":"local","url":None,
     "content":"Generative AI tools can support brainstorming and revision, but students should disclose assistance when required and ensure the submitted work reflects their own understanding, evidence, and voice."},
]

@dataclass
class SourceCandidate:
    title: str; source_type: str; content: str; url: str|None=None

@dataclass
class SourceTrace:
    title: str; source_type: str; url: str|None
    similarity_percentage: int; matched_sentences: list[str]
    sentence_matches: list[dict]

class ReadableTextParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.title=""; self._in_title=False; self._skip=0; self._chunks=[]
    def handle_starttag(self,tag,attrs):
        if tag in{"script","style","noscript","svg","head"} and tag!="title": self._skip+=1
        if tag=="title": self._in_title=True
        if tag in{"p","div","section","article","li","br","h1","h2","h3"}: self._chunks.append(" ")
    def handle_endtag(self,tag):
        if tag in{"script","style","noscript","svg","head"} and self._skip: self._skip-=1
        if tag=="title": self._in_title=False
    def handle_data(self,data):
        d=data.strip()
        if not d: return
        if self._in_title: self.title=d; return
        if not self._skip: self._chunks.append(d)
    @property
    def text(self): return re.sub(r"\s+"," "," ".join(self._chunks)).strip()

def seed_default_sources(db):
    if db.query(SourceDocument).count(): return
    for s in DEFAULT_LOCAL_SOURCES: db.add(SourceDocument(**s))
    db.commit()

def local_source_candidates(db):
    return [SourceCandidate(title=d.title,source_type=d.source_type,url=d.url,content=d.content)
            for d in db.query(SourceDocument).all()]

def env_int(name,default,*,minimum=1,maximum=20):
    try: return max(minimum,min(maximum,int(os.getenv(name,str(default)))))
    except: return default

def normalize_url(url):
    p=urlparse(url.strip())
    return p._replace(fragment="").geturl() if p.scheme in{"http","https"} and p.netloc else ""

_STOP={"a","an","the","and","or","but","in","on","at","to","for","of","with","by","from","is","are",
       "was","were","be","been","being","have","has","had","do","does","did","will","would","could",
       "should","may","might","shall","can","it","its","this","that","these","those","they","them",
       "their","we","our","us","i","my","me","you","your","he","she","his","her","also","as","such",
       "so","if","then","than","not","no","nor","both"}

def extract_keywords(text,n=8):
    words=[w for w in re.findall(r"\b[a-zA-Z]{4,}\b",text.lower()) if w not in _STOP]
    if not words: return []
    c=Counter(words); return sorted(c,key=lambda w:c[w],reverse=True)[:n]

def build_search_queries(text):
    sents=[s.strip() for s in split_sentences(text) if len(s.split())>=8]
    max_q=env_int("ONLINE_SEARCH_MAX_QUERIES",3,minimum=1,maximum=6)
    queries,seen=[],set()
    for s in sorted(sents,key=len,reverse=True):
        kw=extract_keywords(s,7)
        if len(kw)>=3:
            q=" ".join(kw)
            if q not in seen: queries.append(q); seen.add(q)
        if len(queries)>=max_q-1: break
    broad=" ".join(extract_keywords(text,8)[:6])
    if broad and broad not in seen: queries.append(broad)
    return queries[:max_q]

def serpapi_search(client,query,n):
    key=os.getenv("SERPAPI_API_KEY","").strip()
    if not key: return []
    r=client.get("https://serpapi.com/search.json",params={"engine":"google","q":query,"api_key":key,"num":n})
    r.raise_for_status()
    return [{"url":str(i.get("link","")),"title":str(i.get("title","")),"snippet":str(i.get("snippet",""))}
            for i in r.json().get("organic_results",[]) if i.get("link")]

def bing_search(client,query,n):
    key=os.getenv("BING_SEARCH_API_KEY","").strip()
    if not key: return []
    r=client.get("https://api.bing.microsoft.com/v7.0/search",
        params={"q":query,"count":n,"textDecorations":False},
        headers={"Ocp-Apim-Subscription-Key":key})
    r.raise_for_status()
    return [{"url":str(i.get("url","")),"title":str(i.get("name","")),"snippet":str(i.get("snippet",""))}
            for i in r.json().get("webPages",{}).get("value",[]) if i.get("url")]

def online_search_results(text):
    max_per_q=env_int("ONLINE_SEARCH_RESULTS_PER_QUERY",4,minimum=1,maximum=8)
    queries=build_search_queries(text)
    providers=[]
    if os.getenv("SERPAPI_API_KEY","").strip(): providers.append(serpapi_search)
    if os.getenv("BING_SEARCH_API_KEY","").strip(): providers.append(bing_search)
    if not providers: return []
    all_results,seen=[],set()
    with httpx.Client(timeout=6.0,follow_redirects=True) as client:
        for q in queries:
            for fn in providers:
                try:
                    results=fn(client,q,max_per_q)
                    if results:
                        for r in results:
                            url=normalize_url(r.get("url",""))
                            if url and url not in seen: seen.add(url); r["url"]=url; all_results.append(r)
                        break
                except httpx.HTTPError: continue
    return all_results

def _fetch_one(result,source_type,max_chars):
    url=result.get("url",""); snippet=result.get("snippet",""); title=result.get("title","") or url
    if not url: return None
    page_text,page_title="",title
    try:
        with httpx.Client(timeout=6.0,follow_redirects=True,headers={"User-Agent":"AI-Plagiarism-Checker/1.0"}) as c:
            resp=c.get(url); resp.raise_for_status()
            p=ReadableTextParser(); p.feed(resp.text)
            page_text=p.text
            if p.title: page_title=p.title
    except: pass
    content=page_text.strip() if len(page_text.strip())>=100 else snippet
    if not content: return None
    return SourceCandidate(title=page_title or title,source_type=source_type,url=url,content=content[:max_chars])

def fetch_url_candidates(search_results,*,source_type):
    if not search_results: return []
    max_urls=env_int("ONLINE_SEARCH_MAX_URLS",6,minimum=1,maximum=15)
    max_chars=env_int("ONLINE_SOURCE_MAX_PAGE_CHARS",10000,minimum=2000,maximum=50000)
    candidates=[]
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures={pool.submit(_fetch_one,r,source_type,max_chars):r for r in search_results[:max_urls]}
        for f in as_completed(futures):
            try:
                c=f.result()
                if c: candidates.append(c)
            except: pass
    return candidates

def configured_web_source_candidates():
    urls=[u.strip() for u in os.getenv("ETHICAL_SOURCE_URLS","").split(",") if u.strip()]
    if not urls: return []
    return fetch_url_candidates([{"url":u,"title":"","snippet":""} for u in urls],source_type="ethical_web")

def online_search_source_candidates(text):
    return fetch_url_candidates(online_search_results(text),source_type="online_search")

def trace_sources(text,db,*,reference_text=None):
    candidates=[]
    if reference_text and reference_text.strip():
        candidates.append(SourceCandidate(title="User supplied reference",source_type="manual_reference",url=None,content=reference_text))
    candidates.extend(local_source_candidates(db))
    candidates.extend(configured_web_source_candidates())
    candidates.extend(online_search_source_candidates(text))
    traces=[]
    for c in candidates:
        r=analyze_similarity(text,c.content)
        if r.percentage==0 and not r.matched_sentences: continue
        traces.append(SourceTrace(title=c.title,source_type=c.source_type,url=c.url,
            similarity_percentage=r.percentage,matched_sentences=r.matched_sentences,
            sentence_matches=[{"submitted_sentence":m.submitted_sentence,"source_sentence":m.source_sentence,
                               "similarity_percentage":round(m.similarity*100)} for m in r.sentence_matches]))
    traces.sort(key=lambda t:t.similarity_percentage,reverse=True)
    best=traces[0].similarity_percentage if traces else 0
    matched=[]
    for t in traces:
        for s in t.matched_sentences:
            if s not in matched: matched.append(s)
    return best,matched[:5],traces[:5]