import type { ExperienceLevelValue } from "../../user/model/types";

export type ProposalForm = {
  price: string;
  comment: string;
  etaDays: string;
};

export type ProposalItem = {
  id: string;
  taskId: string;
  executorId: string;
  price: number;
  comment: string;
  etaDays: number;
  createdAt: string;
  updatedAt: string;
  executor: {
    id: string;
    username: string | null;
    displayName: string;
    profile: {
      about: string | null;
      skills: string[];
      portfolioLinks: string[];
      basePrice: number | null;
      experienceLevel: ExperienceLevelValue | null;
      avatarUrl: string | null;
      rating: number;
      completedTasksCount: number;
    } | null;
  } | null;
};

export type MyProposalItem = {
  id: string;
  taskId: string;
  executorId: string;
  price: number;
  comment: string;
  etaDays: number;
  createdAt: string;
  updatedAt: string;
  task: {
    id: string;
    title: string;
    status: "OPEN" | "IN_PROGRESS" | "ON_REVIEW" | "COMPLETED" | "CANCELED";
    deadlineAt: string | null;
    category: string;
    customer: {
      id: string;
      username: string | null;
      displayName: string;
    } | null;
  };
};
