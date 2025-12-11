// On-device Naive Bayes Classifier for SMS categorization
// Implements online learning with persistent model storage

import { db } from '../db';
import { keywordMap, categories, getTrainingData } from './keyword-map';

interface CategoryWeights {
  [category: string]: number;
}
interface WordCounts {
  [word: string]: CategoryWeights;
}

interface ClassifierModel {
  wordCounts: WordCounts;
  categoryCounts: CategoryWeights;
  totalDocuments: number;
  vocabulary: Set<string>;
  version: number;
  lastUpdated: string;
}

interface PredictionResult {
  category: string;
  confidence: number;
  allProbabilities: CategoryWeights;
}

// Preprocess text for classification
function preprocess(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
}

// Laplace smoothing parameter
const SMOOTHING = 1;

class NaiveBayesClassifier {
  private model: ClassifierModel;
  private modelKey = 'sms_classifier_model';
  private isInitialized = false;

  constructor() {
    this.model = this.createEmptyModel();
  }

  private createEmptyModel(): ClassifierModel {
    return {
      wordCounts: {},
      categoryCounts: {},
      totalDocuments: 0,
      vocabulary: new Set(),
      version: 1,
      lastUpdated: new Date().toISOString()
    };
  }

  // Initialize classifier - load from storage or train from scratch
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to load existing model from IndexedDB
      const savedModel = await this.loadModel();
      
      if (savedModel && savedModel.totalDocuments > 0) {
        this.model = {
          ...savedModel,
          vocabulary: new Set(Object.keys(savedModel.wordCounts))
        };
        console.log(`[Classifier] Loaded model with ${this.model.totalDocuments} documents`);
      } else {
        // Train from keyword map
        await this.trainFromKeywordMap();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('[Classifier] Initialization error:', error);
      await this.trainFromKeywordMap();
      this.isInitialized = true;
    }
  }

  // Train initial model from keyword map
  private async trainFromKeywordMap(): Promise<void> {
    console.log('[Classifier] Training from keyword map...');
    
    this.model = this.createEmptyModel();
    const trainingData = getTrainingData();
    
    for (const { text, category } of trainingData) {
      this.addDocument(text, category);
    }
    
    await this.saveModel();
    console.log(`[Classifier] Trained with ${this.model.totalDocuments} documents`);
  }

  // Add a single document to the model (used for training)
  private addDocument(text: string, category: string): void {
    const words = preprocess(text);
    
    // Update category count
    this.model.categoryCounts[category] = (this.model.categoryCounts[category] || 0) + 1;
    this.model.totalDocuments++;
    
    // Update word counts
    for (const word of words) {
      this.model.vocabulary.add(word);
      
      if (!this.model.wordCounts[word]) {
        this.model.wordCounts[word] = {};
      }
      
      this.model.wordCounts[word][category] = (this.model.wordCounts[word][category] || 0) + 1;
    }
  }

  // Predict category for given text
  predictCategory(text: string): PredictionResult {
    if (!this.isInitialized) {
      console.warn('[Classifier] Not initialized, using keyword fallback');
      return this.keywordFallback(text);
    }

    const words = preprocess(text);
    const scores: CategoryWeights = {};
    
    const vocabSize = this.model.vocabulary.size;
    
    // Calculate log probability for each category
    for (const category of categories) {
      const categoryCount = this.model.categoryCounts[category] || 0;
      
      // Prior probability (with smoothing)
      let logProb = Math.log((categoryCount + SMOOTHING) / (this.model.totalDocuments + SMOOTHING * categories.length));
      
      // Get total words in this category
      let totalWordsInCategory = 0;
      for (const word of Object.keys(this.model.wordCounts)) {
        totalWordsInCategory += this.model.wordCounts[word][category] || 0;
      }
      
      // Likelihood for each word
      for (const word of words) {
        const wordCountInCategory = this.model.wordCounts[word]?.[category] || 0;
        logProb += Math.log((wordCountInCategory + SMOOTHING) / (totalWordsInCategory + SMOOTHING * vocabSize));
      }
      
      scores[category] = logProb;
    }
    
    // Convert log probabilities to normalized probabilities
    const maxScore = Math.max(...Object.values(scores));
    const expScores: CategoryWeights = {};
    let sumExp = 0;
    
    for (const [category, score] of Object.entries(scores)) {
      expScores[category] = Math.exp(score - maxScore);
      sumExp += expScores[category];
    }
    
    const probabilities: CategoryWeights = {};
    for (const [category, expScore] of Object.entries(expScores)) {
      probabilities[category] = expScore / sumExp;
    }
    
    // Find best category
    let bestCategory = 'General Expense';
    let bestProbability = 0;
    
    for (const [category, probability] of Object.entries(probabilities)) {
      if (probability > bestProbability) {
        bestProbability = probability;
        bestCategory = category;
      }
    }
    
    // If confidence is too low, try keyword fallback
    if (bestProbability < 0.15) {
      const fallback = this.keywordFallback(text);
      if (fallback.confidence > bestProbability) {
        return fallback;
      }
    }
    
    return {
      category: bestCategory,
      confidence: Math.round(bestProbability * 100) / 100,
      allProbabilities: probabilities
    };
  }

  // Fallback to keyword matching
  private keywordFallback(text: string): PredictionResult {
    const upperText = text.toUpperCase();
    
    for (const [keyword, category] of Object.entries(keywordMap)) {
      if (upperText.includes(keyword.toUpperCase())) {
        return {
          category,
          confidence: 0.85,
          allProbabilities: { [category]: 0.85 }
        };
      }
    }
    
    return {
      category: 'General Expense',
      confidence: 0.1,
      allProbabilities: { 'General Expense': 0.1 }
    };
  }

  // Online learning: update model with user correction
  async updateModel(text: string, correctedCategory: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`[Classifier] Learning: "${text.substring(0, 50)}..." → ${correctedCategory}`);
    
    // Add the correction as a new training example (with extra weight)
    for (let i = 0; i < 3; i++) {
      this.addDocument(text, correctedCategory);
    }
    
    // Also add variations
    const words = preprocess(text);
    if (words.length > 0) {
      this.addDocument(words.join(' '), correctedCategory);
    }
    
    this.model.lastUpdated = new Date().toISOString();
    this.model.version++;
    
    await this.saveModel();
    
    // Also save to category mappings table for future reference
    try {
      await db.categoryMappings.add({
        merchant: text.substring(0, 100).toLowerCase(),
        category: correctedCategory,
        confidence: 1.0,
        timesUsed: 1,
        lastUsed: new Date()
      });
    } catch (error) {
      console.error('[Classifier] Failed to save mapping:', error);
    }
  }

  // Save model to IndexedDB
  private async saveModel(): Promise<void> {
    try {
      const modelData = {
        wordCounts: this.model.wordCounts,
        categoryCounts: this.model.categoryCounts,
        totalDocuments: this.model.totalDocuments,
        version: this.model.version,
        lastUpdated: this.model.lastUpdated
      };
      
      localStorage.setItem(this.modelKey, JSON.stringify(modelData));
      console.log('[Classifier] Model saved');
    } catch (error) {
      console.error('[Classifier] Failed to save model:', error);
    }
  }

  // Load model from IndexedDB
  private async loadModel(): Promise<ClassifierModel | null> {
    try {
      const saved = localStorage.getItem(this.modelKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Classifier] Failed to load model:', error);
    }
    return null;
  }

  // Get model statistics
  getStats(): { documents: number; vocabulary: number; version: number; lastUpdated: string } {
    return {
      documents: this.model.totalDocuments,
      vocabulary: this.model.vocabulary.size,
      version: this.model.version,
      lastUpdated: this.model.lastUpdated
    };
  }

  // Reset model and retrain from scratch
  async reset(): Promise<void> {
    localStorage.removeItem(this.modelKey);
    this.model = this.createEmptyModel();
    this.isInitialized = false;
    await this.initialize();
  }
}

// Singleton instance
export const classifier = new NaiveBayesClassifier();

// Convenience functions
export async function predictCategory(text: string): Promise<PredictionResult> {
  await classifier.initialize();
  return classifier.predictCategory(text);
}

export async function updateModel(text: string, correctedCategory: string): Promise<void> {
  await classifier.updateModel(text, correctedCategory);
}

export async function getClassifierStats() {
  await classifier.initialize();
  return classifier.getStats();
}

export { categories };
