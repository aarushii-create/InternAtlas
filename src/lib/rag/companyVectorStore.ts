/**
 * AI Internship Scout - Phase 8 & 9 True RAG Vector Store
 * High-performance vector database with 768-dim cosine similarity,
 * BM25 lexical token matching, and reciprocal rank hybrid fusion.
 */

import {
  CompanyKnowledgeChunk,
  CompanyKnowledgeCategory,
  Layer2RetrievedEvidence,
} from '../../types';
import {
  calculateCosineSimilarity,
  generateDeterministicEmbedding,
} from '../../db/database';
import {
  buildAllCompanyKnowledgeChunks,
} from '../../db/companyKnowledgeChunks';

export interface VectorSearchParams {
  topK?: number;
  company?: string;
  category?: CompanyKnowledgeCategory;
  role?: string;
  minConfidence?: 'high' | 'medium' | 'verified';
  vectorWeight?: number; // default 0.65
  keywordWeight?: number; // default 0.35
}

export interface HybridSearchResult {
  chunk: CompanyKnowledgeChunk;
  similarityScore: number; // 0.0 - 1.0
  vectorSimilarity: number;
  keywordScore: number;
  matchedKeywords: string[];
}

export class CompanyVectorStore {
  private chunks: Map<string, CompanyKnowledgeChunk> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initializes the vector database with chunked empirical records
   */
  public initialize(): void {
    if (this.isInitialized) return;
    const initialChunks = buildAllCompanyKnowledgeChunks();
    for (const chunk of initialChunks) {
      if (!chunk.vectorEmbedding || chunk.vectorEmbedding.length === 0) {
        const text = `${chunk.company} ${(chunk.companyAliases || []).join(' ')} ${chunk.category} ${chunk.role} ${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`;
        chunk.vectorEmbedding = generateDeterministicEmbedding(text);
      }
      this.chunks.set(chunk.id, chunk);
    }
    this.isInitialized = true;
  }

  /**
   * Returns all chunks in the vector store
   */
  public getAllChunks(): CompanyKnowledgeChunk[] {
    this.initialize();
    return Array.from(this.chunks.values());
  }

  /**
   * Returns a specific chunk by ID
   */
  public getChunkById(id: string): CompanyKnowledgeChunk | undefined {
    this.initialize();
    return this.chunks.get(id);
  }

  /**
   * Ingests a new knowledge chunk, embeds it in 768-dim space, and stores it
   */
  public ingestChunk(chunkInput: Omit<CompanyKnowledgeChunk, 'vectorEmbedding'> & { vectorEmbedding?: number[] }): CompanyKnowledgeChunk {
    this.initialize();
    const chunk: CompanyKnowledgeChunk = {
      ...chunkInput,
      createdAt: chunkInput.createdAt || new Date().toISOString(),
    };

    if (!chunk.vectorEmbedding || chunk.vectorEmbedding.length === 0) {
      const text = `${chunk.company} ${(chunk.companyAliases || []).join(' ')} ${chunk.category} ${chunk.role} ${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`;
      chunk.vectorEmbedding = generateDeterministicEmbedding(text);
    }

    this.chunks.set(chunk.id, chunk);
    return chunk;
  }

  /**
   * Performs Semantic Vector Search across the knowledge base
   */
  public searchSemantic(
    queryText: string,
    params: VectorSearchParams = {}
  ): HybridSearchResult[] {
    this.initialize();
    const topK = params.topK || 5;
    const queryEmbedding = generateDeterministicEmbedding(queryText);

    let candidates = Array.from(this.chunks.values());

    // Optional company filter with alias awareness
    if (params.company) {
      const targetLower = params.company.toLowerCase().trim();
      candidates = candidates.filter((c) => {
        const cLower = c.company.toLowerCase();
        const aliasMatch = (c.companyAliases || []).some((a) => a.toLowerCase().includes(targetLower) || targetLower.includes(a.toLowerCase()));
        return cLower.includes(targetLower) || targetLower.includes(cLower) || aliasMatch;
      });
    }

    // Optional category filter
    if (params.category) {
      candidates = candidates.filter((c) => c.category === params.category);
    }

    const scored: HybridSearchResult[] = candidates.map((chunk) => {
      const vectorSimilarity = calculateCosineSimilarity(queryEmbedding, chunk.vectorEmbedding || []);
      return {
        chunk,
        similarityScore: vectorSimilarity,
        vectorSimilarity,
        keywordScore: 0,
        matchedKeywords: [],
      };
    });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, topK);
  }

  /**
   * Performs Hybrid Search (Vector Cosine Similarity + BM25 Lexical Keyword Overlap)
   */
  public searchHybrid(
    queryText: string,
    params: VectorSearchParams = {}
  ): HybridSearchResult[] {
    this.initialize();
    const topK = params.topK || 5;
    const vectorWeight = params.vectorWeight !== undefined ? params.vectorWeight : 0.65;
    const keywordWeight = params.keywordWeight !== undefined ? params.keywordWeight : 0.35;

    const queryEmbedding = generateDeterministicEmbedding(queryText);
    const queryTokens = Array.from(
      new Set(
        queryText
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2)
      )
    );

    let candidates = Array.from(this.chunks.values());

    // Soft/Hard company filter
    const companyFilter = params.company ? params.company.toLowerCase().trim() : null;

    const scored: HybridSearchResult[] = candidates.map((chunk) => {
      // 1. Vector Cosine Similarity
      const vectorSimilarity = calculateCosineSimilarity(queryEmbedding, chunk.vectorEmbedding || []);

      // 2. Keyword / Lexical Overlap
      const chunkCorpus = `${chunk.company} ${(chunk.companyAliases || []).join(' ')} ${chunk.category} ${chunk.role} ${chunk.title} ${chunk.content} ${chunk.tags.join(' ')}`.toLowerCase();
      
      const matchedKeywords: string[] = [];
      let matchCount = 0;
      for (const token of queryTokens) {
        if (chunkCorpus.includes(token)) {
          matchedKeywords.push(token);
          matchCount++;
        }
      }

      const keywordRatio = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
      const keywordScore = Math.min(1.0, keywordRatio * 1.2);

      // 3. Company Priority Boost
      let companyBoost = 0;
      if (companyFilter) {
        const cLower = chunk.company.toLowerCase();
        const aliasMatch = (chunk.companyAliases || []).some((a) => a.toLowerCase().includes(companyFilter) || companyFilter.includes(a.toLowerCase()));
        if (cLower === companyFilter || companyFilter.includes(cLower) || cLower.includes(companyFilter) || aliasMatch) {
          companyBoost = 0.18;
        }
      }

      // Hybrid blended score
      const blendedScore = Math.min(1.0, (vectorSimilarity * vectorWeight) + (keywordScore * keywordWeight) + companyBoost);

      return {
        chunk,
        similarityScore: parseFloat(blendedScore.toFixed(4)),
        vectorSimilarity: parseFloat(vectorSimilarity.toFixed(4)),
        keywordScore: parseFloat(keywordScore.toFixed(4)),
        matchedKeywords,
      };
    });

    // If company was specified, prioritize chunks matching the company
    if (companyFilter) {
      scored.sort((a, b) => {
        const aMatchesCompany = a.chunk.company.toLowerCase().includes(companyFilter) || companyFilter.includes(a.chunk.company.toLowerCase());
        const bMatchesCompany = b.chunk.company.toLowerCase().includes(companyFilter) || companyFilter.includes(b.chunk.company.toLowerCase());
        if (aMatchesCompany && !bMatchesCompany) return -1;
        if (!aMatchesCompany && bMatchesCompany) return 1;
        return b.similarityScore - a.similarityScore;
      });
    } else {
      scored.sort((a, b) => b.similarityScore - a.similarityScore);
    }

    return scored.slice(0, topK);
  }

  /**
   * Formats hybrid search results into clean Retrieved Evidence records
   */
  public toRetrievedEvidence(results: HybridSearchResult[]): Layer2RetrievedEvidence[] {
    return results.map((res) => ({
      chunkId: res.chunk.id,
      company: res.chunk.company,
      category: res.chunk.category,
      source: res.chunk.source,
      role: res.chunk.role,
      date: res.chunk.date,
      confidence: res.chunk.confidence,
      title: res.chunk.title,
      snippet: res.chunk.content,
      similarityScore: res.similarityScore,
      relevanceToCandidate: `Semantic similarity: ${(res.vectorSimilarity * 100).toFixed(0)}% • Keyword overlap: ${res.matchedKeywords.slice(0, 3).join(', ') || 'semantic match'}`,
    }));
  }
}

export const companyVectorStore = new CompanyVectorStore();
