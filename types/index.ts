export interface ZipData {
  zip: string;
  lifeExpectancy: number;
  pctUninsured: number;
  medianIncome: number;
  pctSmoking: number;
  pctObesity: number;
  pctInactive: number;
  sviScore: number;
  foodDesertPop: number;
  pctParkArea: number;
}

export interface CitizenReport {
  id?: string;
  zip: string;
  category: "food" | "safety" | "healthcare" | "environment" | "housing" | "other";
  description: string;
  submittedAt: string;
  status: "pending" | "reviewed" | "actioned";
  submittedBy?: string;
}

export interface RoiResult {
  zip: string;
  currentLifeExpectancy: number;
  predictedGain: number;
  projectedLifeExpectancy: number;
  topIntervention: string;
  budgetAllocation: Record<string, number>;
}

export interface PlannerProject {
  id?: string;
  title: string;
  zip: string;
  budget: number;
  interventions: string[];
  status: "draft" | "published" | "completed";
  createdAt: string;
  publishedAt?: string;
}
