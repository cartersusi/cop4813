import type { QuizQuestion } from "../types/quiz";

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: "I read each e-mail before responding to any.",
    domain: "executing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 2,
    text: "I am the one others count on when something needs to be done.",
    domain: "executing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 3,
    text: "I enjoy motivating others to achieve their goals.",
    domain: "influencing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 4,
    text: "I am naturally drawn to leadership roles.",
    domain: "influencing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 5,
    text: "I find it easy to connect with people from different backgrounds.",
    domain: "relationship",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 6,
    text: "I genuinely care about the well-being of others.",
    domain: "relationship",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 7,
    text: "I enjoy analyzing complex problems and finding solutions.",
    domain: "strategic",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 8,
    text: "I often think about future possibilities and trends.",
    domain: "strategic",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 9,
    text: "I prefer to have a detailed plan before starting any project.",
    domain: "executing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: 10,
    text: "I am comfortable speaking in front of large groups.",
    domain: "influencing",
    options: [
      { id: "a", text: "Strongly Disagree", value: 1 },
      { id: "b", text: "Disagree", value: 2 },
      { id: "c", text: "Neutral", value: 3 },
      { id: "d", text: "Agree", value: 4 },
      { id: "e", text: "Strongly Agree", value: 5 },
    ],
  },
]
